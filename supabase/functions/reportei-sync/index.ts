import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REPORTEI_BASE_URL = 'https://app.reportei.com/api/v1';

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

    // Helper function to fetch from Reportei API
    async function fetchReportei(endpoint: string, method = 'GET', body?: any) {
      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${reporteiApiKey}`,
          'Content-Type': 'application/json',
        },
      };
      if (body) options.body = JSON.stringify(body);
      
      const response = await fetch(`${REPORTEI_BASE_URL}${endpoint}`, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Reportei API error (${endpoint}):`, response.status, errorText);
        throw new Error(`Reportei API error: ${response.status}`);
      }
      
      return response.json();
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
        const integrations = await fetchReportei(`/clients/${reporteiClientId}/integrations`);
        
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

        for (const link of clientLinks) {
          for (const integration of (link.reportei_integrations || [])) {
            try {
              // Buscar widgets da integração
              const widgets = await fetchReportei(`/integrations/${integration.reportei_integration_id}/widgets`);
              
              if (!widgets?.data?.length) continue;

              const widgetIds = widgets.data.map((w: any) => w.id);
              
              // Buscar valores dos widgets
              const values = await fetchReportei('/widgets/values', 'POST', {
                widget_ids: widgetIds,
                start_date: periodStart,
                end_date: periodEnd,
              });

              if (values?.data?.length > 0) {
                for (const widgetData of values.data) {
                  const widgetInfo = widgets.data.find((w: any) => w.id === widgetData.widget_id);
                  
                  // Determinar tipo de métrica baseado no nome/tipo do widget
                  const metricType = determineMetricType(widgetInfo?.name || widgetInfo?.title || '');
                  
                  // Extrair valor numérico se possível
                  let metricValue = null;
                  let metricValueText = null;
                  
                  if (typeof widgetData.value === 'number') {
                    metricValue = widgetData.value;
                  } else if (typeof widgetData.value === 'string') {
                    const numValue = parseFloat(widgetData.value.replace(/[^0-9.-]/g, ''));
                    if (!isNaN(numValue)) {
                      metricValue = numValue;
                    }
                    metricValueText = widgetData.value;
                  }

                  await supabase
                    .from('reportei_metrics')
                    .insert({
                      integration_id: integration.id,
                      widget_id: widgetData.widget_id.toString(),
                      widget_name: widgetInfo?.name || widgetInfo?.title,
                      metric_type: metricType,
                      metric_value: metricValue,
                      metric_value_text: metricValueText,
                      period_start: periodStart,
                      period_end: periodEnd,
                      raw_data: widgetData,
                    });

                  totalMetrics++;
                }
              }
            } catch (integrationError) {
              console.error(`Error syncing integration ${integration.id}:`, integrationError);
              // Continue with other integrations
            }
          }
        }

        console.log(`Synced ${totalMetrics} metrics for client ${clientId}`);

        return new Response(JSON.stringify({ 
          success: true, 
          metricsCount: totalMetrics 
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

        return new Response(JSON.stringify({ 
          success: true, 
          data: data?.[0] || null,
          isLinked: data && data.length > 0
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
