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
    const { action, companyId, reportId } = await req.json();
    const apiKey = Deno.env.get('REPORTEI_API_KEY');

    if (!apiKey) {
      throw new Error('REPORTEI_API_KEY not configured');
    }

    const baseUrl = 'https://app.reportei.com/api';
    let endpoint = '';
    
    switch (action) {
      case 'getCompanies':
        endpoint = `${baseUrl}/companies`;
        break;
      case 'getReports':
        endpoint = `${baseUrl}/companies/${companyId}/reports`;
        break;
      case 'getReportData':
        endpoint = `${baseUrl}/reports/${reportId}`;
        break;
      default:
        throw new Error('Invalid action');
    }

    console.log(`Fetching from Reportei: ${endpoint}`);

    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Reportei API error:', errorText);
      throw new Error(`Reportei API error: ${response.status}`);
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
