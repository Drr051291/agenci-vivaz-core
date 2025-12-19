import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertTriangle, XCircle, Minus, Info, Plus, ChevronDown, Megaphone, Users } from "lucide-react";
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

const impactLabels: Record<string, string> = {
  'lead_to_mql': 'Qualificação',
  'mql_to_sql': 'Qualificação',
  'sql_to_meeting': 'Agendamento',
  'meeting_to_win': 'Fechamento',
};

// Determine action type based on stage
function getActionType(stageId: string): 'midia' | 'processo' {
  // First stage could be media-related, rest are process
  if (stageId === 'lead_to_mql') return 'processo';
  return 'processo';
}

// Determine effort level heuristically
function getEffort(action: string): 'Baixo' | 'Médio' | 'Alto' {
  const lowEffortKeywords = ['revisar', 'analisar', 'verificar', 'ajustar', 'testar'];
  const highEffortKeywords = ['implementar', 'criar', 'treinar', 'desenvolver', 'reestruturar'];
  
  const actionLower = action.toLowerCase();
  
  if (highEffortKeywords.some(k => actionLower.includes(k))) return 'Alto';
  if (lowEffortKeywords.some(k => actionLower.includes(k))) return 'Baixo';
  return 'Médio';
}

export function StageDiagnosisV2({ impacts, stageDiagnostics, onAddToActionPlan }: StageDiagnosisV2Props) {
  const [expandedDetails, setExpandedDetails] = useState<string[]>([]);

  const toggleDetails = (stageId: string) => {
    setExpandedDetails(prev => 
      prev.includes(stageId) 
        ? prev.filter(id => id !== stageId)
        : [...prev, stageId]
    );
  };

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
            const showDetails = expandedDetails.includes(impact.stageId);
            const actionType = getActionType(impact.stageId);

            return (
              <AccordionItem key={impact.stageId} value={impact.stageId} className="border-b last:border-b-0">
                <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/30 py-3">
                  <div className="flex items-center gap-2 w-full text-left">
                    <Badge variant="outline" className={cn("gap-1 shrink-0 text-[10px] px-1.5", config.className)}>
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                    <span className="font-medium text-sm flex-1">{impact.stageName}</span>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <span className="font-medium">
                        {impact.current.rate !== undefined ? `${impact.current.rate.toFixed(1)}%` : '-'}
                      </span>
                      <span className="opacity-50">vs</span>
                      <span>{impact.target.rate.toFixed(1)}%</span>
                      <span className={cn(
                        "font-semibold ml-1",
                        impact.gapPp !== undefined && impact.gapPp < 0 ? "text-red-500" : "text-green-500"
                      )}>
                        {impact.gapPp !== undefined ? `${impact.gapPp > 0 ? '+' : ''}${impact.gapPp.toFixed(1)}pp` : ''}
                      </span>
                      <span className="opacity-50 ml-1">
                        ({impact.current.numerator ?? 0}/{impact.current.denominator ?? 0})
                      </span>
                    </div>
                    {impact.impact && (
                      <Badge variant="secondary" className="text-[10px] ml-2 shrink-0">
                        {impact.impact.extraContratos > 0 ? `+${impact.impact.extraContratos} contrato${impact.impact.extraContratos > 1 ? 's' : ''}` : 'Impacto alto'}
                      </Badge>
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
                            {impact.current.rate !== undefined ? `${impact.current.rate.toFixed(1)}%` : '-'}
                          </TableCell>
                          <TableCell className="py-1.5 text-right">{impact.target.rate.toFixed(1)}%</TableCell>
                          <TableCell className={cn(
                            "py-1.5 text-right font-medium",
                            impact.gapPp !== undefined && impact.gapPp < 0 ? "text-red-500" : "text-green-500"
                          )}>
                            {impact.gapPp !== undefined ? `${impact.gapPp > 0 ? '+' : ''}${impact.gapPp.toFixed(1)}pp` : '-'}
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
                          <TableCell className="py-1.5 text-right">-</TableCell>
                          <TableCell className="py-1.5 text-right">-</TableCell>
                          <TableCell className="py-1.5 text-center">-</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>

                    {/* Causes - max 2 bullets */}
                    {diagnostics.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Causas prováveis
                        </p>
                        <ul className="text-xs space-y-0.5">
                          {diagnostics.slice(0, 2).map((d, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-yellow-500 mt-0.5">•</span>
                              <span>{d.situation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Actions - max 3 items, compact cards */}
                    {diagnostics.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                          Ações recomendadas
                        </p>
                        <div className="space-y-1.5">
                          {diagnostics.slice(0, 3).map((d, i) => {
                            const effort = getEffort(d.action);
                            return (
                              <div key={i} className="flex items-start justify-between gap-2 bg-muted/30 rounded-lg p-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <Badge variant="outline" className={cn(
                                      "text-[9px] px-1 py-0 h-4 gap-0.5",
                                      actionType === 'midia' ? "border-blue-500/30 text-blue-600" : "border-purple-500/30 text-purple-600"
                                    )}>
                                      {actionType === 'midia' ? <Megaphone className="h-2.5 w-2.5" /> : <Users className="h-2.5 w-2.5" />}
                                      {actionType === 'midia' ? 'Mídia' : 'Processo'}
                                    </Badge>
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                                      Esforço: {effort}
                                    </Badge>
                                  </div>
                                  <p className="text-xs leading-tight">{d.action}</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">
                                    Métrica: {d.metricLabel}
                                  </p>
                                </div>
                                {onAddToActionPlan && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 shrink-0"
                                    onClick={() => onAddToActionPlan({ 
                                      title: d.action.slice(0, 60), 
                                      stage: impact.stageName,
                                      type: actionType
                                    })}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Show more toggle */}
                    {diagnostics.length > 3 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full h-7 text-xs"
                        onClick={() => toggleDetails(impact.stageId)}
                      >
                        <ChevronDown className={cn("h-3 w-3 mr-1 transition-transform", showDetails && "rotate-180")} />
                        {showDetails ? 'Ver menos' : `Ver mais ${diagnostics.length - 3} ações`}
                      </Button>
                    )}

                    {showDetails && diagnostics.slice(3, 6).map((d, i) => {
                      const effort = getEffort(d.action);
                      return (
                        <div key={`extra-${i}`} className="flex items-start justify-between gap-2 bg-muted/20 rounded-lg p-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-purple-500/30 text-purple-600 gap-0.5">
                                <Users className="h-2.5 w-2.5" />
                                Processo
                              </Badge>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                                Esforço: {effort}
                              </Badge>
                            </div>
                            <p className="text-xs leading-tight">{d.action}</p>
                          </div>
                          {onAddToActionPlan && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0"
                              onClick={() => onAddToActionPlan({ 
                                title: d.action.slice(0, 60), 
                                stage: impact.stageName,
                                type: actionType
                              })}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}

                    {/* Success state */}
                    {diagnostics.length === 0 && impact.status === 'ok' && (
                      <p className="text-xs text-green-600 bg-green-500/5 rounded-lg p-2 flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Esta etapa está dentro da meta. Continue monitorando.
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
