import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, AlertTriangle, XCircle, Minus, Info, Send } from "lucide-react";
import { StageImpact } from "@/lib/insideSalesMatrix/impact";
import { DiagnosticItem } from "@/lib/insideSalesMatrix/rules";
import { BenchmarkProfile, getBenchmarkForStage } from "@/lib/insideSalesMatrix/benchmarkProfile";
import { cn } from "@/lib/utils";

interface StageDiagnosisV2Props {
  impacts: StageImpact[];
  stageDiagnostics: { stageId: string; diagnostics: DiagnosticItem[] }[];
  onAddToActionPlan?: (action: { title: string; stage: string; type: 'midia' | 'processo' }) => void;
  benchmarkProfile?: BenchmarkProfile | null;
  showBenchmarks?: boolean;
}

const statusConfig = {
  ok: { label: 'OK', icon: CheckCircle2, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  atencao: { label: 'Atenção', icon: AlertTriangle, className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  critico: { label: 'Crítico', icon: XCircle, className: 'bg-red-500/10 text-red-600 border-red-500/20' },
  sem_dados: { label: '—', icon: Minus, className: 'bg-muted text-muted-foreground' },
  baixa_amostra: { label: 'N/A', icon: Info, className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
};

function getActionType(stageId: string): 'midia' | 'processo' {
  return 'processo';
}

export function StageDiagnosisV2({ 
  impacts, 
  stageDiagnostics, 
  onAddToActionPlan,
  benchmarkProfile,
  showBenchmarks,
}: StageDiagnosisV2Props) {
  
  const sendToPlan = (impact: StageImpact, diagnostics: DiagnosticItem[]) => {
    if (!onAddToActionPlan) return;
    const actionsToSend = diagnostics.slice(0, 2);
    actionsToSend.forEach(d => {
      onAddToActionPlan({
        title: d.action.slice(0, 60),
        stage: impact.stageName,
        type: getActionType(impact.stageId)
      });
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Diagnóstico por Etapa</CardTitle>
          {showBenchmarks && (
            <Badge variant="outline" className="text-[10px]">Bench FPS</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <TooltipProvider>
          <div className="divide-y">
            {impacts.map((impact) => {
              const config = statusConfig[impact.status];
              const Icon = config.icon;
              const diagnostics = stageDiagnostics.find(d => d.stageId === impact.stageId)?.diagnostics || [];
              
              const isEligible = impact.status !== 'baixa_amostra' && impact.status !== 'sem_dados';
              const isNegative = impact.status === 'atencao' || impact.status === 'critico';
              const showSendButton = isNegative && isEligible && diagnostics.length > 0;
              const benchmark = getBenchmarkForStage(impact.stageId, benchmarkProfile);
              const hasNegativeGap = impact.gapPp !== undefined && impact.gapPp < 0;

              return (
                <div key={impact.stageId} className="px-4 py-2.5 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-2">
                    {/* Status badge */}
                    <Badge variant="outline" className={cn("gap-1 shrink-0 text-[10px] px-1.5 h-5", config.className)}>
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                    
                    {/* Stage name */}
                    <span className="font-medium text-sm flex-1 truncate">{impact.stageName}</span>
                    
                    {/* Numeric data: Atual | Meta | Bench | Gap | Volume */}
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      {isEligible ? (
                        <>
                          <span className="font-semibold text-foreground">
                            {impact.current.rate !== undefined ? `${impact.current.rate.toFixed(1)}%` : '—'}
                          </span>
                          <span className="opacity-40">/</span>
                          <span>{impact.target.rate.toFixed(1)}%</span>
                          {showBenchmarks && benchmark !== undefined && (
                            <>
                              <span className="opacity-40">/</span>
                              <span className="text-blue-600">{benchmark.toFixed(0)}%</span>
                            </>
                          )}
                          {impact.gapPp !== undefined && (
                            <span className={cn(
                              "font-semibold ml-1 px-1 rounded",
                              impact.gapPp < 0 ? "text-red-600 bg-red-500/10" : "text-green-600 bg-green-500/10"
                            )}>
                              {impact.gapPp > 0 ? '+' : ''}{impact.gapPp.toFixed(1)}pp
                            </span>
                          )}
                          <span className="opacity-40 ml-1">
                            ({impact.current.numerator ?? 0}/{impact.current.denominator ?? 0})
                          </span>
                        </>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="opacity-70 flex items-center gap-1 cursor-help">
                              <Info className="h-3 w-3" />
                              {impact.status === 'baixa_amostra' ? 'Amostra insuf.' : '—'}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs max-w-[180px]">
                            {impact.status === 'baixa_amostra' 
                              ? 'Amostra insuficiente para análise confiável'
                              : 'Preencha os dados do funil'}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    
                    {/* Impact badge */}
                    {impact.impact && isEligible && hasNegativeGap && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="text-[10px] shrink-0 cursor-help">
                            +{impact.impact.extraContratos} contrato{impact.impact.extraContratos > 1 ? 's' : ''}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs max-w-[180px]">
                          {impact.impact.description}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    
                    {/* Send to plan button */}
                    {showSendButton && onAddToActionPlan && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => sendToPlan(impact, diagnostics)}
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          Enviar {diagnostics.length} ação{diagnostics.length > 1 ? 'ões' : ''} para o plano
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}