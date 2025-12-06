import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REPORTEI_BASE_URL = 'https://app.reportei.com/api/v1';

// Helper to add delay between requests to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, clientId, startDate, endDate, hubClientId, reporteiClientId, reporteiClientName } = body;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const reporteiApiKey = Deno.env.get('REPORTEI_API_KEY');

    if (!reporteiApiKey) {
      throw new Error('REPORTEI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Helper function to fetch from Reportei API with retry logic
    async function fetchReportei(endpoint: string, method = 'GET', requestBody?: any, retries = 3): Promise<any> {
      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${reporteiApiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      };
      if (requestBody) options.body = JSON.stringify(requestBody);
      
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const response = await fetch(`${REPORTEI_BASE_URL}${endpoint}`, options);
          
          // Handle rate limiting with exponential backoff
          if (response.status === 429) {
            console.log(`Rate limited on ${endpoint}, attempt ${attempt}/${retries}, waiting...`);
            if (attempt < retries) {
              await delay(2000 * attempt); // 2s, 4s, 6s backoff
              continue;
            }
          }
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Reportei API error (${endpoint}):`, response.status, errorText.substring(0, 200));
            throw new Error(`Reportei API error: ${response.status}`);
          }
          
          return response.json();
        } catch (error) {
          if (attempt === retries) throw error;
          await delay(1000 * attempt);
        }
      }
    }

    switch (action) {
      case 'listReporteiClients': {
        // Lista todos os clientes do Reportei para vincular ao Hub
        const data = await fetchReportei('/clients');
        console.log('Reportei clients fetched:', data?.data?.length || 0);
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'linkClient': {
        // Vincula um cliente do Reportei ao Hub
        if (!hubClientId || !reporteiClientId || !reporteiClientName) {
          throw new Error('hubClientId, reporteiClientId and reporteiClientName are required');
        }
        
        const { data, error } = await supabase
          .from('reportei_clients')
          .upsert({
            client_id: hubClientId,
            reportei_client_id: reporteiClientId,
            reportei_client_name: reporteiClientName,
          }, {
            onConflict: 'client_id,reportei_client_id'
          })
          .select()
          .single();

        if (error) throw error;

        // Após vincular, buscar e salvar as integrações
        console.log(`Fetching integrations for Reportei client ${reporteiClientId}...`);
        const integrations = await fetchReportei(`/clients/${reporteiClientId}/integrations`);
        
        console.log('Integrations response:', JSON.stringify(integrations, null, 2));
        
        if (integrations?.data?.length > 0) {
          for (const integration of integrations.data) {
            await supabase
              .from('reportei_integrations')
              .upsert({
                reportei_client_link_id: data.id,
                reportei_integration_id: integration.id.toString(),
                channel_type: integration.channel || integration.type || 'unknown',
                channel_name: integration.name || integration.title,
                is_active: true,
              }, {
                onConflict: 'reportei_client_link_id,reportei_integration_id'
              });
          }
        }

        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'syncMetrics': {
        // Sincroniza métricas de um cliente específico
        if (!clientId) throw new Error('clientId required');

        const periodStart = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const periodEnd = endDate || new Date().toISOString().split('T')[0];

        console.log(`Syncing metrics for client ${clientId} from ${periodStart} to ${periodEnd}`);

        // Buscar vínculo do cliente Hub com Reportei
        const { data: clientLinks, error: linkError } = await supabase
          .from('reportei_clients')
          .select('*, reportei_integrations(*)')
          .eq('client_id', clientId);

        if (linkError) throw linkError;
        if (!clientLinks || clientLinks.length === 0) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Cliente não vinculado ao Reportei' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        let totalMetrics = 0;
        const errors: string[] = [];

        for (const link of clientLinks) {
          console.log(`Processing link ${link.id} with ${link.reportei_integrations?.length || 0} integrations`);
          
          for (const integration of (link.reportei_integrations || [])) {
            try {
              console.log(`Fetching widgets for integration ${integration.reportei_integration_id} (${integration.channel_type})...`);
              
              // Buscar widgets da integração
              const widgetsResponse = await fetchReportei(`/integrations/${integration.reportei_integration_id}/widgets`);
              
              console.log(`Widgets response for ${integration.channel_type}:`, JSON.stringify(widgetsResponse, null, 2));
              
              const widgets = widgetsResponse?.data || widgetsResponse || [];
              
              if (!Array.isArray(widgets) || widgets.length === 0) {
                console.log(`No widgets found for integration ${integration.reportei_integration_id}`);
                continue;
              }

              console.log(`Found ${widgets.length} widgets for integration ${integration.channel_type}`);

              // Para cada widget, verificar se tem dados diretamente na resposta
              // ou buscar dados individualmente
              for (const widget of widgets) {
                try {
                  // Delay entre widgets para evitar rate limiting
                  await delay(500);
                  
                  // Tentar buscar dados do widget individualmente
                  let widgetData = null;
                  
                  // Verifica se o widget já tem valor na resposta inicial
                  if (widget.value !== undefined || widget.current_value !== undefined) {
                    widgetData = {
                      value: widget.value ?? widget.current_value,
                      previous_value: widget.previous_value,
                    };
                  } else {
                    // Tentar buscar dados do widget com período específico
                    try {
                      const widgetValueResponse = await fetchReportei(
                        `/widgets/${widget.id}/data?start_date=${periodStart}&end_date=${periodEnd}`
                      );
                      widgetData = widgetValueResponse?.data || widgetValueResponse;
                    } catch (widgetError) {
                      // Se falhar, tentar endpoint alternativo
                      try {
                        const altResponse = await fetchReportei(
                          `/integrations/${integration.reportei_integration_id}/widgets/${widget.id}?start_date=${periodStart}&end_date=${periodEnd}`
                        );
                        widgetData = altResponse?.data || altResponse;
                      } catch {
                        console.log(`Could not fetch data for widget ${widget.id}, using available data`);
                        widgetData = { value: widget.value };
                      }
                    }
                  }
                  
                  if (!widgetData || (widgetData.value === undefined && widgetData.current_value === undefined)) {
                    continue;
                  }

                  const value = widgetData.value ?? widgetData.current_value;
                  const widgetName = widget.name || widget.title || `Widget ${widget.id}`;
                  
                  // Determinar tipo de métrica baseado no nome/tipo do widget
                  const metricType = determineMetricType(widgetName);
                  
                  // Extrair valor numérico se possível
                  let metricValue = null;
                  let metricValueText = null;
                  
                  if (typeof value === 'number') {
                    metricValue = value;
                  } else if (typeof value === 'string') {
                    const numValue = parseFloat(value.replace(/[^0-9.,-]/g, '').replace(',', '.'));
                    if (!isNaN(numValue)) {
                      metricValue = numValue;
                    }
                    metricValueText = value;
                  } else if (value !== null && value !== undefined) {
                    metricValueText = JSON.stringify(value);
                  }

                  // Inserir métrica no banco
                  const { error: insertError } = await supabase
                    .from('reportei_metrics')
                    .insert({
                      integration_id: integration.id,
                      widget_id: widget.id.toString(),
                      widget_name: widgetName,
                      metric_type: metricType,
                      metric_value: metricValue,
                      metric_value_text: metricValueText,
                      period_start: periodStart,
                      period_end: periodEnd,
                      raw_data: widgetData,
                    });

                  if (insertError) {
                    console.error(`Error inserting metric for widget ${widget.id}:`, insertError);
                  } else {
                    totalMetrics++;
                    console.log(`Saved metric: ${widgetName} = ${metricValue ?? metricValueText}`);
                  }
                } catch (widgetError) {
                  console.error(`Error processing widget ${widget.id}:`, widgetError);
                }
              }
            } catch (integrationError) {
              const errorMsg = integrationError instanceof Error ? integrationError.message : 'Unknown error';
              console.error(`Error syncing integration ${integration.id}:`, errorMsg);
              errors.push(`${integration.channel_type}: ${errorMsg}`);
            }
          }
        }

        console.log(`Synced ${totalMetrics} metrics for client ${clientId}`);

        return new Response(JSON.stringify({ 
          success: true, 
          metricsCount: totalMetrics,
          errors: errors.length > 0 ? errors : undefined
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getStoredMetrics': {
        // Retorna métricas armazenadas no banco para análise IA
        if (!clientId) throw new Error('clientId required');

        const periodStart = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const periodEnd = endDate || new Date().toISOString().split('T')[0];

        const { data: metrics, error } = await supabase
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

        if (error) throw error;

        // Organizar métricas por canal
        const metricsByChannel: Record<string, any[]> = {};
        
        for (const metric of (metrics || [])) {
          const channel = metric.reportei_integrations?.channel_type || 'unknown';
          if (!metricsByChannel[channel]) {
            metricsByChannel[channel] = [];
          }
          metricsByChannel[channel].push({
            name: metric.widget_name,
            type: metric.metric_type,
            value: metric.metric_value ?? metric.metric_value_text,
            period: `${metric.period_start} - ${metric.period_end}`,
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          data: metricsByChannel,
          totalMetrics: metrics?.length || 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getLinkedClient': {
        // Retorna o vínculo do cliente com Reportei
        if (!clientId) throw new Error('clientId required');

        const { data, error } = await supabase
          .from('reportei_clients')
          .select('*, reportei_integrations(*)')
          .eq('client_id', clientId);

        if (error) throw error;

        // Buscar contagem de métricas para este cliente
        const { count } = await supabase
          .from('reportei_metrics')
          .select('*', { count: 'exact', head: true })
          .in('integration_id', (data?.[0]?.reportei_integrations || []).map((i: any) => i.id));

        return new Response(JSON.stringify({ 
          success: true, 
          data: data?.[0] || null,
          isLinked: data && data.length > 0,
          metricsCount: count || 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'unlinkClient': {
        // Remove vínculo do cliente com Reportei
        if (!clientId) throw new Error('clientId required');

        const { error } = await supabase
          .from('reportei_clients')
          .delete()
          .eq('client_id', clientId);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Invalid action: ${action}`);
    }
  } catch (error) {
    console.error('Error in reportei-sync function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to determine metric type based on widget name
function determineMetricType(name: string): string {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('impression') || lowerName.includes('impressão') || lowerName.includes('impressões')) {
    return 'impressions';
  }
  if (lowerName.includes('click') || lowerName.includes('clique')) {
    return 'clicks';
  }
  if (lowerName.includes('reach') || lowerName.includes('alcance')) {
    return 'reach';
  }
  if (lowerName.includes('conversion') || lowerName.includes('conversão') || lowerName.includes('conversões')) {
    return 'conversions';
  }
  if (lowerName.includes('spend') || lowerName.includes('gasto') || lowerName.includes('custo') || lowerName.includes('cost')) {
    return 'spend';
  }
  if (lowerName.includes('ctr')) {
    return 'ctr';
  }
  if (lowerName.includes('cpc')) {
    return 'cpc';
  }
  if (lowerName.includes('cpm')) {
    return 'cpm';
  }
  if (lowerName.includes('cpa') || lowerName.includes('cpl')) {
    return 'cpa';
  }
  if (lowerName.includes('follower') || lowerName.includes('seguidor')) {
    return 'followers';
  }
  if (lowerName.includes('engagement') || lowerName.includes('engajamento')) {
    return 'engagement';
  }
  if (lowerName.includes('view') || lowerName.includes('visualiz')) {
    return 'views';
  }
  if (lowerName.includes('like') || lowerName.includes('curtida')) {
    return 'likes';
  }
  if (lowerName.includes('comment') || lowerName.includes('comentário')) {
    return 'comments';
  }
  if (lowerName.includes('share') || lowerName.includes('compartilh')) {
    return 'shares';
  }
  if (lowerName.includes('session') || lowerName.includes('sessão') || lowerName.includes('sessões')) {
    return 'sessions';
  }
  if (lowerName.includes('user') || lowerName.includes('usuário')) {
    return 'users';
  }
  if (lowerName.includes('bounce') || lowerName.includes('rejeição')) {
    return 'bounce_rate';
  }
  
  return 'other';
}
