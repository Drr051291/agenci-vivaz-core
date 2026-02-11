import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const API_TOKEN = Deno.env.get('PIPEDRIVE_API_KEY') || ''
const SB_URL = Deno.env.get('SUPABASE_URL') || ''
const SB_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
const AFTER = '2025-10-01'
const TTL = { s: 21600, t: 600, d: 300 }

type LS = 'Landing Page' | 'Base Sétima' | 'Lead Nativo'

const cache = async (sb: any, k: string) => { const { data } = await sb.from('pipedrive_cache').select('*').eq('key', k).single(); if (!data) return null; return (Date.now() - new Date(data.fetched_at).getTime()) / 1000 > data.ttl_seconds ? null : data.payload }
const setC = async (sb: any, k: string, p: any, t: number) => { await sb.from('pipedrive_cache').upsert({ key: k, payload: p, fetched_at: new Date().toISOString(), ttl_seconds: t }, { onConflict: 'key' }) }

const pd = async (ep: string, pm: Record<string, string> = {}) => {
  const u = new URL(`https://api.pipedrive.com${ep}`); u.searchParams.set('api_token', API_TOKEN)
  Object.entries(pm).forEach(([k, v]) => u.searchParams.set(k, v))
  const r = await fetch(u.toString()); if (!r.ok) throw new Error(`API error: ${r.status}`); return r.json()
}

const fetchD = async (pid: number, st?: string) => {
  const d: any[] = []; let s = 0, m = true
  while (m && s <= 5000) { const p: any = { pipeline_id: pid.toString(), limit: '500', start: s.toString() }; if (st) p.status = st; const r = await pd('/v1/deals', p); d.push(...(r?.data || [])); m = r?.additional_data?.pagination?.more_items_in_collection || false; s += 500 }
  return d
}

const getStages = async (sb: any, pid: number, f: boolean) => { const k = `st_${pid}`; if (!f) { const c = await cache(sb, k); if (c) return c }; const r = await pd('/api/v2/stages', { pipeline_id: pid.toString(), limit: '100' }); const st = (r.data || []).map((s: any) => ({ id: s.id, name: s.name, order_nr: s.order_nr })); await setC(sb, k, st, TTL.s); return st }
const getConv = async (sb: any, pid: number, sd: string, ed: string, f: boolean) => { const k = `cv_${pid}_${sd}_${ed}`; if (!f) { const c = await cache(sb, k); if (c) return c }; const r = await pd(`/v1/pipelines/${pid}/conversion_statistics`, { start_date: sd, end_date: ed }); await setC(sb, k, r, TTL.t); return r }
const getDPS = async (sb: any, pid: number, st: any[], f: boolean) => { const k = `dp_${pid}`; if (!f) { const c = await cache(sb, k); if (c) return c }; const res: Record<number, number> = {}; for (const s of st) { const r = await pd('/api/v2/deals', { pipeline_id: pid.toString(), stage_id: s.id.toString(), status: 'open', limit: '500' }); res[s.id] = r?.data?.length || 0 }; await setC(sb, k, res, TTL.d); return res }

const getArr = async (sb: any, pid: number, st: any[], sd: string, ed: string, f: boolean) => {
  const k = `ar_${pid}_${sd}_${ed}`; if (!f) { const c = await cache(sb, k); if (c) return c }
  const all = await fetchD(pid), flt = all.filter((d: any) => d.add_time?.split('T')[0] >= AFTER), ip = flt.filter((d: any) => { const dt = d.add_time?.split('T')[0] || ''; return dt >= sd && dt <= ed })
  const srt = [...st].sort((a, b) => a.order_nr - b.order_nr), arr: Record<number, number> = {}
  if (srt.length > 0) { arr[srt[0].id] = ip.length; for (let i = 1; i < srt.length; i++) arr[srt[i].id] = ip.filter((d: any) => srt.findIndex(s => s.id === d.stage_id) >= i).length }
  const res = { arrivals: arr, total: ip.length }; await setC(sb, k, res, TTL.t); return res
}

