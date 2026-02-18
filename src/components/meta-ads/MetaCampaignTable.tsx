import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronUp, ChevronDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MetaCampaignRow } from "./useMetaAds";

type SortKey = keyof MetaCampaignRow;
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortKey; label: string; format: (v: any) => string; right?: boolean }[] = [
  { key: 'entity_name', label: 'Campanha', format: v => v },
  { key: 'spend', label: 'Investimento', format: v => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, right: true },
  { key: 'impressions', label: 'Impressões', format: v => Number(v).toLocaleString('pt-BR'), right: true },
  { key: 'clicks', label: 'Cliques', format: v => Number(v).toLocaleString('pt-BR'), right: true },
  { key: 'ctr', label: 'CTR', format: v => `${Number(v).toFixed(2)}%`, right: true },
  { key: 'cpc', label: 'CPC', format: v => `R$ ${Number(v).toFixed(2)}`, right: true },
  { key: 'cpm', label: 'CPM', format: v => `R$ ${Number(v).toFixed(2)}`, right: true },
  { key: 'leads', label: 'Leads', format: v => Number(v).toLocaleString('pt-BR'), right: true },
];

const PAGE_SIZE = 25;

interface Props {
  rows: MetaCampaignRow[];
  loading: boolean;
}

export function MetaCampaignTable({ rows, loading }: Props) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('spend');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(r => r.entity_name.toLowerCase().includes(q));
  }, [rows, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] as any;
      const bv = b[sortKey] as any;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [filtered, sortKey, sortDir]);

  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(0);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base">Campanhas</CardTitle>
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar campanha..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {search ? 'Nenhuma campanha encontrada para esta busca.' : 'Sem dados de campanhas no período.'}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {COLUMNS.map(col => (
                    <TableHead
                      key={col.key}
                      className={`cursor-pointer select-none hover:text-foreground ${col.right ? 'text-right' : ''}`}
                      onClick={() => handleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortKey === col.key
                          ? sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          : <ChevronDown className="h-3 w-3 opacity-30" />}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((row) => (
                  <TableRow key={row.entity_id} className="hover:bg-muted/30">
                    {COLUMNS.map(col => (
                      <TableCell key={col.key} className={`text-sm ${col.right ? 'text-right font-mono' : 'font-medium'}`}>
                        {col.format(row[col.key])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                <span>{sorted.length} campanhas · Página {page + 1} de {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
