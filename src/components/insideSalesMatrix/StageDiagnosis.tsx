import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle, Minus, Info, Plus } from "lucide-react";
import { StageImpact } from "@/lib/insideSalesMatrix/impact";
import { DiagnosticItem } from "@/lib/insideSalesMatrix/rules";

interface StageDiagnosisProps {
  impacts: StageImpact[];
  stageDiagnostics: { stageId: string; diagnostics: DiagnosticItem[] }[];
  onAddToActionPlan?: (action: { title: string; stage: string }) => void;
}

const statusConfig = {
  ok: { label: 'OK', icon: CheckCircle2, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  atencao: { label: 'Atenção', icon: AlertTriangle, className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  critico: { label: 'Crítico', icon: XCircle, className: 'bg-red-500/10 text-red-600 border-red-500/20' },
  sem_dados: { label: 'Sem dados', icon: Minus, className: 'bg-muted text-muted-foreground' },
  baixa_amostra: { label: 'Baixa amostra', icon: Info, className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
};

export function StageDiagnosis({ impacts, stageDiagnostics, onAddToActionPlan }: StageDiagnosisProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Diagnóstico por Etapa</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Accordion type="multiple" className="w-full">
          {impacts.map((impact) => {
            const config = statusConfig[impact.status];
            const Icon = config.icon;
            const diagnostics = stageDiagnostics.find(d => d.stageId === impact.stageId)?.diagnostics || [];

            return (
              <AccordionItem key={impact.stageId} value={impact.stageId} className="border-b last:border-b-0">
                <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/30">
                  <div className="flex items-center gap-3 w-full">
                    <Badge variant="outline" className={`gap-1 shrink-0 ${config.className}`}>
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                    <span className="font-medium text-sm">{impact.stageName}</span>
                    <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {impact.current.rate !== undefined ? `${impact.current.rate.toFixed(1)}%` : '-'}
                      </span>
                      <span className="text-muted-foreground/50">vs</span>
                      <span>{impact.target.rate.toFixed(1)}%</span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4">
                    {/* Métricas */}
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="bg-muted/30 rounded p-2 text-center">
                        <span className="text-muted-foreground block">Atual</span>
                        <span className="font-semibold">
                          {impact.current.rate !== undefined ? `${impact.current.rate.toFixed(1)}%` : '-'}
                        </span>
                      </div>
                      <div className="bg-muted/30 rounded p-2 text-center">
                        <span className="text-muted-foreground block">Meta</span>
                        <span className="font-semibold">{impact.target.rate.toFixed(1)}%</span>
                      </div>
                      <div className="bg-muted/30 rounded p-2 text-center">
                        <span className="text-muted-foreground block">Gap</span>
                        <span className={`font-semibold ${impact.gapPp !== undefined && impact.gapPp < 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {impact.gapPp !== undefined ? `${impact.gapPp > 0 ? '+' : ''}${impact.gapPp.toFixed(1)}pp` : '-'}
                        </span>
                      </div>
                      <div className="bg-muted/30 rounded p-2 text-center">
                        <span className="text-muted-foreground block">Volume</span>
                        <span className="font-semibold">
                          {impact.current.numerator ?? 0}/{impact.current.denominator ?? 0}
                        </span>
                      </div>
                    </div>

                    {/* Impacto */}
                    {impact.impact && (
                      <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                        <p className="text-xs font-medium text-primary mb-1">Impacto estimado (se atingir meta)</p>
                        <p className="text-sm font-semibold">{impact.impact.description}</p>
                      </div>
                    )}

                    {/* Diagnóstico da matriz */}
                    {diagnostics.length > 0 && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">O que está travando</p>
                          <ul className="text-sm space-y-1">
                            {diagnostics.slice(0, 2).map((d, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-red-500 mt-1">•</span>
                                <span>{d.situation}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Por que pode estar acontecendo</p>
                          <ul className="text-sm space-y-1">
                            {diagnostics.slice(0, 2).map((d, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-yellow-500 mt-1">•</span>
                                <span>{d.metricLabel}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">O que fazer agora</p>
                          <ul className="text-sm space-y-2">
                            {diagnostics.slice(0, 3).map((d, i) => (
                              <li key={i} className="flex items-start justify-between gap-2 bg-muted/30 rounded p-2">
                                <span className="flex-1">{d.action}</span>
                                {onAddToActionPlan && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 shrink-0"
                                    onClick={() => onAddToActionPlan({ title: d.action.slice(0, 50), stage: impact.stageName })}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {diagnostics.length === 0 && impact.status === 'ok' && (
                      <p className="text-sm text-green-600 bg-green-500/5 rounded p-3">
                        ✓ Esta etapa está dentro da meta. Continue monitorando.
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