const getTK = async (sb: any, f: boolean) => { const k = 'tk4'; if (!f) { const c = await cache(sb, k); if (c) return c }; const r = await pd('/v1/dealFields'); const fds = r?.data || []; const used = new Set<string>(); const fn = (vs: string[]) => { for (const v of vs) { const m = fds.find((x: any) => x.name.toLowerCase().includes(v.toLowerCase()) && !used.has(x.key)); if (m) { used.add(m.key); return m.key } }; return null }; const res = { campaign: fn(['Campanha']), adset: fn(['Conjunto']), creative: fn(['Anuncio', 'Anúncio']) }; await setC(sb, k, res, TTL.s); return res }
const getLb = async (sb: any, f: boolean) => { const k = 'lb'; if (!f) { const c = await cache(sb, k); if (c) return c }; const r = await pd('/v1/dealFields'); const lf = r?.data?.find((x: any) => x.key === 'label'); const lb = lf?.options?.map((o: any) => ({ id: o.id, name: o.label })) || []; await setC(sb, k, lb, TTL.s); return lb }
const getSK = async (sb: any, pid: number, f: boolean) => { const k = `sk_${pid}`; if (!f) { const c = await cache(sb, k); if (c) return c }; const r = await pd('/v1/dealFields'); const vs = pid === 9 ? ['Segmento'] : pid === 13 ? ['setor'] : ['Segmento', 'Setor']; for (const v of vs) { const m = r?.data?.find((x: any) => x.name.toLowerCase().includes(v.toLowerCase())); if (m) { await setC(sb, k, m.key, TTL.s); return m.key } }; await setC(sb, k, null, TTL.s); return null }
const getLost = async (sb: any, pid: number, sd: string, ed: string, f: boolean) => { const k = `ls_${pid}_${sd}_${ed}`; if (!f) { const c = await cache(sb, k); if (c) return c }; const all = await fetchD(pid, 'lost'), ip = all.filter((d: any) => { const dt = d.lost_time?.substring(0, 10) || ''; return dt >= sd && dt <= ed }); const tot: Record<string, number> = {}, bs: Record<number, Record<string, number>> = {}; ip.forEach((d: any) => { const r = d.lost_reason || 'Não informado'; tot[r] = (tot[r] || 0) + 1; if (d.stage_id) { bs[d.stage_id] = bs[d.stage_id] || {}; bs[d.stage_id][r] = (bs[d.stage_id][r] || 0) + 1 } }); const res = { total: tot, by_stage: bs }; await setC(sb, k, res, TTL.d); return res }

