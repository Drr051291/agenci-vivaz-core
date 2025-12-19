import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, BarChart3, ListChecks, Sparkles, TrendingDown } from 'lucide-react';
import { StageImpact } from '@/lib/insideSalesMatrix/impact';
import { ConfidenceScoreResult } from '@/lib/insideSalesMatrix/confidenceScore';
import { ActionItemV2 } from './ActionPlanV2';
import { cn } from '@/lib/utils';

interface MobileBottomBarProps {
  gargalo1: StageImpact | null;
  impacts: StageImpact[];
  confidence: ConfidenceScoreResult;
  eligibleStages: string[];
  actionItems: ActionItemV2[];
  onOpenCopilot: () => void;
  canUseAI: boolean;
}

type SheetView = 'summary' | 'bottlenecks' | 'plan';

export function MobileBottomBar({
  gargalo1,
  impacts,
  confidence,
  eligibleStages,
  actionItems,
  onOpenCopilot,
  canUseAI,
}: MobileBottomBarProps) {
  const [activeSheet, setActiveSheet] = useState<SheetView | null>(null);

  const pendingActions = actionItems.filter(a => a.status !== 'Concluído').length;
  const criticalStages = impacts.filter(i => 
    i.status === 'critico' && eligibleStages.includes(i.stageId)
  ).length;

  const buttons = [
    {
      id: 'summary' as SheetView,
      icon: BarChart3,
      label: 'Resumo',
      badge: confidence.score,
      badgeVariant: confidence.level === 'baixa' ? 'destructive' : 'secondary',
    },
    {
      id: 'bottlenecks' as SheetView,
      icon: AlertTriangle,
      label: 'Gargalos',
      badge: criticalStages > 0 ? criticalStages : undefined,
      badgeVariant: 'destructive',
    },
    {
      id: 'plan' as SheetView,
      icon: ListChecks,
      label: 'Plano',
      badge: pendingActions > 0 ? pendingActions : undefined,
      badgeVariant: 'secondary',
    },
  ];

  return (
    <>
      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/95 backdrop-blur-sm border-t safe-area-inset-bottom">
        <div className="flex items-center justify-around p-2 gap-1">
          {buttons.map(({ id, icon: Icon, label, badge, badgeVariant }) => (
            <Sheet key={id} open={activeSheet === id} onOpenChange={(open) => setActiveSheet(open ? id : null)}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 flex-col h-auto py-2 gap-1 relative"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{label}</span>
                  {badge !== undefined && (
                    <Badge
                      variant={badgeVariant as any}
                      className="absolute -top-0.5 -right-0.5 h-4 min-w-4 text-[10px] px-1"
                    >
                      {badge}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[60vh] overflow-y-auto">
                <SheetHeader className="pb-4">
                  <SheetTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {label}
                  </SheetTitle>
                </SheetHeader>
                {id === 'summary' && <SummaryContent confidence={confidence} gargalo1={gargalo1} eligibleStages={eligibleStages} />}
                {id === 'bottlenecks' && <BottlenecksContent impacts={impacts} eligibleStages={eligibleStages} />}
                {id === 'plan' && <PlanContent actionItems={actionItems} />}
              </SheetContent>
            </Sheet>
          ))}

          {/* IA Button */}
          <Button
            size="sm"
            className="flex-col h-auto py-2 gap-1"
            onClick={onOpenCopilot}
            disabled={!canUseAI || confidence.score < 40}
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-xs">IA</span>
          </Button>
        </div>
      </div>

      {/* Spacer for bottom bar */}
      <div className="h-20 lg:hidden" />
    </>
  );
}

function SummaryContent({ 
  confidence, 
  gargalo1,
  eligibleStages 
}: { 
  confidence: ConfidenceScoreResult; 
  gargalo1: StageImpact | null;
  eligibleStages: string[];
}) {
  return (
    <div className="space-y-4">
      {/* Confidence */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Score de Confiança</h4>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                confidence.level === 'alta' && 'bg-green-500',
                confidence.level === 'media' && 'bg-yellow-500',
                confidence.level === 'baixa' && 'bg-destructive'
              )}
              style={{ width: `${confidence.score}%` }}
            />
          </div>
          <span className="font-mono font-medium">{confidence.score}/100</span>
        </div>
        {confidence.topPenalties.length > 0 && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            {confidence.topPenalties.map((p, i) => (
              <p key={i}>• {p.reason}</p>
            ))}
          </div>
        )}
      </div>

      {/* Gargalo */}
      {gargalo1 && eligibleStages.includes(gargalo1.stageId) && confidence.score >= 50 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Gargalo Principal</h4>
          <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
            <p className="font-medium">{gargalo1.stageName}</p>
            <p className="text-sm text-muted-foreground">
              {gargalo1.current.rate?.toFixed(1)}% vs {gargalo1.target.rate.toFixed(1)}% meta
            </p>
            {gargalo1.impact && (
              <p className="text-sm text-primary mt-1">
                {gargalo1.impact.description}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BottlenecksContent({ 
  impacts, 
  eligibleStages 
}: { 
  impacts: StageImpact[]; 
  eligibleStages: string[];
}) {
  const eligibleImpacts = impacts.filter(i => eligibleStages.includes(i.stageId));
  const criticalImpacts = eligibleImpacts.filter(i => i.status === 'critico');

  return (
    <div className="space-y-3">
      {criticalImpacts.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">Nenhum gargalo crítico identificado</p>
      ) : (
        criticalImpacts.map((impact) => (
          <div key={impact.stageId} className="p-3 border rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium">{impact.stageName}</span>
              <Badge variant="destructive" className="text-xs">
                <TrendingDown className="h-3 w-3 mr-1" />
                {impact.gapPp?.toFixed(1)}pp
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Atual: {impact.current.rate?.toFixed(1)}% | Meta: {impact.target.rate.toFixed(1)}%
            </p>
            {impact.impact && (
              <p className="text-sm text-primary">{impact.impact.description}</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function PlanContent({ actionItems }: { actionItems: ActionItemV2[] }) {
  const pending = actionItems.filter(a => a.status !== 'Concluído');
  const byType = {
    midia: pending.filter(a => a.type === 'midia'),
    processo: pending.filter(a => a.type === 'processo'),
  };

  return (
    <div className="space-y-4">
      {pending.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">Nenhuma ação pendente</p>
      ) : (
        <>
          {byType.midia.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400">Mídia ({byType.midia.length})</h4>
              {byType.midia.slice(0, 3).map((item) => (
                <div key={item.id} className="p-2 border rounded text-sm">
                  <p className="font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.stage}</p>
                </div>
              ))}
            </div>
          )}
          {byType.processo.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-purple-600 dark:text-purple-400">Processo ({byType.processo.length})</h4>
              {byType.processo.slice(0, 3).map((item) => (
                <div key={item.id} className="p-2 border rounded text-sm">
                  <p className="font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.stage}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
