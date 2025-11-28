import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, clientId, integrationId, widgetId, startDate, endDate } = await req.json();
    const apiKey = Deno.env.get('REPORTEI_API_KEY');

    if (!apiKey) {
      throw new Error('REPORTEI_API_KEY not configured');
    }

    const baseUrl = 'https://app.reportei.com/api/v1';
    let endpoint = '';
    let method = 'GET';
    let body = null;
    
    switch (action) {
      case 'getClients':
        endpoint = `${baseUrl}/clients`;
        break;
      case 'getIntegrations':
        if (!clientId) throw new Error('clientId required for getIntegrations');
        endpoint = `${baseUrl}/clients/${clientId}/integrations`;
        break;
      case 'getWidgets':
        if (!integrationId) throw new Error('integrationId required for getWidgets');
        endpoint = `${baseUrl}/integrations/${integrationId}/widgets`;
        break;
      case 'getWidgetValues':
        if (!integrationId || !widgetId) throw new Error('integrationId and widgetId required');
        endpoint = `${baseUrl}/integrations/${integrationId}/widgets/value`;
        method = 'POST';
        body = JSON.stringify({
          widget_id: widgetId,
          start_date: startDate,
          end_date: endDate,
        });
        break;
      default:
        throw new Error('Invalid action');
    }

    console.log(`Fetching from Reportei: ${method} ${endpoint}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      fetchOptions.body = body;
    }

    const response = await fetch(endpoint, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Reportei API error:', errorText);

      // Propagar o status correto da API do Reportei (ex.: 429 Too Many Requests)
      return new Response(
        JSON.stringify({
          error: 'Reportei API error',
          status: response.status,
          details: errorText,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in reportei-data function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
