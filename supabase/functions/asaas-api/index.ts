import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AsaasConfig {
  api_key_encrypted: string;
  environment: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Extract the JWT token from the Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Create admin client to verify the token
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the user using the token directly
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('Authentication failed:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message || 'Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('User authenticated:', user.id);

    // Get Asaas config using admin client
    const { data: config, error: configError } = await supabaseAdmin
      .from('asaas_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      console.error('Config error:', configError);
      return new Response(
        JSON.stringify({ error: 'Asaas não configurado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const asaasConfig = config as AsaasConfig;
    const apiKey = Deno.env.get('ASAAS_API_KEY') || '';
    const baseUrl =
      asaasConfig.environment === 'sandbox'
        ? 'https://sandbox.asaas.com/api/v3'
        : 'https://api.asaas.com/v3';

    // Parse request body to get action
    let requestBody: any = {};
    try {
      requestBody = await req.json();
    } catch (e) {
      // Empty body is ok for some requests
    }

    const action = requestBody?.action || '';
    console.log('Action:', action);

    // GET /customers - List customers
    if (action === 'customers') {
      const response = await fetch(`${baseUrl}/customers?offset=0&limit=100`, {
        headers: {
          'access_token': apiKey,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /subscriptions - List subscriptions
    if (action === 'subscriptions') {
      const response = await fetch(`${baseUrl}/subscriptions?offset=0&limit=100`, {
        headers: {
          'access_token': apiKey,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /payments - List payments
    if (action === 'payments') {
      const response = await fetch(`${baseUrl}/payments?offset=0&limit=100`, {
        headers: {
          'access_token': apiKey,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /payments - Create payment
    if (action === 'create-payment') {
      const { action: _, ...paymentData } = requestBody;
      
      console.log('Creating payment:', paymentData);
      
      const response = await fetch(`${baseUrl}/payments`, {
        method: 'POST',
        headers: {
          'access_token': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      });
    }

    // PUT /payments/:id - Update payment
    if (action === 'update-payment') {
      const { action: _, paymentId, ...updateData } = requestBody;
      
      console.log('Updating payment:', paymentId, 'Body:', updateData);
      
      const response = await fetch(`${baseUrl}/payments/${paymentId}`, {
        method: 'PUT',
        headers: {
          'access_token': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      console.log('Asaas response:', data);
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      });
    }

    // PUT /subscriptions/:id - Update subscription
    if (action === 'update-subscription') {
      const { action: _, subscriptionId, ...updateData } = requestBody;
      
      console.log('Updating subscription:', subscriptionId, 'Body:', updateData);
      
      const response = await fetch(`${baseUrl}/subscriptions/${subscriptionId}`, {
        method: 'PUT',
        headers: {
          'access_token': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      console.log('Asaas response:', data);
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      });
    }

    return new Response(
      JSON.stringify({ error: 'Ação não encontrada', action }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
