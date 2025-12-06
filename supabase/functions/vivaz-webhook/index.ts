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

    const body = await req.json();
    console.log('Received webhook data:', JSON.stringify(body, null, 2));

    const { token, channel, date, metrics } = body;

    // Validate required fields
    if (!token) {
      console.error('Missing token');
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!channel) {
      console.error('Missing channel');
      return new Response(
        JSON.stringify({ error: 'Channel is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!date) {
      console.error('Missing date');
      return new Response(
        JSON.stringify({ error: 'Date is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!metrics || typeof metrics !== 'object') {
      console.error('Missing or invalid metrics');
      return new Response(
        JSON.stringify({ error: 'Metrics object is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find client by webhook token
    const { data: config, error: configError } = await supabaseAdmin
      .from('vivaz_dashboard_config')
      .select('client_id, is_active')
      .eq('webhook_token', token)
      .maybeSingle();

    if (configError) {
      console.error('Config lookup error:', configError);
      return new Response(
        JSON.stringify({ error: 'Error validating token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!config) {
      console.error('Invalid token - no config found');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!config.is_active) {
      console.error('Webhook is inactive');
      return new Response(
        JSON.stringify({ error: 'Webhook is inactive' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate CTR and CPC if not provided
    const impressions = metrics.impressions || 0;
    const clicks = metrics.clicks || 0;
    const cost = metrics.cost || 0;
    const ctr = metrics.ctr ?? (impressions > 0 ? (clicks / impressions) * 100 : 0);
    const cpc = metrics.cpc ?? (clicks > 0 ? cost / clicks : 0);

    // Upsert metrics (update if exists, insert if not)
    const { data: metricData, error: metricError } = await supabaseAdmin
      .from('vivaz_metrics')
      .upsert({
        client_id: config.client_id,
        channel: channel.toLowerCase(),
        metric_date: date,
        impressions: metrics.impressions || 0,
        clicks: metrics.clicks || 0,
        conversions: metrics.conversions || 0,
        cost: metrics.cost || 0,
        reach: metrics.reach || 0,
        ctr: ctr,
        cpc: cpc,
        metadata: metrics.metadata || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'client_id,channel,metric_date',
      })
      .select();

    if (metricError) {
      console.error('Error saving metrics:', metricError);
      return new Response(
        JSON.stringify({ error: 'Error saving metrics', details: metricError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Metrics saved successfully:', metricData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Metrics received and stored successfully',
        data: {
          client_id: config.client_id,
          channel,
          date,
          metrics_saved: true
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
