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

    // Fetch Reportei data
    let reporteiData = null;
    const reporteiApiKey = Deno.env.get('REPORTEI_API_KEY');
    
    if (reporteiApiKey) {
      try {
        console.log('Buscando dados do Reportei...');
        
        // Get Reportei clients
        const clientsResponse = await fetch('https://app.reportei.com/api/v1/clients', {
          headers: {
            'Authorization': `Bearer ${reporteiApiKey}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json();
          console.log(`Reportei: ${clientsData.data?.length || 0} clientes encontrados`);
          
          // Find matching client by name (partial match)
          const matchingClient = clientsData.data?.find((c: any) => 
            clientName && c.name?.toLowerCase().includes(clientName.toLowerCase().split(' ')[0])
          );
          
          if (matchingClient) {
            console.log(`Cliente Reportei encontrado: ${matchingClient.name}`);
            
            // Get integrations for this client
            const integrationsResponse = await fetch(
              `https://app.reportei.com/api/v1/clients/${matchingClient.id}/integrations`,
              {
                headers: {
                  'Authorization': `Bearer ${reporteiApiKey}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            
            if (integrationsResponse.ok) {
              const integrationsData = await integrationsResponse.json();
              console.log(`Reportei: ${integrationsData.data?.length || 0} integrações encontradas`);
              
              // Get widgets from first integration
              if (integrationsData.data?.length > 0) {
                const integration = integrationsData.data[0];
                const widgetsResponse = await fetch(
                  `https://app.reportei.com/api/v1/integrations/${integration.id}/widgets`,
                  {
                    headers: {
                      'Authorization': `Bearer ${reporteiApiKey}`,
                      'Content-Type': 'application/json',
                    },
                  }
                );
                
                if (widgetsResponse.ok) {
                  const widgetsData = await widgetsResponse.json();
                  console.log(`Reportei: ${widgetsData.data?.length || 0} widgets encontrados`);
                  
                  // Get values for first 10 widgets
                  const widgetIds = widgetsData.data?.slice(0, 10).map((w: any) => w.id) || [];
                  
                  if (widgetIds.length > 0) {
                    const valuesResponse = await fetch(
                      'https://app.reportei.com/api/v1/widgets/values',
                      {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${reporteiApiKey}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          widget_ids: widgetIds,
                          start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                          end_date: endDate || new Date().toISOString().split('T')[0],
                        }),
                      }
                    );
                    
                    if (valuesResponse.ok) {
                      reporteiData = await valuesResponse.json();
                      console.log('Reportei: Dados de métricas obtidos com sucesso');
                    }
                  }
                }
              }
            }
          }
        }
      } catch (reporteiError) {
        console.error('Erro ao buscar dados do Reportei:', reporteiError);
      }
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
    
    if (reporteiData) {
      dataContext += `### Métricas de Marketing (Reportei)\n`;
      dataContext += JSON.stringify(reporteiData, null, 2) + '\n\n';
    } else {
      dataContext += `### Marketing\nDados do Reportei não disponíveis ou não configurados para este cliente.\n\n`;
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
