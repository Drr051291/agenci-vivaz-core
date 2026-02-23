import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Search, ChevronUp, ChevronDown, ArrowUpDown, ImageOff } from "lucide-react";
import type { MetaCampaignRow, MetaCreativeRow } from "./useMetaAdsByService";

const BRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const PCT = (v: number) => `${v.toFixed(2)}%`;
const NUM = (v: number) => v.toLocaleString('pt-BR');

/* ─── Column definitions ─── */

type CampaignSortKey = 'entity_name' | 'spend' | 'impressions' | 'clicks' | 'link_clicks' | 'landing_page_views' | 'ctr' | 'cpc' | 'cpm' | 'leads' | 'leads_native' | 'leads_landing_page' | 'cpl' | 'frequency';

interface CampCol {
  key: CampaignSortKey;
  label: string;
  format: (row: MetaCampaignRow) => string;
  getValue: (row: MetaCampaignRow) => number | string;
  right?: boolean;
}

const CAMPAIGN_COLUMNS: CampCol[] = [
  { key: 'entity_name', label: 'Campanha', format: r => r.entity_name, getValue: r => r.entity_name },
  { key: 'spend', label: 'Investimento', format: r => BRL(r.spend), getValue: r => r.spend, right: true },
  { key: 'impressions', label: 'Impressões', format: r => NUM(r.impressions), getValue: r => r.impressions, right: true },
  { key: 'clicks', label: 'Cliques', format: r => NUM(r.clicks), getValue: r => r.clicks, right: true },
  { key: 'link_clicks', label: 'Cl. Link', format: r => NUM(r.link_clicks || 0), getValue: r => r.link_clicks || 0, right: true },
  { key: 'landing_page_views', label: 'Views LP', format: r => NUM(r.landing_page_views || 0), getValue: r => r.landing_page_views || 0, right: true },
  { key: 'ctr', label: 'CTR', format: r => PCT(r.ctr), getValue: r => r.ctr, right: true },
  { key: 'cpc', label: 'CPC', format: r => BRL(r.cpc), getValue: r => r.cpc, right: true },
  { key: 'cpm', label: 'CPM', format: r => BRL(r.cpm), getValue: r => r.cpm, right: true },
  { key: 'leads', label: 'Leads', format: r => NUM(r.leads), getValue: r => r.leads, right: true },
  { key: 'leads_native', label: 'L. Nativo', format: r => NUM(r.leads_native || 0), getValue: r => r.leads_native || 0, right: true },
  { key: 'leads_landing_page', label: 'L. LP', format: r => NUM(r.leads_landing_page || 0), getValue: r => r.leads_landing_page || 0, right: true },
  { key: 'cpl', label: 'CPL', format: r => r.leads > 0 ? BRL(r.spend / r.leads) : '—', getValue: r => r.leads > 0 ? r.spend / r.leads : Infinity, right: true },
  { key: 'frequency', label: 'Freq.', format: r => r.frequency.toFixed(2), getValue: r => r.frequency, right: true },
];

type CreativeSortKey = 'entity_name' | 'campaign_name' | 'impressions' | 'clicks' | 'spend' | 'ctr' | 'leads';

interface CreativeCol {
  key: CreativeSortKey;
  label: string;
  format: (row: MetaCreativeRow) => string;
  getValue: (row: MetaCreativeRow) => number | string;
  right?: boolean;
}

const CREATIVE_COLUMNS: CreativeCol[] = [
  { key: 'entity_name', label: 'Anúncio', format: r => r.entity_name, getValue: r => r.entity_name },
  { key: 'campaign_name', label: 'Campanha', format: r => r.campaign_name || '—', getValue: r => r.campaign_name || '' },
  { key: 'impressions', label: 'Impressões', format: r => NUM(r.impressions), getValue: r => r.impressions, right: true },
  { key: 'clicks', label: 'Cliques', format: r => NUM(r.clicks), getValue: r => r.clicks, right: true },
  { key: 'spend', label: 'Investimento', format: r => BRL(r.spend), getValue: r => r.spend, right: true },
  { key: 'ctr', label: 'CTR', format: r => PCT(r.ctr), getValue: r => r.ctr, right: true },
  { key: 'leads', label: 'Leads', format: r => NUM(r.leads), getValue: r => r.leads, right: true },
];

const PAGE_SIZE = 15;

/* ─── Sort Icon ─── */
function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  return dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
}

/* ─── Generic sort/filter hook ─── */
function useSortedData<T>(
  data: T[],
  defaultSortKey: string,
  getValue: (row: T, key: string) => number | string,
  getSearchText: (row: T) => string,
) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(r => getSearchText(r).toLowerCase().includes(q));
  }, [data, search, getSearchText]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = getValue(a, sortKey);
      const bv = getValue(b, sortKey);
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [filtered, sortKey, sortDir, getValue]);

  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  const handleSort = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(0);
  };

  const handleSearch = (v: string) => { setSearch(v); setPage(0); };

  return { search, setSearch: handleSearch, sortKey, sortDir, page, setPage, sorted, paginated, totalPages, handleSort };
}

