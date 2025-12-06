import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { clientId, clientName, startDate, endDate } = await req.json();

    if (!clientId) {
      return new Response(JSON.stringify({ error: 'clientId é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Iniciando análise IA para cliente ${clientId} (${clientName})`);

    // Fetch stored Reportei metrics from database
    let reporteiData = null;
    
    try {
      console.log('Buscando métricas armazenadas do Reportei...');
      
      const periodStart = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const periodEnd = endDate || new Date().toISOString().split('T')[0];
      
      // Get stored metrics from database
      const { data: metrics, error: metricsError } = await supabaseAdmin
        .from('reportei_metrics')
        .select(`
          *,
          reportei_integrations!inner(
            channel_type,
            channel_name,
            reportei_clients!inner(
              client_id,
              reportei_client_name
            )
          )
        `)
        .eq('reportei_integrations.reportei_clients.client_id', clientId)
        .gte('period_start', periodStart)
        .lte('period_end', periodEnd)
        .order('created_at', { ascending: false });

      if (!metricsError && metrics && metrics.length > 0) {
        // Organize metrics by channel
        const metricsByChannel: Record<string, any[]> = {};
        
        for (const metric of metrics) {
          const channel = metric.reportei_integrations?.channel_type || 'unknown';
          if (!metricsByChannel[channel]) {
            metricsByChannel[channel] = [];
          }
          metricsByChannel[channel].push({
            name: metric.widget_name,
            type: metric.metric_type,
            value: metric.metric_value ?? metric.metric_value_text,
            period: `${metric.period_start} a ${metric.period_end}`,
          });
        }

        reporteiData = {
          channels: metricsByChannel,
          totalMetrics: metrics.length,
          period: { start: periodStart, end: periodEnd },
        };
        
        console.log(`Reportei: ${metrics.length} métricas encontradas em ${Object.keys(metricsByChannel).length} canais`);
      } else {
        console.log('Nenhuma métrica Reportei armazenada encontrada para este cliente');
      }
    } catch (reporteiError) {
      console.error('Erro ao buscar métricas do Reportei:', reporteiError);
    }

    // Fetch Pipedrive data
    let pipedriveData = null;
    
    try {
      console.log('Buscando dados do Pipedrive...');
      
      // Check for client-specific CRM integration
      const { data: crmIntegration } = await supabaseAdmin
        .from('crm_integrations')
        .select('*')
        .eq('client_id', clientId)
        .eq('crm_type', 'pipedrive')
        .eq('is_active', true)
        .single();
      
      if (crmIntegration) {
        const pipedriveApiKey = crmIntegration.api_key_encrypted;
        const pipedriveDomain = crmIntegration.domain || 'api';
        
        // Get deals
        const dealsResponse = await fetch(
          `https://${pipedriveDomain}.pipedrive.com/api/v1/deals?api_token=${pipedriveApiKey}&status=all_not_deleted&limit=100`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        if (dealsResponse.ok) {
          const dealsData = await dealsResponse.json();
          console.log(`Pipedrive: ${dealsData.data?.length || 0} deals encontrados`);
          
          // Calculate pipeline stats
          const deals = dealsData.data || [];
          const openDeals = deals.filter((d: any) => d.status === 'open');
          const wonDeals = deals.filter((d: any) => d.status === 'won');
          const lostDeals = deals.filter((d: any) => d.status === 'lost');
          
          pipedriveData = {
            totalDeals: deals.length,
            openDeals: openDeals.length,
            wonDeals: wonDeals.length,
            lostDeals: lostDeals.length,
            pipelineValue: openDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0),
            wonValue: wonDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0),
            conversionRate: deals.length > 0 ? ((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100).toFixed(1) : 0,
          };
        }
      }
    } catch (pipedriveError) {
      console.error('Erro ao buscar dados do Pipedrive:', pipedriveError);
    }

    // Build context for AI
    let dataContext = `## Dados disponíveis para análise do cliente ${clientName || clientId}\n\n`;
    
    if (reporteiData && reporteiData.totalMetrics > 0) {
      dataContext += `### Métricas de Marketing Digital (Reportei)\n`;
      dataContext += `Período analisado: ${reporteiData.period.start} a ${reporteiData.period.end}\n\n`;
      
      for (const [channel, metrics] of Object.entries(reporteiData.channels)) {
        dataContext += `#### ${channel.toUpperCase()}\n`;
        for (const metric of (metrics as any[])) {
          dataContext += `- ${metric.name}: ${metric.value}\n`;
        }
        dataContext += '\n';
      }
    } else {
      dataContext += `### Marketing Digital\nNenhuma métrica do Reportei armazenada para este cliente. Configure o vínculo com Reportei e sincronize os dados.\n\n`;
    }
    
    if (pipedriveData) {
      dataContext += `### Métricas de Vendas (Pipedrive)\n`;
      dataContext += `- Total de Negócios: ${pipedriveData.totalDeals}\n`;
      dataContext += `- Negócios em Aberto: ${pipedriveData.openDeals}\n`;
      dataContext += `- Negócios Ganhos: ${pipedriveData.wonDeals}\n`;
      dataContext += `- Negócios Perdidos: ${pipedriveData.lostDeals}\n`;
      dataContext += `- Valor no Pipeline: R$ ${pipedriveData.pipelineValue?.toLocaleString('pt-BR')}\n`;
      dataContext += `- Valor Ganho: R$ ${pipedriveData.wonValue?.toLocaleString('pt-BR')}\n`;
      dataContext += `- Taxa de Conversão: ${pipedriveData.conversionRate}%\n\n`;
    } else {
      dataContext += `### Vendas\nDados do Pipedrive não disponíveis ou não configurados para este cliente.\n\n`;
    }

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Você é um analista de marketing digital especialista da agência Vivaz. Sua tarefa é analisar dados de performance de clientes e gerar insights acionáveis em português brasileiro.

Diretrizes:
1. Seja direto e objetivo nas análises
2. Destaque pontos positivos e negativos claramente
3. Forneça recomendações práticas e acionáveis
4. Use emojis para facilitar a leitura (✅ ⚠️ 📈 📉 💡)
5. Estruture a resposta em seções claras
6. Se não houver dados suficientes, sugira quais integrações configurar

Formato de resposta:
## 📊 Resumo Executivo
[2-3 frases sobre o estado geral]

## ✅ Pontos Positivos
[Lista de aspectos que estão funcionando bem]

## ⚠️ Pontos de Atenção
[Lista de aspectos que precisam de melhoria]

## 💡 Recomendações
[Lista de ações sugeridas com prioridade]

## 📈 Próximos Passos
[3-5 ações específicas para os próximos 30 dias]`;

    const userPrompt = `Analise os seguintes dados do cliente e gere um relatório de insights:\n\n${dataContext}`;

    console.log('Enviando dados para análise IA...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro na API de IA:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA insuficientes.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Erro ao gerar análise' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices?.[0]?.message?.content || 'Não foi possível gerar a análise.';

    console.log('Análise IA gerada com sucesso');

    return new Response(JSON.stringify({ 
      analysis,
      dataAvailable: {
        reportei: !!reporteiData,
        pipedrive: !!pipedriveData,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na função ai-dashboard-analysis:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
