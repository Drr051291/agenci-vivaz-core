import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export type ServiceFilter = 'brandspot' | '3d_cgi';

// Campaign name patterns per service
export const SERVICE_PATTERNS: Record<ServiceFilter, string[]> = {
  brandspot: ['brandspot', 'brand spot'],
  '3d_cgi': ['sétima', 'setima', '3d', 'cgi'],
};

export interface MetaInsightRow {
  date: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  cpm: number;
  cpc: number;
  ctr: number;
  frequency: number;
  results: number;
  leads: number;
  leads_native: number;
  leads_landing_page: number;
  link_clicks: number;
  landing_page_views: number;
  purchases: number;
}

export interface MetaCampaignRow {
  entity_id: string;
  entity_name: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  cpm: number;
  cpc: number;
  ctr: number;
  frequency: number;
  results: number;
  leads: number;
  leads_native: number;
  leads_landing_page: number;
  link_clicks: number;
  landing_page_views: number;
  is_active?: boolean;
}

export interface MetaCreativeRow {
  entity_id: string;
  entity_name: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  leads: number;
  campaign_name: string;
}

export interface MetaKPIs {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  leads: number;
  leads_native: number;
  leads_landing_page: number;
  link_clicks: number;
  landing_page_views: number;
  results: number;
  cost_per_lead: number;
  cost_per_lead_native: number;
  cost_per_lead_lp: number;
  active_campaigns: number;
}

export interface MetaConnection {
  id: string;
  ad_account_id: string;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
  token_source: string;
}

export type PeriodPreset = 'thisMonth' | 'lastMonth' | 'last7' | 'last30' | 'last90';

export interface DateRange {
  from: Date;
  to: Date;
}

function matchesService(name: string, service: ServiceFilter): boolean {
  const lower = name.toLowerCase();
  return SERVICE_PATTERNS[service].some(p => lower.includes(p));
}

function sumKPIs(rows: MetaInsightRow[], activeCampaigns = 0): MetaKPIs {
  if (rows.length === 0) {
    return {
      spend: 0, impressions: 0, reach: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0,
      frequency: 0, leads: 0, leads_native: 0, leads_landing_page: 0, link_clicks: 0,
      landing_page_views: 0, results: 0, cost_per_lead: 0, cost_per_lead_native: 0,
      cost_per_lead_lp: 0, active_campaigns: 0,
    };
  }
  const spend = rows.reduce((s, r) => s + r.spend, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const reach = rows.reduce((s, r) => s + r.reach, 0);
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const leads = rows.reduce((s, r) => s + r.leads, 0);
  const leads_native = rows.reduce((s, r) => s + (r.leads_native || 0), 0);
  const leads_landing_page = rows.reduce((s, r) => s + (r.leads_landing_page || 0), 0);
  const link_clicks = rows.reduce((s, r) => s + (r.link_clicks || 0), 0);
  const landing_page_views = rows.reduce((s, r) => s + (r.landing_page_views || 0), 0);
  const results = rows.reduce((s, r) => s + r.results, 0);
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const frequency = reach > 0 ? impressions / reach : 0;
  const cost_per_lead = leads > 0 ? spend / leads : 0;
  const cost_per_lead_native = leads_native > 0 ? spend / leads_native : 0;
  const cost_per_lead_lp = leads_landing_page > 0 ? spend / leads_landing_page : 0;
  return {
    spend, impressions, reach, clicks, ctr, cpc, cpm, frequency,
    leads, leads_native, leads_landing_page, link_clicks, landing_page_views,
    results, cost_per_lead, cost_per_lead_native, cost_per_lead_lp, active_campaigns: activeCampaigns,
  };
}

function getPreviousPeriod(from: Date, to: Date): DateRange {
  const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - days + 1);
  return { from: prevFrom, to: prevTo };
}

