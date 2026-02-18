import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const META_API_BASE = 'https://graph.facebook.com/v20.0';
const INSIGHTS_FIELDS = 'impressions,reach,clicks,spend,cpm,cpc,ctr,frequency,actions,action_values';

function getToken(): string {
  const token = Deno.env.get('META_ACCESS_TOKEN');
  if (!token) throw new Error('Token META_ACCESS_TOKEN não configurado. Configure o secret nas configurações do Lovable Cloud.');
  return token;
}

async function metaFetch(path: string, params: Record<string, string>): Promise<any> {
  const token = getToken();
  const url = new URL(`${META_API_BASE}${path}`);
  url.searchParams.set('access_token', token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  const json = await res.json();

  if (json.error) {
    throw new Error(`Meta API: ${json.error.message} (código ${json.error.code})`);
  }
  return json;
}

function extractActions(rawActions: any[], actionType: string): number {
  if (!Array.isArray(rawActions)) return 0;
  const matches = rawActions.filter(a =>
    typeof a.action_type === 'string' && a.action_type.toLowerCase().includes(actionType)
  );
  return matches.reduce((sum, a) => sum + parseFloat(a.value || '0'), 0);
}

async function fetchInsights(
  adAccountId: string,
  dateFrom: string,
  dateTo: string,
  level: 'account' | 'campaign'
): Promise<any[]> {
  const params: Record<string, string> = {
    fields: INSIGHTS_FIELDS,
    time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
    time_increment: '1',
    level,
    limit: '500',
  };

  let allData: any[] = [];
  let nextUrl: string | null = null;

  // First request
  const first = await metaFetch(`/${adAccountId}/insights`, params);
  allData = allData.concat(first.data || []);
  nextUrl = first.paging?.next || null;

  // Handle pagination
  let page = 0;
  while (nextUrl && page < 10) {
    page++;
    const token = getToken();
    const pageUrl = new URL(nextUrl);
    pageUrl.searchParams.set('access_token', token);
    const res = await fetch(pageUrl.toString());
    const json = await res.json();
    if (json.error) break;
    allData = allData.concat(json.data || []);
    nextUrl = json.paging?.next || null;
  }

  return allData;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(supabaseUrl, serviceRoleKey);

  let runId: string | null = null;
  let clientId: string | null = null;

  try {
    const body = await req.json();
    clientId = body.client_id;
    const dateFrom: string = body.date_from;
    const dateTo: string = body.date_to;

    if (!clientId || !dateFrom || !dateTo) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros obrigatórios: client_id, date_from, date_to' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get ad_account_id from meta_connections or body
    let adAccountId: string = body.ad_account_id || '';
    if (!adAccountId) {
      const { data: conn } = await sb
        .from('meta_connections')
        .select('ad_account_id')
        .eq('client_id', clientId)
        .single();
      adAccountId = conn?.ad_account_id || Deno.env.get('META_AD_ACCOUNT_ID') || '';
    }

    if (!adAccountId) {
      return new Response(
        JSON.stringify({ error: 'ID da conta de anúncios não configurado. Configure em Configurações do Meta Ads.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize: ensure act_ prefix
    const normalizedAccount = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

    // Create sync run record
    const { data: run } = await sb
      .from('meta_sync_runs')
      .insert({ client_id: clientId, status: 'running' })
      .select('id')
      .single();
    runId = run?.id || null;

    // Update connection status to active
    await sb
      .from('meta_connections')
      .upsert({
        client_id: clientId,
        ad_account_id: normalizedAccount,
        token_source: 'lovable_secret',
        status: 'active',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'client_id' });

    let totalUpserted = 0;

    // Fetch account-level daily insights
    const accountInsights = await fetchInsights(normalizedAccount, dateFrom, dateTo, 'account');

    const accountRows = accountInsights.map((d: any) => ({
      client_id: clientId!,
      ad_account_id: normalizedAccount,
      level: 'account',
      entity_id: normalizedAccount,
      entity_name: 'Conta',
      date: d.date_start,
      impressions: parseInt(d.impressions || '0'),
      reach: parseInt(d.reach || '0'),
      clicks: parseInt(d.clicks || '0'),
      spend: parseFloat(d.spend || '0'),
      cpm: parseFloat(d.cpm || '0'),
      cpc: parseFloat(d.cpc || '0'),
      ctr: parseFloat(d.ctr || '0'),
      frequency: parseFloat(d.frequency || '0'),
      leads: extractActions(d.actions || [], 'lead'),
      purchases: extractActions(d.actions || [], 'purchase'),
      results: extractActions(d.actions || [], 'lead') || extractActions(d.actions || [], 'purchase'),
      raw_actions: d.actions || [],
      updated_at: new Date().toISOString(),
    }));

    if (accountRows.length > 0) {
      const { error: accErr } = await sb
        .from('meta_daily_insights')
        .upsert(accountRows, { onConflict: 'client_id,ad_account_id,level,entity_id,date' });
      if (accErr) throw new Error(`Erro ao salvar insights de conta: ${accErr.message}`);
      totalUpserted += accountRows.length;
    }

    // Fetch campaign-level daily insights
    const campaignInsights = await fetchInsights(normalizedAccount, dateFrom, dateTo, 'campaign');

    // Deduplicate campaign insights by (entity_id, date) before upsert
    const campaignDeduped: Record<string, any> = {};
    campaignInsights.forEach((d: any) => {
      const key = `${d.campaign_id || d.id || 'unknown'}__${d.date_start}`;
      if (!campaignDeduped[key]) {
        campaignDeduped[key] = d;
      } else {
        // Merge numeric fields by summing
        const existing = campaignDeduped[key];
        existing.impressions = String(parseInt(existing.impressions || '0') + parseInt(d.impressions || '0'));
        existing.reach = String(parseInt(existing.reach || '0') + parseInt(d.reach || '0'));
        existing.clicks = String(parseInt(existing.clicks || '0') + parseInt(d.clicks || '0'));
        existing.spend = String(parseFloat(existing.spend || '0') + parseFloat(d.spend || '0'));
        // Merge actions arrays
        const existingActions: any[] = existing.actions || [];
        const newActions: any[] = d.actions || [];
        newActions.forEach((a: any) => {
          const found = existingActions.find((e: any) => e.action_type === a.action_type);
          if (found) {
            found.value = String(parseFloat(found.value || '0') + parseFloat(a.value || '0'));
          } else {
            existingActions.push({ ...a });
          }
        });
        existing.actions = existingActions;
      }
    });

    const campaignRows = Object.values(campaignDeduped).map((d: any) => ({
      client_id: clientId!,
      ad_account_id: normalizedAccount,
      level: 'campaign',
      entity_id: d.campaign_id || d.id || 'unknown',
      entity_name: d.campaign_name || d.adset_name || 'Campanha',
      date: d.date_start,
      impressions: parseInt(d.impressions || '0'),
      reach: parseInt(d.reach || '0'),
      clicks: parseInt(d.clicks || '0'),
      spend: parseFloat(d.spend || '0'),
      cpm: parseFloat(d.cpm || '0'),
      cpc: parseFloat(d.cpc || '0'),
      ctr: parseFloat(d.ctr || '0'),
      frequency: parseFloat(d.frequency || '0'),
      leads: extractActions(d.actions || [], 'lead'),
      purchases: extractActions(d.actions || [], 'purchase'),
      results: extractActions(d.actions || [], 'lead') || extractActions(d.actions || [], 'purchase'),
      raw_actions: d.actions || [],
      updated_at: new Date().toISOString(),
    }));

    if (campaignRows.length > 0) {
      const { error: campErr } = await sb
        .from('meta_daily_insights')
        .upsert(campaignRows, { onConflict: 'client_id,ad_account_id,level,entity_id,date' });
      if (campErr) throw new Error(`Erro ao salvar insights de campanhas: ${campErr.message}`);
      totalUpserted += campaignRows.length;
    }

    // Update connection last_sync_at
    await sb
      .from('meta_connections')
      .update({ last_sync_at: new Date().toISOString(), status: 'active', last_error: null })
      .eq('client_id', clientId);

    // Mark sync run as success
    if (runId) {
      await sb
        .from('meta_sync_runs')
        .update({ status: 'success', finished_at: new Date().toISOString(), records_upserted: totalUpserted })
        .eq('id', runId);
    }

    return new Response(
      JSON.stringify({ success: true, records_upserted: totalUpserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('meta-sync-insights error:', err);
    const msg = err.message || 'Erro desconhecido';

    // Update connection status to error
    if (clientId) {
      await sb
        .from('meta_connections')
        .upsert({
          client_id: clientId,
          ad_account_id: '',
          token_source: 'lovable_secret',
          status: 'error',
          last_error: msg,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'client_id' })
        .then(() => {});
    }

    // Mark sync run as error
    if (runId) {
      await sb
        .from('meta_sync_runs')
        .update({ status: 'error', finished_at: new Date().toISOString(), error_message: msg })
        .eq('id', runId);
    }

    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
