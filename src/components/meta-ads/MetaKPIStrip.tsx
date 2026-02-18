import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { MetaKPIs } from "./useMetaAds";

interface KPIDef {
  key: keyof MetaKPIs;
  label: string;
  tip: string;
  format: (v: number) => string;
  invertDelta?: boolean; // lower is better
}

const KPIS: KPIDef[] = [
  { key: 'spend', label: 'Investimento', tip: 'Total gasto no período selecionado.', format: v => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  { key: 'impressions', label: 'Impressões', tip: 'Número de vezes que seus anúncios foram exibidos.', format: v => v.toLocaleString('pt-BR') },
  { key: 'reach', label: 'Alcance', tip: 'Número de pessoas únicas que viram seu anúncio.', format: v => v.toLocaleString('pt-BR') },
  { key: 'clicks', label: 'Cliques', tip: 'Total de cliques nos anúncios.', format: v => v.toLocaleString('pt-BR') },
  { key: 'ctr', label: 'CTR', tip: 'Taxa de cliques: cliques ÷ impressões × 100.', format: v => `${v.toFixed(2)}%` },
  { key: 'cpc', label: 'CPC', tip: 'Custo por clique: investimento ÷ cliques.', format: v => `R$ ${v.toFixed(2)}`, invertDelta: true },
  { key: 'cpm', label: 'CPM', tip: 'Custo por mil impressões: investimento ÷ impressões × 1000.', format: v => `R$ ${v.toFixed(2)}`, invertDelta: true },
  { key: 'frequency', label: 'Frequência', tip: 'Média de vezes que cada pessoa viu o anúncio.', format: v => v.toFixed(2), invertDelta: true },
  { key: 'leads', label: 'Leads', tip: 'Total de leads gerados conforme mapeamento de ações da Meta.', format: v => v.toLocaleString('pt-BR') },
];

function pctDelta(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

interface MetaKPIStripProps {
  kpis: MetaKPIs;
  prevKpis: MetaKPIs;
  loading: boolean;
  showComparison: boolean;
}

export function MetaKPIStrip({ kpis, prevKpis, loading, showComparison }: MetaKPIStripProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
        {KPIS.map(k => (
          <Card key={k.key}>
            <CardContent className="p-4">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-6 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
      {KPIS.map(({ key, label, tip, format, invertDelta }) => {
        const val = kpis[key];
        const prevVal = prevKpis[key];
        const delta = showComparison ? pctDelta(val, prevVal) : null;
        const isPositive = delta !== null && (invertDelta ? delta < 0 : delta > 0);
        const isNegative = delta !== null && (invertDelta ? delta > 0 : delta < 0);

        return (
          <Card key={key}>
            <CardContent className="p-4">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-xs text-muted-foreground font-medium truncate">{label}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground/60 flex-shrink-0 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-48">
                    <p className="text-xs">{tip}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-base font-bold text-foreground leading-tight">{format(val)}</p>
              {delta !== null && (
                <div className={cn(
                  "flex items-center gap-0.5 mt-1",
                  isPositive && "text-emerald-600",
                  isNegative && "text-destructive",
                  !isPositive && !isNegative && "text-muted-foreground"
                )}>
                  {isPositive ? <TrendingUp className="h-3 w-3" /> : isNegative ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                  <span className="text-xs font-medium">{delta > 0 ? '+' : ''}{delta.toFixed(1)}%</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