const getTrk = async (sb: any, pid: number, sd: string | null, ed: string | null, f: boolean, ty: string, sn: boolean) => {
  const sfx = sn ? '_sn' : `_${sd}_${ed}`, k = `${ty}_${pid}${sfx}`; if (!f) { const c = await cache(sb, k); if (c) return c }
  const st = await getStages(sb, pid, f), vi = new Set(st.map((s: any) => s.id)); let dl = await fetchD(pid, sn ? 'open' : undefined)
  dl = dl.filter((d: any) => d.stage_id && vi.has(d.stage_id)); if (!sn && sd && ed) dl = dl.filter((d: any) => { const dt = d.add_time?.split('T')[0] || ''; return dt >= AFTER && dt >= sd && dt <= ed })
  let res: any
  if (ty === 'campaign') { const ks = await getTK(sb, f); const bC: any = {}, bA: any = {}, bCr: any = {}; dl.forEach((d: any) => { const c = (ks.campaign ? d[ks.campaign] : null) || 'Não informado', a = (ks.adset ? d[ks.adset] : null) || 'Não informado', cr = (ks.creative ? d[ks.creative] : null) || 'Não informado', sid = d.stage_id || 0; [{ x: c, o: bC }, { x: a, o: bA }, { x: cr, o: bCr }].forEach(({ x, o }) => { o[x] = o[x] || { total: 0, by_stage: {} }; o[x].total++; o[x].by_stage[sid] = (o[x].by_stage[sid] || 0) + 1 }) }); res = { by_campaign: bC, by_adset: bA, by_creative: bCr, field_keys: ks } }
  else if (ty === 'source') { const lb = await getLb(sb, f), bid = lb.find((l: any) => l.name.toUpperCase().includes('BASE SETIMA'))?.id; const bS: Record<LS, { total: number; by_stage: Record<number, number> }> = { 'Landing Page': { total: 0, by_stage: {} }, 'Base Sétima': { total: 0, by_stage: {} }, 'Lead Nativo': { total: 0, by_stage: {} } }; dl.forEach((d: any) => { const src: LS = d.title?.includes('[Lead Site]') || d.title?.startsWith('Lead Site') ? 'Landing Page' : bid && String(d.label) === String(bid) ? 'Base Sétima' : 'Lead Nativo'; const sid = d.stage_id || 0; bS[src].total++; bS[src].by_stage[sid] = (bS[src].by_stage[sid] || 0) + 1 }); res = { by_source: bS } }
  else { const sk = await getSK(sb, pid, f); const bS: any = {}; dl.forEach((d: any) => { const s = (sk ? d[sk] : null) || 'Não informado', sid = d.stage_id || 0; bS[s] = bS[s] || { total: 0, by_stage: {} }; bS[s].total++; bS[s].by_stage[sid] = (bS[s].by_stage[sid] || 0) + 1 }); res = { by_sector: bS, field_key: sk } }
  await setC(sb, k, res, TTL.d); return res
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  try {
    const sb = createClient(SB_URL, SB_KEY, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } })
    const { data: { user } } = await sb.auth.getUser(); if (!user) throw new Error('Not authenticated')
    const { action, pipeline_id: pid, start_date: sd, end_date: ed, force, stage_id: sid, view_mode: vm } = await req.json()
    if (!API_TOKEN) throw new Error('PIPEDRIVE_API_KEY not configured')
    const f = force === true

    if (action === 'get_stages') return new Response(JSON.stringify({ success: true, data: await getStages(sb, pid, f) }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    if (action === 'get_funnel_data') {
      const st = await getStages(sb, pid, f), srt = [...st].sort((a: any, b: any) => a.order_nr - b.order_nr)
      const [cv, dp, ar, ls] = await Promise.all([getConv(sb, pid, sd, ed, f), getDPS(sb, pid, srt, f), getArr(sb, pid, srt, sd, ed, f), getLost(sb, pid, sd, ed, f)])
      const cvs: any = {}, cm = new Map<string, number>(); (cv?.data?.stage_conversions || []).forEach((c: any) => cm.set(`${c.from_stage_id}_${c.to_stage_id}`, c.conversion_rate))
      for (let i = 0; i < srt.length - 1; i++) { const k = `${srt[i].id}_${srt[i + 1].id}`; cvs[k] = cm.get(k) ?? 0; const fr = ar.arrivals[srt[i].id] || 0, to = ar.arrivals[srt[i + 1].id] || 0; if (fr > 0) cvs[k] = Math.round((to / fr) * 100) }
      return new Response(JSON.stringify({ success: true, data: { stages: srt.slice(0, 5), all_stages: srt, conversions: cvs, leads_count: ar.total, stage_counts: dp, stage_arrivals: ar.arrivals, lost_reasons: ls, fetched_at: new Date().toISOString() } }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    if (action.startsWith('get_campaign')) { const sn = action.includes('snapshot'); const d = await getTrk(sb, pid, sn ? null : sd, sn ? null : ed, f, 'campaign', sn); return new Response(JSON.stringify({ success: true, data: { ...d, all_stages: await getStages(sb, pid, false), fetched_at: new Date().toISOString() } }), { headers: { ...cors, 'Content-Type': 'application/json' } }) }
    if (action.startsWith('get_lead_source')) { const sn = action.includes('snapshot'); const d = await getTrk(sb, pid, sn ? null : sd, sn ? null : ed, f, 'source', sn); return new Response(JSON.stringify({ success: true, data: { ...d, all_stages: await getStages(sb, pid, false), fetched_at: new Date().toISOString() } }), { headers: { ...cors, 'Content-Type': 'application/json' } }) }
    if (action.startsWith('get_sector')) { const sn = action.includes('snapshot'); const d = await getTrk(sb, pid, sn ? null : sd, sn ? null : ed, f, 'sector', sn); return new Response(JSON.stringify({ success: true, data: { ...d, all_stages: await getStages(sb, pid, false), fetched_at: new Date().toISOString() } }), { headers: { ...cors, 'Content-Type': 'application/json' } }) }
    if (action === 'get_stage_deals') {
      if (!sid) throw new Error('stage_id is required'); const ks = await getTK(sb, false); const r = await pd('/v1/deals', { pipeline_id: pid.toString(), stage_id: sid.toString(), status: 'open', limit: '100' }); let dl = r?.data || []
      if (vm === 'period' && sd && ed) dl = dl.filter((d: any) => { const dt = d.add_time?.split('T')[0] || ''; return dt >= AFTER && dt >= sd && dt <= ed })
      dl.sort((a: any, b: any) => (b.add_time ? new Date(b.add_time).getTime() : 0) - (a.add_time ? new Date(a.add_time).getTime() : 0))
      const cls = (d: any): LS => { const t = d.title?.toLowerCase() || ''; if (t.includes('[lead site]') || t.startsWith('lead site')) return 'Landing Page'; if (typeof d.label === 'string' && d.label.toLowerCase().includes('base setima')) return 'Base Sétima'; return 'Lead Nativo' }
      const en = dl.map((d: any) => ({ id: d.id, title: d.title, person_name: d.person_name || null, org_name: d.org_name || null, add_time: d.add_time, value: d.value || 0, lead_source: cls(d), campaign: ks.campaign ? (d[ks.campaign] || null) : null, adset: ks.adset ? (d[ks.adset] || null) : null, creative: ks.creative ? (d[ks.creative] || null) : null }))
      return new Response(JSON.stringify({ success: true, data: en }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    throw new Error(`Unknown action: ${action}`)
  } catch (e) { console.error('Error:', e); return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }), { headers: { ...cors, 'Content-Type': 'application/json' }, status: 400 }) }
})
