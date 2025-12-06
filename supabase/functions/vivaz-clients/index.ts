import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get API key from header for authentication
    const apiKey = req.headers.get('x-api-key');
    
    // Simple API key validation (you can make this more secure)
    const expectedApiKey = Deno.env.get('VIVAZ_MAKE_API_KEY');
    
    if (expectedApiKey && apiKey !== expectedApiKey) {
      console.error('Invalid API key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all active clients with their ad account configurations
    const { data: configs, error: configError } = await supabaseAdmin
      .from('vivaz_dashboard_config')
      .select(`
        id,
        client_id,
        webhook_token,
        is_active,
        meta_ad_account_id,
        google_ads_account_id,
        ga4_property_id,
        clients:client_id (
          id,
          company_name
        )
      `)
      .eq('is_active', true);

    if (configError) {
      console.error('Error fetching configs:', configError);
      return new Response(
        JSON.stringify({ error: 'Error fetching clients' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format the response for Make
    const clients = configs?.map(config => {
      const clientData = Array.isArray(config.clients) ? config.clients[0] : config.clients;
      return {
        client_id: config.client_id,
        client_name: clientData?.company_name || 'Unknown',
        webhook_token: config.webhook_token,
        accounts: {
          meta_ads: config.meta_ad_account_id || null,
          google_ads: config.google_ads_account_id || null,
          ga4: config.ga4_property_id || null,
        }
      };
    }).filter(client =>
      // Only include clients with at least one account configured
      client.accounts.meta_ads || client.accounts.google_ads || client.accounts.ga4
    ) || [];

    console.log(`Returning ${clients.length} clients with ad accounts configured`);

    return new Response(
      JSON.stringify({ 
        success: true,
        count: clients.length,
        clients 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
