import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { MetaKPIs } from "./useMetaAdsByService";

interface KPIDef {
  key: keyof MetaKPIs;
  label: string;
  tip: string;
  format: (v: number) => string;
  invertDelta?: boolean;
}

const BRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const NUM = (v: number) => v.toLocaleString('pt-BR');
const PCT = (v: number) => `${v.toFixed(2)}%`;
const FLOAT = (v: number) => v.toFixed(2);

const KPIS: KPIDef[] = [
  { key: 'spend', label: 'Investimento', tip: 'Total gasto no período.', format: BRL },
  { key: 'impressions', label: 'Impressões', tip: 'Vezes que os anúncios foram exibidos.', format: NUM },
  { key: 'reach', label: 'Alcance', tip: 'Pessoas únicas que viram o anúncio.', format: NUM },
  { key: 'clicks', label: 'Cliques', tip: 'Total de cliques nos anúncios.', format: NUM },
  { key: 'link_clicks', label: 'Cliques no Link', tip: 'Cliques em links externos (outbound).', format: NUM },
  { key: 'landing_page_views', label: 'Views Destino', tip: 'Visualizações da página de destino.', format: NUM },
  { key: 'ctr', label: 'CTR', tip: 'Taxa de cliques: cliques ÷ impressões × 100.', format: PCT },
  { key: 'cpc', label: 'CPC', tip: 'Custo por clique.', format: BRL, invertDelta: true },
  { key: 'cpm', label: 'CPM', tip: 'Custo por mil impressões.', format: BRL, invertDelta: true },
  { key: 'frequency', label: 'Frequência', tip: 'Média de vezes que cada pessoa viu o anúncio.', format: FLOAT, invertDelta: true },
  { key: 'leads', label: 'Leads (Total)', tip: 'Total de leads gerados no período.', format: NUM },
  { key: 'leads_native', label: 'Leads Nativos', tip: 'Leads capturados via formulário nativo do Meta.', format: NUM },
  { key: 'leads_landing_page', label: 'Leads LP', tip: 'Leads capturados via pixel na landing page.', format: NUM },
  { key: 'cost_per_lead', label: 'Custo/Lead', tip: 'Investimento ÷ total de leads.', format: BRL, invertDelta: true },
  { key: 'cost_per_lead_native', label: 'CPL Nativo', tip: 'Custo por lead nativo (formulário Meta).', format: BRL, invertDelta: true },
  { key: 'cost_per_lead_lp', label: 'CPL Landing', tip: 'Custo por lead via landing page (pixel).', format: BRL, invertDelta: true },
  { key: 'active_campaigns', label: 'Campanhas', tip: 'Campanhas ativas no período selecionado.', format: NUM },
];

function pctDelta(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

interface MetaServiceKPIStripProps {
  kpis: MetaKPIs;
  prevKpis: MetaKPIs;
  loading: boolean;
  showComparison: boolean;
}

export function MetaServiceKPIStrip({ kpis, prevKpis, loading, showComparison }: MetaServiceKPIStripProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
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
