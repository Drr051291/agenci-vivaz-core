import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, TrendingDown, Sparkles, Info, Ban, Zap } from 'lucide-react';
import { StageImpact } from '@/lib/insideSalesMatrix/impact';
import { ConfidenceScoreResult } from '@/lib/insideSalesMatrix/confidenceScore';
import { ConfidenceChip } from './ConfidenceChip';
import { PlaybookAction } from '@/lib/insideSalesMatrix/actionPlaybook';
import { cn } from '@/lib/utils';

interface DecisionPanelBR2025Props {
  gargalo1: StageImpact | null;
  gargalo2: StageImpact | null;
  impacts: StageImpact[];
  confidence: ConfidenceScoreResult;
  eligibleStages: string[];
  hasMediaData: boolean;
  playbookActions: PlaybookAction[];
  onOpenCopilot: () => void;
  canUseAI: boolean;
}

export function DecisionPanelBR2025({
  gargalo1,
  gargalo2,
  impacts,
  confidence,
  eligibleStages,
  hasMediaData,
  playbookActions,
  onOpenCopilot,
  canUseAI,
}: DecisionPanelBR2025Props) {
  const eligibleGaps = impacts
    .filter(i => eligibleStages.includes(i.stageId) && i.gapPp !== undefined && i.gapPp < 0)
    .sort((a, b) => (a.gapPp ?? 0) - (b.gapPp ?? 0))
    .slice(0, 2);

  const noEligibleStages = eligibleStages.length === 0;
  const lowConfidence = confidence.score < 50;
  
  // Split actions by type
  const midiaActions = playbookActions.filter(a => a.type === 'midia').slice(0, 2);
  const processoActions = playbookActions.filter(a => a.type === 'processo').slice(0, 2);

  return (
    <Card className="sticky top-24 h-fit">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Painel de Decisão</CardTitle>
          <ConfidenceChip confidence={confidence} size="sm" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* No data warning */}
        {noEligibleStages && (
          <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg text-xs">
            <Ban className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Sem dados suficientes</p>
              <p className="text-muted-foreground mt-0.5">
                Preencha o funil para diagnóstico
              </p>
            </div>
          </div>
        )}

        {/* Gargalo Principal */}
        {!noEligibleStages && (
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Gargalo Principal
            </h4>
            {gargalo1 && eligibleStages.includes(gargalo1.stageId) && confidence.score >= 50 ? (
              <div className="flex items-start gap-2 p-2 bg-destructive/5 border border-destructive/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">{gargalo1.stageName}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{gargalo1.current.rate?.toFixed(1)}%</span>
                    <span>→</span>
                    <span>{gargalo1.target.rate.toFixed(1)}%</span>
                    {gargalo1.gapPp !== undefined && (
                      <Badge variant="outline" className="text-destructive border-destructive/30 text-[9px] h-4">
                        {gargalo1.gapPp > 0 ? '+' : ''}{gargalo1.gapPp.toFixed(1)}pp
                      </Badge>
                    )}
                  </div>
                  {gargalo1.impact && (
                    <p className="text-xs text-primary mt-1 font-medium">
                      {gargalo1.impact.description}
                    </p>
                  )}
                </div>
              </div>
            ) : lowConfidence ? (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg text-xs">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Confiança baixa para gargalo</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground p-2">Nenhum gargalo crítico</p>
            )}
          </div>
        )}

        {/* Top Gaps - compact */}
        {eligibleGaps.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Maiores Gaps
            </h4>
            <div className="space-y-1">
              {eligibleGaps.map((gap) => (
                <div key={gap.stageId} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                  <span className="text-muted-foreground truncate">{gap.stageName}</span>
                  <Badge variant="outline" className="shrink-0 text-destructive border-destructive/30 text-[9px] h-4">
                    <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                    {gap.gapPp?.toFixed(1)}pp
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alavancas Split: Mídia vs Processo */}
        {!noEligibleStages && (
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Alavancas
            </h4>
            <div className="grid grid-cols-2 gap-1.5">
              {/* Mídia */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      'p-2 rounded-lg border text-xs cursor-default',
                      hasMediaData 
                        ? 'bg-blue-500/5 border-blue-500/20' 
                        : 'bg-muted/50 border-muted'
                    )}>
                      <p className="font-semibold text-blue-600">Mídia</p>
                      {midiaActions.length > 0 ? (
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                          {midiaActions[0].title}
                        </p>
                      ) : hasMediaData ? (
                        <p className="text-[10px] text-emerald-600">OK</p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">Sem dados</p>
                      )}
                    </div>
                  </TooltipTrigger>
                  {!hasMediaData && (
                    <TooltipContent className="text-xs">
                      Complete dados de mídia paga
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
                <p className="font-semibold text-purple-600">Processo</p>
                {processoActions.length > 0 ? (
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                    {processoActions[0].title}
                  </p>
                ) : eligibleStages.length > 0 ? (
                  <p className="text-[10px] text-emerald-600">OK</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">Preencha funil</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI Button */}
        <Button
          className="w-full"
          size="sm"
          onClick={onOpenCopilot}
          disabled={!canUseAI || confidence.score < 40 || noEligibleStages}
        >
          <Sparkles className="h-4 w-4 mr-1.5" />
          Gerar plano com IA
        </Button>
        {confidence.score < 40 && !noEligibleStages && (
          <p className="text-[10px] text-center text-muted-foreground">
            Confiança mínima de 40 necessária
          </p>
        )}
      </CardContent>
    </Card>
  );
}
