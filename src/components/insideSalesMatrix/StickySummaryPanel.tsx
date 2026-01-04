import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, TrendingDown, Sparkles, Info, Ban } from 'lucide-react';
import { StageImpact } from '@/lib/insideSalesMatrix/impact';
import { ConfidenceScoreResult } from '@/lib/insideSalesMatrix/confidenceScore';
import { ConfidenceChip } from './ConfidenceChip';
import { cn } from '@/lib/utils';

interface StickySummaryPanelProps {
  gargalo1: StageImpact | null;
  gargalo2: StageImpact | null;
  impacts: StageImpact[];
  confidence: ConfidenceScoreResult;
  eligibleStages: string[];
  hasMediaData: boolean;
  onOpenCopilot: () => void;
  canUseAI: boolean;
}

export function StickySummaryPanel({
  gargalo1,
  gargalo2,
  impacts,
  confidence,
  eligibleStages,
  hasMediaData,
  onOpenCopilot,
  canUseAI,
}: StickySummaryPanelProps) {
  // Filter eligible impacts with gaps (only negative gaps)
  const eligibleGaps = impacts
    .filter(i => eligibleStages.includes(i.stageId) && i.gapPp !== undefined && i.gapPp < 0)
    .sort((a, b) => (a.gapPp ?? 0) - (b.gapPp ?? 0))
    .slice(0, 2);

  const noEligibleStages = eligibleStages.length === 0;
  const lowConfidence = confidence.score < 50;

  return (
    <Card className="sticky top-24 h-fit">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Resumo</CardTitle>
          <ConfidenceChip confidence={confidence} size="sm" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* No data warning */}
        {noEligibleStages && (
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
            <Ban className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Sem dados suficientes</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Preencha os dados do funil para ver o diagnóstico
              </p>
            </div>
          </div>
        )}

        {/* Gargalo Principal */}
        {!noEligibleStages && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Gargalo Principal
            </h4>
            {gargalo1 && eligibleStages.includes(gargalo1.stageId) && confidence.score >= 50 ? (
              <div className="flex items-start gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-medium text-sm">{gargalo1.stageName}</p>
                  <p className="text-xs text-muted-foreground">
                    {gargalo1.current.rate?.toFixed(1)}% vs {gargalo1.target.rate.toFixed(1)}% meta
                    {gargalo1.gapPp !== undefined && (
                      <span className="text-destructive ml-1">
                        ({gargalo1.gapPp > 0 ? '+' : ''}{gargalo1.gapPp.toFixed(1)}pp)
                      </span>
                    )}
                  </p>
                  {gargalo1.impact && (
                    <p className="text-xs text-primary mt-1 font-medium">
                      {gargalo1.impact.description}
                    </p>
                  )}
                </div>
              </div>
            ) : lowConfidence ? (
              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-muted-foreground text-xs">
                  Confiança baixa para identificar gargalo (amostra insuficiente)
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum gargalo crítico identificado</p>
            )}
          </div>
        )}

        {/* Top 2 Gaps */}
        {eligibleGaps.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Maiores Gaps
            </h4>
            <div className="space-y-1.5">
              {eligibleGaps.map((gap) => (
                <div key={gap.stageId} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate">{gap.stageName}</span>
                  <Badge variant="outline" className="shrink-0 text-destructive border-destructive/30">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {gap.gapPp?.toFixed(1)}pp
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alavancas */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Alavancas
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {/* Mídia */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    'p-2 rounded-lg border text-xs',
                    hasMediaData 
                      ? 'bg-blue-500/5 border-blue-500/20' 
                      : 'bg-muted/50 border-muted'
                  )}>
                    <p className="font-medium">Mídia</p>
                    {hasMediaData ? (
                      <p className="text-muted-foreground mt-0.5">CTR, CPC, CPL</p>
                    ) : (
                      <p className="text-muted-foreground mt-0.5">Dados pendentes</p>
                    )}
                  </div>
                </TooltipTrigger>
                {!hasMediaData && (
                  <TooltipContent>
                    Complete dados de mídia paga para recomendações
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            {/* Processo */}
            <div className={cn(
              'p-2 rounded-lg border text-xs',
              eligibleStages.length > 0 
                ? 'bg-purple-500/5 border-purple-500/20' 
                : 'bg-muted/50 border-muted'
            )}>
              <p className="font-medium">Processo</p>
              <p className="text-muted-foreground mt-0.5">
                {eligibleStages.length > 0 
                  ? `${eligibleStages.length} etapa${eligibleStages.length > 1 ? 's' : ''} elegível`
                  : 'Preencha funil'
                }
              </p>
            </div>
          </div>
        </div>

        {/* AI Button */}
        <Button
          className="w-full"
          onClick={onOpenCopilot}
          disabled={!canUseAI || confidence.score < 40 || noEligibleStages}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Gerar plano com IA
        </Button>
        {confidence.score < 40 && !noEligibleStages && (
          <p className="text-xs text-center text-muted-foreground">
            Confiança mínima de 40 necessária
          </p>
        )}
      </CardContent>
    </Card>
  );
}
