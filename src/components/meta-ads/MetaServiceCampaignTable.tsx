import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy } from "lucide-react";
import type { MetaCampaignRow, MetaCreativeRow } from "./useMetaAdsByService";

const BRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const PCT = (v: number) => `${v.toFixed(2)}%`;

interface MetaServiceCampaignTableProps {
  campaignRows: MetaCampaignRow[];
  creativeRows: MetaCreativeRow[];
  loading: boolean;
}

export function MetaServiceCampaignTable({ campaignRows, creativeRows, loading }: MetaServiceCampaignTableProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Campaigns Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Campanhas Ativas no Período ({campaignRows.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {campaignRows.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">Nenhuma campanha encontrada. Sincronize os dados.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Campanha</TableHead>
                    <TableHead className="text-xs text-right">Invest.</TableHead>
                    <TableHead className="text-xs text-right">Impressões</TableHead>
                    <TableHead className="text-xs text-right">Cliques</TableHead>
                    <TableHead className="text-xs text-right">Cl. Link</TableHead>
                    <TableHead className="text-xs text-right">Views LP</TableHead>
                    <TableHead className="text-xs text-right">CTR</TableHead>
                    <TableHead className="text-xs text-right">CPC</TableHead>
                    <TableHead className="text-xs text-right">CPM</TableHead>
                    <TableHead className="text-xs text-right">Leads</TableHead>
                    <TableHead className="text-xs text-right">L. Nativo</TableHead>
                    <TableHead className="text-xs text-right">L. LP</TableHead>
                    <TableHead className="text-xs text-right">CPL</TableHead>
                    <TableHead className="text-xs text-right">Freq.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignRows.map(row => {
                    const cpl = row.leads > 0 ? row.spend / row.leads : 0;
                    return (
                      <TableRow key={row.entity_id} className="text-xs">
                        <TableCell className="font-medium max-w-48 truncate">{row.entity_name}</TableCell>
                        <TableCell className="text-right">{BRL(row.spend)}</TableCell>
                        <TableCell className="text-right">{row.impressions.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right">{row.clicks.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right">{(row.link_clicks || 0).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right">{(row.landing_page_views || 0).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right">{PCT(row.ctr)}</TableCell>
                        <TableCell className="text-right">{BRL(row.cpc)}</TableCell>
                        <TableCell className="text-right">{BRL(row.cpm)}</TableCell>
                        <TableCell className="text-right font-medium">{row.leads}</TableCell>
                        <TableCell className="text-right">{row.leads_native || 0}</TableCell>
                        <TableCell className="text-right">{row.leads_landing_page || 0}</TableCell>
                        <TableCell className="text-right">{cpl > 0 ? BRL(cpl) : '—'}</TableCell>
                        <TableCell className="text-right">{row.frequency.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Creatives */}
      {creativeRows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base">Criativos Campeões (Top por Impressões)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Anúncio</TableHead>
                    <TableHead className="text-xs">Campanha</TableHead>
                    <TableHead className="text-xs text-right">Impressões</TableHead>
                    <TableHead className="text-xs text-right">Cliques</TableHead>
                    <TableHead className="text-xs text-right">Invest.</TableHead>
                    <TableHead className="text-xs text-right">CTR</TableHead>
                    <TableHead className="text-xs text-right">Leads</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creativeRows.map((row, i) => (
                    <TableRow key={row.entity_id} className="text-xs">
                      <TableCell>
                        <Badge variant={i === 0 ? "default" : i === 1 ? "secondary" : "outline"} className="text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">
                          {i + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-48 truncate">{row.entity_name}</TableCell>
                      <TableCell className="max-w-40 truncate text-muted-foreground">{row.campaign_name || '—'}</TableCell>
                      <TableCell className="text-right">{row.impressions.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right">{row.clicks.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right">{BRL(row.spend)}</TableCell>
                      <TableCell className="text-right">{PCT(row.ctr)}</TableCell>
                      <TableCell className="text-right font-medium">{row.leads}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
