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
    // Create user-scoped client for authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Create admin client for reading Asaas config (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1];

    console.log('Action:', action, 'Method:', req.method);

    // GET /customers - List customers
    if (action === 'customers' && req.method === 'GET') {
      const offset = url.searchParams.get('offset') || '0';
      const limit = url.searchParams.get('limit') || '100';
      
      const response = await fetch(`${baseUrl}/customers?offset=${offset}&limit=${limit}`, {
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

    // GET /customers/:id - Get customer details
    if (action.startsWith('customer-') && req.method === 'GET') {
      const customerId = action.replace('customer-', '');
      
      const response = await fetch(`${baseUrl}/customers/${customerId}`, {
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

    // POST /customers - Create customer
    if (action === 'customers' && req.method === 'POST') {
      const body = await req.json();
      
      const response = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers: {
          'access_token': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      });
    }

    // GET /subscriptions - List subscriptions
    if (action === 'subscriptions' && req.method === 'GET') {
      const offset = url.searchParams.get('offset') || '0';
      const limit = url.searchParams.get('limit') || '100';
      const customer = url.searchParams.get('customer') || '';
      
      let apiUrl = `${baseUrl}/subscriptions?offset=${offset}&limit=${limit}`;
      if (customer) {
        apiUrl += `&customer=${customer}`;
      }
      
      const response = await fetch(apiUrl, {
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

    // POST /subscriptions - Create subscription
    if (action === 'subscriptions' && req.method === 'POST') {
      const body = await req.json();
      
      const response = await fetch(`${baseUrl}/subscriptions`, {
        method: 'POST',
        headers: {
          'access_token': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      });
    }

    // GET /payments - List payments
    if (action === 'payments' && req.method === 'GET') {
      const offset = url.searchParams.get('offset') || '0';
      const limit = url.searchParams.get('limit') || '100';
      const customer = url.searchParams.get('customer') || '';
      const status = url.searchParams.get('status') || '';
      
      let apiUrl = `${baseUrl}/payments?offset=${offset}&limit=${limit}`;
      if (customer) {
        apiUrl += `&customer=${customer}`;
      }
      if (status) {
        apiUrl += `&status=${status}`;
      }
      
      const response = await fetch(apiUrl, {
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
    if (action === 'payments' && req.method === 'POST') {
      const body = await req.json();
      
      const response = await fetch(`${baseUrl}/payments`, {
        method: 'POST',
        headers: {
          'access_token': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      });
    }

    // GET /payment-info/:id - Get payment billing info
    if (action.startsWith('payment-info-') && req.method === 'GET') {
      const paymentId = action.replace('payment-info-', '');
      
      console.log('Getting payment info:', paymentId);
      
      const response = await fetch(`${baseUrl}/payments/${paymentId}`, {
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

    // PUT /update-payment/:id - Update payment
    if (action.startsWith('update-payment-') && req.method === 'PUT') {
      const paymentId = action.replace('update-payment-', '');
      const body = await req.json();
      
      console.log('Updating payment:', paymentId, 'Body:', body);
      
      const response = await fetch(`${baseUrl}/payments/${paymentId}`, {
        method: 'PUT',
        headers: {
          'access_token': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      console.log('Asaas response:', data);
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      });
    }

    // PUT /update-subscription/:id - Update subscription
    if (action.startsWith('update-subscription-') && req.method === 'PUT') {
      const subscriptionId = action.replace('update-subscription-', '');
      const body = await req.json();
      
      console.log('Updating subscription:', subscriptionId, 'Body:', body);
      
      const response = await fetch(`${baseUrl}/subscriptions/${subscriptionId}`, {
        method: 'PUT',
        headers: {
          'access_token': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      console.log('Asaas response:', data);
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      });
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint não encontrado' }),
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
