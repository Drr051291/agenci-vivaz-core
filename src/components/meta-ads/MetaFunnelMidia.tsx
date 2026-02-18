import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { MetaKPIs } from "./useMetaAds";

function rate(a: number, b: number) {
  if (b === 0) return 0;
  return (a / b) * 100;
}

interface Props {
  kpis: MetaKPIs;
  loading: boolean;
}

const STAGES = [
  { key: 'impressions' as keyof MetaKPIs, label: 'Impressões', color: 'bg-primary/20 border-primary/40 text-primary' },
  { key: 'clicks' as keyof MetaKPIs, label: 'Cliques', color: 'bg-amber-500/15 border-amber-500/40 text-amber-700' },
  { key: 'leads' as keyof MetaKPIs, label: 'Leads / Resultados', color: 'bg-green-500/15 border-green-500/40 text-green-700' },
];

export function MetaFunnelMidia({ kpis, loading }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Funil de Mídia</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {STAGES.map((stage, idx) => {
              const val = kpis[stage.key];
              const prev = idx > 0 ? kpis[STAGES[idx - 1].key] : null;
              const convRate = prev !== null ? rate(val, prev) : null;

              return (
                <div key={stage.key}>
                  {convRate !== null && (
                    <div className="flex justify-center items-center py-1">
                      <div className="flex flex-col items-center">
                        <div className="h-5 w-px bg-border" />
                        <span className="text-[11px] text-muted-foreground font-medium px-2 py-0.5 bg-muted rounded-full">
                          {convRate.toFixed(2)}% conversão
                        </span>
                      </div>
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-lg border",
                      stage.color
                    )}
                    style={{ width: `${100 - idx * 12}%`, marginLeft: `${idx * 6}%` }}
                  >
                    <span className="font-medium text-sm">{stage.label}</span>
                    <span className="font-bold text-sm">{Math.round(val).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
