import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

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
  results: number;
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

function sumKPIs(rows: MetaInsightRow[]): MetaKPIs {
  if (rows.length === 0) return { spend: 0, impressions: 0, reach: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0, frequency: 0, leads: 0, results: 0 };
  const spend = rows.reduce((s, r) => s + r.spend, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const reach = rows.reduce((s, r) => s + r.reach, 0);
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const leads = rows.reduce((s, r) => s + r.leads, 0);
  const results = rows.reduce((s, r) => s + r.results, 0);
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
  const frequency = reach > 0 ? impressions / reach : 0;
  return { spend, impressions, reach, clicks, ctr, cpc, cpm, frequency, leads, results };
}

function getPreviousPeriod(from: Date, to: Date): DateRange {
  const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - days + 1);
  return { from: prevFrom, to: prevTo };
}

export function useMetaAds(clientId: string, dateRange: DateRange, withComparison = true) {
  const [connection, setConnection] = useState<MetaConnection | null>(null);
  const [accountRows, setAccountRows] = useState<MetaInsightRow[]>([]);
  const [prevAccountRows, setPrevAccountRows] = useState<MetaInsightRow[]>([]);
  const [campaignRows, setCampaignRows] = useState<MetaCampaignRow[]>([]);
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

      // Fetch account-level insights for current period
      const { data: accData, error: accErr } = await supabase
        .from('meta_daily_insights')
        .select('*')
        .eq('client_id', clientId)
        .eq('level', 'account')
        .gte('date', fromStr)
        .lte('date', toStr)
        .order('date');
      if (accErr) throw accErr;
      setAccountRows((accData || []) as MetaInsightRow[]);

      // Fetch campaign-level insights aggregated
      const { data: campData, error: campErr } = await supabase
        .from('meta_daily_insights')
        .select('entity_id, entity_name, impressions, reach, clicks, spend, cpm, cpc, ctr, frequency, results, leads')
        .eq('client_id', clientId)
        .eq('level', 'campaign')
        .gte('date', fromStr)
        .lte('date', toStr);
      if (campErr) throw campErr;

      // Aggregate by campaign
      const campMap: Record<string, MetaCampaignRow> = {};
      (campData || []).forEach((row: any) => {
        if (!campMap[row.entity_id]) {
          campMap[row.entity_id] = { ...row, impressions: 0, reach: 0, clicks: 0, spend: 0, cpm: 0, cpc: 0, ctr: 0, frequency: 0, results: 0, leads: 0 };
        }
        campMap[row.entity_id].impressions += row.impressions;
        campMap[row.entity_id].reach += row.reach;
        campMap[row.entity_id].clicks += row.clicks;
        campMap[row.entity_id].spend += row.spend;
        campMap[row.entity_id].results += row.results;
        campMap[row.entity_id].leads += row.leads;
      });
      // Recompute derived metrics
      const camps = Object.values(campMap).map(c => ({
        ...c,
        ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
        cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
        cpm: c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0,
      }));
      setCampaignRows(camps);

      // Comparison period
      if (withComparison) {
        const prev = getPreviousPeriod(dateRange.from, dateRange.to);
        const { data: prevData } = await supabase
          .from('meta_daily_insights')
          .select('*')
          .eq('client_id', clientId)
          .eq('level', 'account')
          .gte('date', format(prev.from, 'yyyy-MM-dd'))
          .lte('date', format(prev.to, 'yyyy-MM-dd'))
          .order('date');
        setPrevAccountRows((prevData || []) as MetaInsightRow[]);
      }
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [clientId, fromStr, toStr, withComparison]);

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

  const kpis = sumKPIs(accountRows);
  const prevKpis = sumKPIs(prevAccountRows);

  return { connection, accountRows, campaignRows, kpis, prevKpis, loading, syncing, error, refetch: fetchData, syncNow };
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
