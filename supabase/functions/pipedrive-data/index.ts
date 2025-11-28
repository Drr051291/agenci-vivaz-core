import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const { client_id, endpoint } = await req.json()

    if (!client_id) {
      throw new Error('client_id is required')
    }

    console.log('Fetching Pipedrive data for client:', client_id)

    // Buscar configuração do CRM para o cliente
    const { data: crmConfig, error: crmError } = await supabaseClient
      .from('crm_integrations')
      .select('*')
      .eq('client_id', client_id)
      .eq('crm_type', 'pipedrive')
      .eq('is_active', true)
      .single()

    if (crmError || !crmConfig) {
      console.error('CRM config error:', crmError)
      throw new Error('Pipedrive integration not configured for this client')
    }

    // Usar a chave API do cliente (api_key_encrypted é na verdade a chave em texto)
    const apiKey = crmConfig.api_key_encrypted
    const domain = crmConfig.domain || 'api.pipedrive.com'

    // Determinar qual endpoint chamar
    let pipedriveUrl = `https://${domain}/v1/${endpoint || 'deals'}?api_token=${apiKey}`

    console.log('Calling Pipedrive API:', pipedriveUrl.replace(apiKey, '***'))

    const pipedriveResponse = await fetch(pipedriveUrl)
    
    if (!pipedriveResponse.ok) {
      console.error('Pipedrive API error:', await pipedriveResponse.text())
      throw new Error(`Pipedrive API error: ${pipedriveResponse.status}`)
    }

    const pipedriveData = await pipedriveResponse.json()

    // Atualizar última sincronização
    await supabaseClient
      .from('crm_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', crmConfig.id)

    console.log('Successfully fetched Pipedrive data')

    return new Response(
      JSON.stringify(pipedriveData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in pipedrive-data function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
