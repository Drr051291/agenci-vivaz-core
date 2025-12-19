import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingDown, Info } from "lucide-react";
import { StageImpact } from "@/lib/insideSalesMatrix/impact";
import { cn } from "@/lib/utils";

interface ScoreCardProps {
  impacts: StageImpact[];
  gargalo1: StageImpact | null;
  confidence: { level: 'alta' | 'media' | 'baixa'; label: string; description: string };
}

const statusConfig = {
  ok: { label: 'OK', color: 'bg-green-500' },
  atencao: { label: 'Atenção', color: 'bg-yellow-500' },
  critico: { label: 'Crítico', color: 'bg-red-500' },
  sem_dados: { label: '-', color: 'bg-muted' },
  baixa_amostra: { label: 'Baixa', color: 'bg-purple-500' },
};

const confidenceColors = {
  alta: 'bg-green-500/10 text-green-600 border-green-500/20',
  media: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  baixa: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export function ScoreCard({ impacts, gargalo1, confidence }: ScoreCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Score do Funil</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn("cursor-help", confidenceColors[confidence.level])}>
                  {confidence.label}
                  <Info className="h-3 w-3 ml-1" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-[200px]">{confidence.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stage scores - compact grid */}
        <div className="grid grid-cols-2 gap-2">
          {impacts.map((impact) => {
            const cfg = statusConfig[impact.status];
            return (
              <div 
                key={impact.stageId}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border",
                  impact.status === 'critico' && "border-red-500/30 bg-red-500/5",
                  impact.status === 'ok' && "border-green-500/30 bg-green-500/5",
                  impact.status === 'atencao' && "border-yellow-500/30 bg-yellow-500/5",
                  (impact.status === 'sem_dados' || impact.status === 'baixa_amostra') && "border-muted bg-muted/30"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.color)} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{impact.stageName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {impact.current.rate !== undefined ? `${impact.current.rate.toFixed(0)}%` : '-'} / {impact.target.rate.toFixed(0)}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main bottleneck */}
        {gargalo1 && (
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Gargalo principal</p>
            <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/20">
              <TrendingDown className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{gargalo1.stageName}</p>
                {gargalo1.impact && (
                  <p className="text-xs text-muted-foreground">
                    Impacto: {gargalo1.impact.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