export function useMetaAdsByService(
  clientId: string,
  service: ServiceFilter,
  dateRange: DateRange,
  withComparison = true
) {
  const [connection, setConnection] = useState<MetaConnection | null>(null);
  const [campaignRows, setCampaignRows] = useState<MetaCampaignRow[]>([]);
  const [dailyRows, setDailyRows] = useState<MetaInsightRow[]>([]);
  const [prevDailyRows, setPrevDailyRows] = useState<MetaInsightRow[]>([]);
  const [creativeRows, setCreativeRows] = useState<MetaCreativeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromStr = format(dateRange.from, 'yyyy-MM-dd');
  const toStr = format(dateRange.to, 'yyyy-MM-dd');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch connection
      const { data: conn } = await supabase
        .from('meta_connections')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();
      setConnection(conn || null);

      // Fetch campaign-level insights (filtered by service name)
      const { data: campData, error: campErr } = await supabase
        .from('meta_daily_insights')
        .select('entity_id, entity_name, impressions, reach, clicks, spend, cpm, cpc, ctr, frequency, results, leads, leads_native, leads_landing_page, link_clicks, landing_page_views, date')
        .eq('client_id', clientId)
        .eq('level', 'campaign')
        .gte('date', fromStr)
        .lte('date', toStr);
      if (campErr) throw campErr;

      // Filter campaigns matching this service
      const filteredCampaignData = (campData || []).filter((r: any) =>
        matchesService(r.entity_name || '', service)
      );

      // Aggregate by campaign
      const campMap: Record<string, MetaCampaignRow> = {};
      filteredCampaignData.forEach((row: any) => {
        if (!campMap[row.entity_id]) {
          campMap[row.entity_id] = {
            entity_id: row.entity_id,
            entity_name: row.entity_name,
            impressions: 0, reach: 0, clicks: 0, spend: 0,
            cpm: 0, cpc: 0, ctr: 0, frequency: 0, results: 0,
            leads: 0, leads_native: 0, leads_landing_page: 0,
            link_clicks: 0, landing_page_views: 0,
          };
        }
        campMap[row.entity_id].impressions += row.impressions || 0;
        campMap[row.entity_id].reach += row.reach || 0;
        campMap[row.entity_id].clicks += row.clicks || 0;
        campMap[row.entity_id].spend += row.spend || 0;
        campMap[row.entity_id].results += row.results || 0;
        campMap[row.entity_id].leads += row.leads || 0;
        campMap[row.entity_id].leads_native += row.leads_native || 0;
        campMap[row.entity_id].leads_landing_page += row.leads_landing_page || 0;
        campMap[row.entity_id].link_clicks += row.link_clicks || 0;
        campMap[row.entity_id].landing_page_views += row.landing_page_views || 0;
      });
      const camps = Object.values(campMap).map(c => ({
        ...c,
        ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
        cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
        cpm: c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0,
        is_active: true,
      }));
      setCampaignRows(camps);

      // Build daily aggregated rows from filtered campaigns
      const dateMap: Record<string, MetaInsightRow> = {};
      filteredCampaignData.forEach((row: any) => {
        const d = row.date;
        if (!dateMap[d]) {
          dateMap[d] = {
            date: d, impressions: 0, reach: 0, clicks: 0, spend: 0,
            cpm: 0, cpc: 0, ctr: 0, frequency: 0, results: 0, leads: 0,
            leads_native: 0, leads_landing_page: 0, link_clicks: 0,
            landing_page_views: 0, purchases: 0,
          };
        }
        dateMap[d].impressions += row.impressions || 0;
        dateMap[d].reach += row.reach || 0;
        dateMap[d].clicks += row.clicks || 0;
        dateMap[d].spend += row.spend || 0;
        dateMap[d].results += row.results || 0;
        dateMap[d].leads += row.leads || 0;
        dateMap[d].leads_native += row.leads_native || 0;
        dateMap[d].leads_landing_page += row.leads_landing_page || 0;
        dateMap[d].link_clicks += row.link_clicks || 0;
        dateMap[d].landing_page_views += row.landing_page_views || 0;
      });
      // Recompute rate metrics per day
      const daily = Object.values(dateMap)
        .map(d => ({
          ...d,
          ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
          cpc: d.clicks > 0 ? d.spend / d.clicks : 0,
          cpm: d.impressions > 0 ? (d.spend / d.impressions) * 1000 : 0,
          frequency: d.reach > 0 ? d.impressions / d.reach : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      setDailyRows(daily);

      // Fetch ad-level (creatives) for this service
      const { data: adData } = await supabase
        .from('meta_daily_insights')
        .select('entity_id, entity_name, impressions, clicks, spend, ctr, leads, raw_actions')
        .eq('client_id', clientId)
        .eq('level', 'ad')
        .gte('date', fromStr)
        .lte('date', toStr);

      // Filter ads by campaign name stored in raw_actions
      const filteredAds = (adData || []).filter((r: any) => {
        const campaignName = r.raw_actions?.campaign_name || r.entity_name || '';
        return matchesService(campaignName, service);
      });

      // Aggregate creatives
      const creativeMap: Record<string, MetaCreativeRow> = {};
      filteredAds.forEach((row: any) => {
        if (!creativeMap[row.entity_id]) {
          creativeMap[row.entity_id] = {
            entity_id: row.entity_id,
            entity_name: row.entity_name,
            impressions: 0, clicks: 0, spend: 0, ctr: 0, leads: 0,
            campaign_name: row.raw_actions?.campaign_name || '',
          };
        }
        creativeMap[row.entity_id].impressions += row.impressions || 0;
        creativeMap[row.entity_id].clicks += row.clicks || 0;
        creativeMap[row.entity_id].spend += row.spend || 0;
        creativeMap[row.entity_id].leads += row.leads || 0;
      });
      const creatives = Object.values(creativeMap).map(c => ({
        ...c,
        ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
      })).sort((a, b) => b.impressions - a.impressions);
      setCreativeRows(creatives.slice(0, 10)); // top 10

      // Comparison period
      if (withComparison) {
        const prev = getPreviousPeriod(dateRange.from, dateRange.to);
        const { data: prevCampData } = await supabase
          .from('meta_daily_insights')
          .select('entity_id, entity_name, impressions, reach, clicks, spend, results, leads, leads_native, leads_landing_page, link_clicks, landing_page_views, date')
          .eq('client_id', clientId)
          .eq('level', 'campaign')
          .gte('date', format(prev.from, 'yyyy-MM-dd'))
          .lte('date', format(prev.to, 'yyyy-MM-dd'));

        const filteredPrev = (prevCampData || []).filter((r: any) =>
          matchesService(r.entity_name || '', service)
        );
        const prevDateMap: Record<string, MetaInsightRow> = {};
        filteredPrev.forEach((row: any) => {
          const d = row.date;
          if (!prevDateMap[d]) {
            prevDateMap[d] = {
              date: d, impressions: 0, reach: 0, clicks: 0, spend: 0,
              cpm: 0, cpc: 0, ctr: 0, frequency: 0, results: 0, leads: 0,
              leads_native: 0, leads_landing_page: 0, link_clicks: 0,
              landing_page_views: 0, purchases: 0,
            };
          }
          prevDateMap[d].impressions += row.impressions || 0;
          prevDateMap[d].reach += row.reach || 0;
          prevDateMap[d].clicks += row.clicks || 0;
          prevDateMap[d].spend += row.spend || 0;
          prevDateMap[d].leads += row.leads || 0;
          prevDateMap[d].leads_native += row.leads_native || 0;
          prevDateMap[d].leads_landing_page += row.leads_landing_page || 0;
          prevDateMap[d].link_clicks += row.link_clicks || 0;
          prevDateMap[d].landing_page_views += row.landing_page_views || 0;
        });
        setPrevDailyRows(Object.values(prevDateMap));
      }
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [clientId, service, fromStr, toStr, withComparison]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const syncNow = async (adAccountId?: string) => {
    setSyncing(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('meta-sync-insights', {
        body: {
          client_id: clientId,
          ad_account_id: adAccountId,
          date_from: fromStr,
          date_to: toStr,
        },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      await fetchData();
    } catch (e: any) {
      setError(e.message || 'Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const activeCampaigns = campaignRows.length;
  const kpis = sumKPIs(dailyRows, activeCampaigns);
  const prevKpis = sumKPIs(prevDailyRows, 0);

  return {
    connection, campaignRows, dailyRows, creativeRows,
    kpis, prevKpis, loading, syncing, error,
    refetch: fetchData, syncNow,
  };
}

export function getPeriodRange(preset: PeriodPreset): DateRange {
  const now = new Date();
  switch (preset) {
    case 'thisMonth': return { from: startOfMonth(now), to: now };
    case 'lastMonth': { const lm = subMonths(now, 1); return { from: startOfMonth(lm), to: endOfMonth(lm) }; }
    case 'last7': { const d = new Date(now); d.setDate(d.getDate() - 6); return { from: d, to: now }; }
    case 'last30': { const d = new Date(now); d.setDate(d.getDate() - 29); return { from: d, to: now }; }
    case 'last90': { const d = new Date(now); d.setDate(d.getDate() - 89); return { from: d, to: now }; }
    default: return { from: startOfMonth(now), to: now };
  }
}
