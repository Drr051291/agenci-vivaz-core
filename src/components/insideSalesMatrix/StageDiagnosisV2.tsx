import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, AlertTriangle, XCircle, Minus, Info, Send } from "lucide-react";
import { StageImpact } from "@/lib/insideSalesMatrix/impact";
import { DiagnosticItem } from "@/lib/insideSalesMatrix/rules";
import { cn } from "@/lib/utils";

interface StageDiagnosisV2Props {
  impacts: StageImpact[];
  stageDiagnostics: { stageId: string; diagnostics: DiagnosticItem[] }[];
  onAddToActionPlan?: (action: { title: string; stage: string; type: 'midia' | 'processo' }) => void;
}

const statusConfig = {
  ok: { label: 'OK', icon: CheckCircle2, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  atencao: { label: 'Atenção', icon: AlertTriangle, className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  critico: { label: 'Crítico', icon: XCircle, className: 'bg-red-500/10 text-red-600 border-red-500/20' },
  sem_dados: { label: 'Sem dados', icon: Minus, className: 'bg-muted text-muted-foreground' },
  baixa_amostra: { label: 'Baixa amostra', icon: Info, className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
};

// Determine action type based on stage
function getActionType(stageId: string): 'midia' | 'processo' {
  return 'processo';
}

export function StageDiagnosisV2({ impacts, stageDiagnostics, onAddToActionPlan }: StageDiagnosisV2Props) {
  
  // Send top actions to plan for a given stage
  const sendToPlan = (impact: StageImpact, diagnostics: DiagnosticItem[]) => {
    if (!onAddToActionPlan) return;
    
    // Send top 2 actions
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
        <CardTitle className="text-base font-semibold">Diagnóstico por Etapa</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <TooltipProvider>
          <Accordion type="multiple" className="w-full">
            {impacts.map((impact) => {
              const config = statusConfig[impact.status];
              const Icon = config.icon;
              const diagnostics = stageDiagnostics.find(d => d.stageId === impact.stageId)?.diagnostics || [];
              
              // Only show diagnostics for negative eligible stages
              const isEligible = impact.status !== 'baixa_amostra' && impact.status !== 'sem_dados';
              const isNegative = impact.status === 'atencao' || impact.status === 'critico';
              const showDiagnostics = isNegative && isEligible;
              
              const hasNegativeGap = impact.gapPp !== undefined && impact.gapPp < 0;

              return (
                <AccordionItem key={impact.stageId} value={impact.stageId} className="border-b last:border-b-0">
                  <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/30 py-3">
                    <div className="flex items-center gap-2 w-full text-left">
                      <Badge variant="outline" className={cn("gap-1 shrink-0 text-[10px] px-1.5", config.className)}>
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                      <span className="font-medium text-sm flex-1 truncate">{impact.stageName}</span>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        {isEligible ? (
                          <>
                            <span className="font-medium">
                              {impact.current.rate !== undefined ? `${impact.current.rate.toFixed(1)}%` : '-'}
                            </span>
                            <span className="opacity-50">vs</span>
                            <span>{impact.target.rate.toFixed(1)}%</span>
                            {impact.gapPp !== undefined && (
                              <span className={cn(
                                "font-semibold ml-1",
                                impact.gapPp < 0 ? "text-red-500" : "text-green-500"
                              )}>
                                {impact.gapPp > 0 ? '+' : ''}{impact.gapPp.toFixed(1)}pp
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="opacity-70">—</span>
                        )}
                        <span className="opacity-50 ml-1">
                          ({impact.current.numerator ?? 0}/{impact.current.denominator ?? 0})
                        </span>
                      </div>
                      {impact.impact && isEligible && hasNegativeGap && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="text-[10px] ml-2 shrink-0 cursor-help">
                              {impact.impact.extraContratos > 0 ? `+${impact.impact.extraContratos} contrato${impact.impact.extraContratos > 1 ? 's' : ''}` : 'Impacto'}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs max-w-[200px]">
                            {impact.impact.description}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-3">
                      {/* Compact metrics table */}
                      <Table className="text-xs">
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="h-7 py-1">Métrica</TableHead>
                            <TableHead className="h-7 py-1 text-right">Atual</TableHead>
                            <TableHead className="h-7 py-1 text-right">Meta</TableHead>
                            <TableHead className="h-7 py-1 text-right">Gap</TableHead>
                            <TableHead className="h-7 py-1 text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow className="hover:bg-muted/30">
                            <TableCell className="py-1.5 font-medium">Conversão</TableCell>
                            <TableCell className="py-1.5 text-right">
                              {isEligible && impact.current.rate !== undefined 
                                ? `${impact.current.rate.toFixed(1)}%` 
                                : '—'}
                            </TableCell>
                            <TableCell className="py-1.5 text-right">{impact.target.rate.toFixed(1)}%</TableCell>
                            <TableCell className={cn(
                              "py-1.5 text-right font-medium",
                              isEligible && impact.gapPp !== undefined && impact.gapPp < 0 ? "text-red-500" : 
                              isEligible && impact.gapPp !== undefined ? "text-green-500" : ""
                            )}>
                              {isEligible && impact.gapPp !== undefined 
                                ? `${impact.gapPp > 0 ? '+' : ''}${impact.gapPp.toFixed(1)}pp` 
                                : '—'}
                            </TableCell>
                            <TableCell className="py-1.5 text-center">
                              <span className={cn("w-2 h-2 rounded-full inline-block", 
                                impact.status === 'ok' && "bg-green-500",
                                impact.status === 'atencao' && "bg-yellow-500",
                                impact.status === 'critico' && "bg-red-500",
                                impact.status === 'sem_dados' && "bg-muted",
                                impact.status === 'baixa_amostra' && "bg-purple-500"
                              )} />
                            </TableCell>
                          </TableRow>
                          <TableRow className="hover:bg-muted/30">
                            <TableCell className="py-1.5 font-medium">Volume</TableCell>
                            <TableCell className="py-1.5 text-right">{impact.current.numerator ?? 0}</TableCell>
                            <TableCell className="py-1.5 text-right text-muted-foreground">—</TableCell>
                            <TableCell className="py-1.5 text-right text-muted-foreground">—</TableCell>
                            <TableCell className="py-1.5 text-center text-muted-foreground">—</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>

                      {/* Status-specific messages */}
                      {impact.status === 'baixa_amostra' && (
                        <p className="text-xs text-purple-600 bg-purple-500/5 rounded-lg p-2 flex items-center gap-2">
                          <Info className="h-3.5 w-3.5" />
                          Amostra insuficiente para análise confiável.
                        </p>
                      )}

                      {impact.status === 'sem_dados' && (
                        <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2 flex items-center gap-2">
                          <Minus className="h-3.5 w-3.5" />
                          Preencha os dados do funil para ver o diagnóstico.
                        </p>
                      )}

                      {impact.status === 'ok' && (
                        <p className="text-xs text-green-600 bg-green-500/5 rounded-lg p-2 flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Dentro da meta. Continue monitorando.
                        </p>
                      )}

                      {/* Send to plan button - only for negative eligible stages */}
                      {showDiagnostics && diagnostics.length > 0 && onAddToActionPlan && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-muted-foreground">
                            {diagnostics.length} ação{diagnostics.length > 1 ? 'ões' : ''} disponível{diagnostics.length > 1 ? 'is' : ''}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => sendToPlan(impact, diagnostics)}
                          >
                            <Send className="h-3 w-3" />
                            Enviar para plano
                          </Button>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}