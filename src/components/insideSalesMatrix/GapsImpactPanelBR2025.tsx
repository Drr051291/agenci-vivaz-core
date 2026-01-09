import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StageImpact } from "@/lib/insideSalesMatrix/impact";
import { Plus, TrendingDown, TrendingUp, Minus, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface GapsImpactPanelBR2025Props {
  impacts: StageImpact[];
  onAddToActionPlan?: (action: { title: string; stage: string; type: 'midia' | 'processo' }) => void;
}

const statusConfig = {
  ok: { label: 'OK', bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20' },
  atencao: { label: 'Atenção', bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20' },
  critico: { label: 'Crítico', bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/20' },
  sem_dados: { label: '—', bg: 'bg-muted/50', text: 'text-muted-foreground', border: 'border-muted' },
  baixa_amostra: { label: 'N/A', bg: 'bg-violet-500/10', text: 'text-violet-600', border: 'border-violet-500/20' },
};

export function GapsImpactPanelBR2025({ impacts, onAddToActionPlan }: GapsImpactPanelBR2025Props) {
  
  const sendToPlan = (impact: StageImpact) => {
    if (!onAddToActionPlan) return;
    
    // Determine action type based on stage
    const type: 'midia' | 'processo' = impact.stageId === 'lead_to_mql' ? 'midia' : 'processo';
    
    onAddToActionPlan({
      title: `Melhorar ${impact.stageName}`,
      stage: impact.stageName,
      type,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Gaps & Impacto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <TooltipProvider>
          {impacts.map((impact) => {
            const config = statusConfig[impact.status];
            const canAddToPlan = impact.isEligible && 
                                 (impact.status === 'critico' || impact.status === 'atencao') &&
                                 onAddToActionPlan;
            
            return (
              <div 
                key={impact.stageId}
                className={cn(
                  "p-2.5 rounded-lg border transition-all",
                  config.bg,
                  config.border,
                )}
              >
                {/* Header: Stage name + Status */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm">{impact.stageName}</span>
                    {impact.status === 'critico' && (
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    )}
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn("text-[9px] h-4 px-1.5", config.text, config.border)}
                  >
                    {config.label}
                  </Badge>
                </div>
                
                {/* Metrics row */}
                {impact.isEligible ? (
                  <div className="grid grid-cols-4 gap-2 text-[10px]">
                    {/* Atual */}
                    <div>
                      <span className="text-muted-foreground block">Atual</span>
                      <span className="font-bold">
                        {impact.current.rate?.toFixed(1)}%
                      </span>
                    </div>
                    
                    {/* Meta */}
                    <div>
                      <span className="text-muted-foreground block">Meta</span>
                      <span className="font-medium">
                        {impact.target.rate.toFixed(1)}%
                      </span>
                    </div>
                    
                    {/* Gap */}
                    <div>
                      <span className="text-muted-foreground block">Gap</span>
                      <span className={cn(
                        "font-bold",
                        impact.gapPp !== undefined && impact.gapPp < 0 ? "text-red-600" : 
                        impact.gapPp !== undefined && impact.gapPp > 0 ? "text-emerald-600" : ""
                      )}>
                        {impact.gapPp !== undefined ? (
                          <>
                            {impact.gapPp > 0 ? '+' : ''}{impact.gapPp.toFixed(1)}pp
                          </>
                        ) : '—'}
                      </span>
                    </div>
                    
                    {/* Volume */}
                    <div>
                      <span className="text-muted-foreground block">Vol</span>
                      <span className="font-medium">
                        {impact.current.numerator}/{impact.current.denominator}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Info className="h-3 w-3" />
                    {impact.eligibilityReason || 'Dados insuficientes'}
                  </div>
                )}
                
                {/* Impact + Add button */}
                {impact.isEligible && impact.impact && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-current/10">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 text-[10px] text-primary cursor-help">
                          <TrendingUp className="h-3 w-3" />
                          <span className="font-medium">{impact.impact.description}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        Impacto estimado se atingir a meta
                      </TooltipContent>
                    </Tooltip>
                    
                    {canAddToPlan && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 text-[9px] px-1.5"
                        onClick={() => sendToPlan(impact)}
                      >
                        <Plus className="h-3 w-3 mr-0.5" />
                        Plano
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </TooltipProvider>
        
        {/* No data message */}
        {impacts.every(i => !i.isEligible) && (
          <div className="text-center py-4 text-xs text-muted-foreground">
            Preencha o funil para ver os gaps e impactos
          </div>
        )}
      </CardContent>
    </Card>
  );
}