/* ─── Pagination Footer ─── */
function PaginationFooter({ total, page, totalPages, setPage, label }: {
  total: number; page: number; totalPages: number; setPage: (p: number) => void; label: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 text-sm text-muted-foreground">
      <span>{total} {label} · Página {page + 1} de {totalPages}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
        <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Próxima</Button>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

interface MetaServiceCampaignTableProps {
  campaignRows: MetaCampaignRow[];
  creativeRows: MetaCreativeRow[];
  loading: boolean;
}

export function MetaServiceCampaignTable({ campaignRows, creativeRows, loading }: MetaServiceCampaignTableProps) {
  // Campaign sort
  const campGetValue = useMemo(() => (row: MetaCampaignRow, key: string) => {
    const col = CAMPAIGN_COLUMNS.find(c => c.key === key);
    return col ? col.getValue(row) : 0;
  }, []);
  const campGetSearch = useMemo(() => (row: MetaCampaignRow) => row.entity_name, []);

  const camp = useSortedData(campaignRows, 'spend', campGetValue, campGetSearch);

  // Creative sort
  const creativeGetValue = useMemo(() => (row: MetaCreativeRow, key: string) => {
    const col = CREATIVE_COLUMNS.find(c => c.key === key);
    return col ? col.getValue(row) : 0;
  }, []);
  const creativeGetSearch = useMemo(() => (row: MetaCreativeRow) => `${row.entity_name} ${row.campaign_name || ''}`, []);

  const creative = useSortedData(creativeRows, 'impressions', creativeGetValue, creativeGetSearch);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card><CardContent className="p-6"><div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Campaigns Table ─── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">
              Campanhas Ativas <span className="text-muted-foreground font-normal">({campaignRows.length})</span>
            </CardTitle>
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar campanha..."
                value={camp.search}
                onChange={e => camp.setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {camp.sorted.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {camp.search ? 'Nenhuma campanha encontrada.' : 'Nenhuma campanha no período. Sincronize os dados.'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      {CAMPAIGN_COLUMNS.map(col => (
                        <TableHead
                          key={col.key}
                          className={`cursor-pointer select-none hover:text-foreground transition-colors text-xs ${col.right ? 'text-right' : ''}`}
                          onClick={() => camp.handleSort(col.key)}
                        >
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            <SortIcon active={camp.sortKey === col.key} dir={camp.sortDir} />
                          </span>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {camp.paginated.map(row => (
                      <TableRow key={row.entity_id} className="text-xs">
                        {CAMPAIGN_COLUMNS.map(col => (
                          <TableCell
                            key={col.key}
                            className={`text-xs py-2.5 ${col.right ? 'text-right font-mono tabular-nums' : 'font-medium max-w-48 truncate'}`}
                          >
                            {col.format(row)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <PaginationFooter total={camp.sorted.length} page={camp.page} totalPages={camp.totalPages} setPage={camp.setPage} label="campanhas" />
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Creatives Table ─── */}
      {creativeRows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-base">
                  Criativos Campeões <span className="text-muted-foreground font-normal">({creativeRows.length})</span>
                </CardTitle>
              </div>
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar criativo..."
                  value={creative.search}
                  onChange={e => creative.setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {creative.sorted.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Nenhum criativo encontrado.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                       <TableRow className="hover:bg-transparent">
                         <TableHead className="text-xs w-10">#</TableHead>
                         <TableHead className="text-xs w-16">Preview</TableHead>
                        {CREATIVE_COLUMNS.map(col => (
                          <TableHead
                            key={col.key}
                            className={`cursor-pointer select-none hover:text-foreground transition-colors text-xs ${col.right ? 'text-right' : ''}`}
                            onClick={() => creative.handleSort(col.key)}
                          >
                            <span className="inline-flex items-center gap-1">
                              {col.label}
                              <SortIcon active={creative.sortKey === col.key} dir={creative.sortDir} />
                            </span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creative.paginated.map((row, i) => {
                        const rank = creative.page * PAGE_SIZE + i;
                        return (
                          <TableRow key={row.entity_id} className="text-xs">
                            <TableCell className="py-2.5">
                              <Badge
                                variant={rank === 0 ? "default" : rank === 1 ? "secondary" : "outline"}
                                className="text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full"
                              >
                                {rank + 1}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-1.5">
                              {row.thumbnail_url ? (
                                <div className="w-10 h-10 rounded border border-border/60 overflow-hidden bg-muted flex items-center justify-center">
                                  <img
                                    src={row.thumbnail_url}
                                    alt={row.entity_name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-muted-foreground"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></span>';
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded border border-border/40 bg-muted/50 flex items-center justify-center">
                                  <ImageOff className="h-4 w-4 text-muted-foreground/50" />
                                </div>
                              )}
                            </TableCell>
                            {CREATIVE_COLUMNS.map(col => (
                              <TableCell
                                key={col.key}
                                className={`text-xs py-2.5 ${col.right ? 'text-right font-mono tabular-nums' : col.key === 'campaign_name' ? 'max-w-40 truncate text-muted-foreground' : 'font-medium max-w-48 truncate'}`}
                              >
                                {col.format(row)}
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <PaginationFooter total={creative.sorted.length} page={creative.page} totalPages={creative.totalPages} setPage={creative.setPage} label="criativos" />
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
