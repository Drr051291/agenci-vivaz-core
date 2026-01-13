import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BarChart3, 
  ExternalLink, 
  Trash2, 
  Pencil, 
  ChevronDown, 
  Plus,
  Target,
  Sparkles,
  TrendingUp,
  ShoppingCart,
  Users,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ClientPerformanceProps {
  clientId: string;
}

interface PerformanceEntry {
  id: string;
  entry_type: string;
  period_start: string | null;
  period_end: string | null;
  channel: string | null;
  summary: {
    bottleneck?: string;
    gaps?: { stage: string; gap: number }[];
    confidence_score?: number;
    key_rates?: Record<string, number>;
  };
  diagnostic_id: string | null;
  created_at: string;
}

interface DiagnosticEntry {
  id: string;
  name: string;
  tool_type: string;
  setor: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  insights: unknown[];
  simulation_data: Record<string, unknown> | null;
  period_label: string | null;
  notes: string | null;
  status: string | null;
  created_at: string;
}

interface SimulationScenario {
  id: string;
  name: string;
  setor: string;
  inputs: {
    leads?: number;
    ticketMedio?: number;
  };
  simulated_rates: {
    lead_to_mql?: number;
    mql_to_sql?: number;
    sql_to_opp?: number;
    opp_to_sale?: number;
  };
  current_results: {
    contratos?: number;
    revenue?: number;
    roi?: number;
    globalConversion?: number;
  };
  simulated_results: {
    leads?: number;
    contratos?: number;
    revenue?: number;
    roi?: number;
    globalConversion?: number;
  };
  benchmark_data: {
    label?: string;
  };
  notes: string | null;
  created_at: string;
}

const TOOL_LABELS: Record<string, { name: string; icon: React.ElementType; color: string }> = {
  performance_pro: { name: 'Performance Pro', icon: TrendingUp, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  ecommerce: { name: 'E-commerce', icon: ShoppingCart, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  inside_sales: { name: 'Inside Sales', icon: Users, color: 'bg-green-100 text-green-700 border-green-200' },
};

const entryTypeLabels: Record<string, string> = {
  inside_sales_matrix: 'Inside Sales',
  ecommerce_matrix: 'E-commerce',
};

const channelLabels: Record<string, string> = {
  landing_page: 'Landing Page',
  lead_nativo: 'Lead Nativo',
  whatsapp: 'WhatsApp',
};

const formatPercent = (n?: number | null): string => {
  if (n === undefined || n === null) return "—";
  return `${n.toFixed(1)}%`;
};

const formatCurrency = (n?: number | null): string => {
  if (n === undefined || n === null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export function ClientPerformance({ clientId }: ClientPerformanceProps) {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<PerformanceEntry[]>([]);
  const [matrixDiagnostics, setMatrixDiagnostics] = useState<DiagnosticEntry[]>([]);
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDiagId, setExpandedDiagId] = useState<string | null>(null);
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<{ id: string; type: 'entry' | 'diagnostic' | 'scenario' } | null>(null);

  useEffect(() => {
    loadData();
  }, [clientId]);

  async function loadData() {
    try {
      const [entriesRes, matrixDiagsRes, scenariosRes] = await Promise.all([
        supabase
          .from('client_performance_entries')
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false }),
        supabase
          .from('performance_matrix_diagnostics' as never)
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false }),
        supabase
          .from('performance_simulation_scenarios' as never)
          .select('*')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false }),
      ]);

      setEntries((entriesRes.data || []) as PerformanceEntry[]);
      setMatrixDiagnostics((matrixDiagsRes.data || []) as DiagnosticEntry[]);
      setScenarios((scenariosRes.data || []) as SimulationScenario[]);
    } catch (error: any) {
      toast.error('Erro ao carregar análises');
    } finally {
      setLoading(false);
    }
  }

  function formatPeriod(start: string | null, end: string | null): string {
    if (!start && !end) return 'Sem período';
    if (!start) return `até ${format(new Date(end!), 'dd/MM/yyyy', { locale: ptBR })}`;
    if (!end) return `desde ${format(new Date(start), 'dd/MM/yyyy', { locale: ptBR })}`;
    return `${format(new Date(start), 'dd/MM', { locale: ptBR })} - ${format(new Date(end), 'dd/MM/yyyy', { locale: ptBR })}`;
  }

  function getConfidenceColor(score?: number): string {
    if (!score) return 'bg-muted text-muted-foreground';
    if (score >= 80) return 'bg-green-500/10 text-green-600 border-green-500/20';
    if (score >= 50) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    return 'bg-red-500/10 text-red-600 border-red-500/20';
  }

  async function handleDeleteEntry() {
    if (!entryToDelete) return;
    
    try {
      let tableName = '';
      if (entryToDelete.type === 'entry') {
        tableName = 'client_performance_entries';
      } else if (entryToDelete.type === 'diagnostic') {
        tableName = 'performance_matrix_diagnostics';
      } else if (entryToDelete.type === 'scenario') {
        tableName = 'performance_simulation_scenarios';
      }

      const { error } = await supabase
        .from(tableName as never)
        .delete()
        .eq('id', entryToDelete.id);

      if (error) throw error;

      if (entryToDelete.type === 'entry') {
        setEntries(entries.filter(e => e.id !== entryToDelete.id));
      } else if (entryToDelete.type === 'diagnostic') {
        setMatrixDiagnostics(matrixDiagnostics.filter(d => d.id !== entryToDelete.id));
      } else if (entryToDelete.type === 'scenario') {
        setScenarios(scenarios.filter(s => s.id !== entryToDelete.id));
      }

      toast.success('Análise excluída com sucesso');
    } catch (error: any) {
      toast.error('Erro ao excluir análise');
    } finally {
      setEntryToDelete(null);
      setDeleteDialogOpen(false);
    }
  }

  function handleOpenAnalysis(entry: PerformanceEntry) {
    if (entry.diagnostic_id) {
      navigate(`/ferramentas/matriz-inside-sales?diagnostic=${entry.diagnostic_id}`);
    } else {
      toast.error('Diagnóstico não encontrado');
    }
  }

  function handleEditAnalysis(entry: PerformanceEntry) {
    if (entry.diagnostic_id) {
      navigate(`/ferramentas/matriz-inside-sales?diagnostic=${entry.diagnostic_id}&edit=true`);
    } else {
      toast.error('Diagnóstico não encontrado');
    }
  }

  function handleOpenDiagnostic(diag: DiagnosticEntry) {
    const toolRoutes: Record<string, string> = {
      performance_pro: '/ferramentas/matriz-performance-pro',
      ecommerce: '/ferramentas/matriz-ecommerce',
      inside_sales: '/ferramentas/matriz-inside-sales',
    };
    const route = toolRoutes[diag.tool_type] || '/ferramentas/matriz-performance-pro';
    navigate(`${route}?diagnostic=${diag.id}`);
  }

  function handleEditDiagnostic(diag: DiagnosticEntry) {
    const toolRoutes: Record<string, string> = {
      performance_pro: '/ferramentas/matriz-performance-pro',
      ecommerce: '/ferramentas/matriz-ecommerce',
      inside_sales: '/ferramentas/matriz-inside-sales',
    };
    const route = toolRoutes[diag.tool_type] || '/ferramentas/matriz-performance-pro';
    navigate(`${route}?diagnostic=${diag.id}&edit=true`);
  }

  function handleOpenScenario(scenario: SimulationScenario) {
    navigate(`/ferramentas/matriz-performance-pro?scenario=${scenario.id}`);
  }

  function handleEditScenario(scenario: SimulationScenario) {
    navigate(`/ferramentas/matriz-performance-pro?scenario=${scenario.id}&edit=true`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const hasData = entries.length > 0 || matrixDiagnostics.length > 0 || scenarios.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Performance</h2>
          <p className="text-sm text-muted-foreground">Análises de funil, diagnósticos e cenários simulados</p>
        </div>
        <Button 
          onClick={() => navigate('/ferramentas/matriz-performance-pro')}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova análise
        </Button>
      </div>

      {/* Empty state */}
      {!hasData && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-lg mb-1">Nenhuma análise salva</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              Use as ferramentas de análise para criar diagnósticos e cenários.
            </p>
            <Button 
              variant="outline" 
              onClick={() => navigate('/ferramentas/matriz-performance-pro')}
            >
              Ir para Ferramentas
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Matrix Diagnostics - All Tool Types */}
      {matrixDiagnostics.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Diagnósticos de Performance
            </CardTitle>
            <CardDescription>
              Análises completas de funil geradas pela equipe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {matrixDiagnostics.map((diag) => {
              const toolInfo = TOOL_LABELS[diag.tool_type] || TOOL_LABELS.performance_pro;
              const Icon = toolInfo.icon;
              const outputs = diag.outputs as Record<string, unknown>;
              const globalConv = outputs?.globalConversion as number | undefined;
              const stages = outputs?.stages as Array<{ label: string; rate: number; status: string }> | undefined;
              
              return (
                <div key={diag.id} className="border rounded-lg overflow-hidden">
                  <div
                    className={cn(
                      "flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                      expandedDiagId === diag.id && "bg-muted/30"
                    )}
                    onClick={() => setExpandedDiagId(expandedDiagId === diag.id ? null : diag.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", toolInfo.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{diag.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className={cn("text-[10px]", toolInfo.color)}>
                            {toolInfo.name}
                          </Badge>
                          {diag.status && (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px]",
                                diag.status === 'published' && "bg-green-100 text-green-700 border-green-200",
                                diag.status === 'draft' && "bg-yellow-100 text-yellow-700 border-yellow-200"
                              )}
                            >
                              {diag.status === 'published' ? 'Publicado' : 'Rascunho'}
                            </Badge>
                          )}
                          {diag.period_label && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {diag.period_label}
                            </span>
                          )}
                          <span>
                            {format(new Date(diag.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {globalConv !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          {formatPercent(globalConv)} conversão
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditDiagnostic(diag);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEntryToDelete({ id: diag.id, type: 'diagnostic' });
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <ChevronDown className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        expandedDiagId === diag.id && "rotate-180"
                      )} />
                    </div>
                  </div>

                  {expandedDiagId === diag.id && (
                    <div className="px-4 pb-4 pt-2 border-t bg-muted/20">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Stage Rates */}
                        {stages && stages.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Taxas por Etapa</p>
                            <div className="space-y-1">
                              {stages.map((stage, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 bg-background rounded border text-xs">
                                  <span className="text-muted-foreground">{stage.label}</span>
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "font-medium",
                                      stage.status === 'ok' && "text-green-600",
                                      stage.status === 'warning' && "text-yellow-600",
                                      stage.status === 'critical' && "text-red-600"
                                    )}>
                                      {formatPercent(stage.rate)}
                                    </span>
                                    <span>
                                      {stage.status === 'ok' && '🟢'}
                                      {stage.status === 'warning' && '🟡'}
                                      {stage.status === 'critical' && '🔴'}
                                      {stage.status === 'no_data' && '⚪'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Summary & Notes */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Resumo</p>
                          <div className="p-3 bg-background rounded border">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Setor:</span>
                                <span className="ml-1 font-medium">{diag.setor}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Conversão:</span>
                                <span className="ml-1 font-medium">{formatPercent(globalConv)}</span>
                              </div>
                            </div>
                          </div>

                          {diag.notes && (
                            <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                              <p className="text-xs text-amber-800">
                                <strong>Obs:</strong> {diag.notes}
                              </p>
                            </div>
                          )}

                          {/* Insights Preview */}
                          {diag.insights && Array.isArray(diag.insights) && diag.insights.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Principais Insights</p>
                              {(diag.insights as Array<{ title?: string; type?: string }>).slice(0, 3).map((insight, idx) => (
                                <div key={idx} className="flex items-start gap-2 p-2 bg-background rounded border text-xs">
                                  <span>
                                    {insight.type === 'success' && '✅'}
                                    {insight.type === 'warning' && '⚠️'}
                                    {insight.type === 'critical' && '❌'}
                                    {insight.type === 'info' && 'ℹ️'}
                                  </span>
                                  <span>{insight.title}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-t mt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDiagnostic(diag);
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Abrir análise
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditDiagnostic(diag);
                          }}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEntryToDelete({ id: diag.id, type: 'diagnostic' });
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Simulation Scenarios */}
      {scenarios.length > 0 && (
        <Card className="border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              Cenários de Simulação
            </CardTitle>
            <CardDescription>
              Projeções "E se?" criadas pela equipe para análise de oportunidades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {scenarios.map((scenario) => {
              const simulatedContracts = scenario.simulated_results?.contratos;
              const currentContracts = scenario.current_results?.contratos;
              const contractDiff = simulatedContracts !== undefined && currentContracts !== undefined
                ? simulatedContracts - currentContracts
                : undefined;

              return (
                <div key={scenario.id} className="border rounded-lg overflow-hidden">
                  <div
                    className={cn(
                      "flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                      expandedScenarioId === scenario.id && "bg-muted/30"
                    )}
                    onClick={() => setExpandedScenarioId(expandedScenarioId === scenario.id ? null : scenario.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{scenario.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{scenario.setor}</span>
                          <span>•</span>
                          <span>
                            {format(new Date(scenario.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {contractDiff !== undefined && (
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-xs",
                            contractDiff > 0 ? "bg-green-100 text-green-700" : "bg-muted"
                          )}
                        >
                          {contractDiff > 0 ? '+' : ''}{contractDiff} contratos
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditScenario(scenario);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEntryToDelete({ id: scenario.id, type: 'scenario' });
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <ChevronDown className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        expandedScenarioId === scenario.id && "rotate-180"
                      )} />
                    </div>
                  </div>

                  {expandedScenarioId === scenario.id && (
                    <div className="px-4 pb-4 pt-2 border-t bg-muted/20">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Current vs Simulated */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Comparativo</p>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center p-2 bg-background rounded border text-xs">
                              <span className="text-muted-foreground">Contratos (atual)</span>
                              <span className="font-medium">{scenario.current_results?.contratos ?? '—'}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-green-50 border border-green-200 rounded text-xs">
                              <span className="text-green-700">Contratos (simulado)</span>
                              <span className="font-medium text-green-700">{scenario.simulated_results?.contratos ?? '—'}</span>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-background rounded border text-xs">
                              <span className="text-muted-foreground">Receita (simulada)</span>
                              <span className="font-medium">{formatCurrency(scenario.simulated_results?.revenue)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Simulated Rates */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Taxas Simuladas</p>
                          <div className="grid grid-cols-2 gap-1">
                            {scenario.simulated_rates?.lead_to_mql !== undefined && (
                              <div className="p-2 bg-background rounded border text-xs">
                                <span className="text-muted-foreground block">Lead → MQL</span>
                                <span className="font-medium">{formatPercent(scenario.simulated_rates.lead_to_mql)}</span>
                              </div>
                            )}
                            {scenario.simulated_rates?.mql_to_sql !== undefined && (
                              <div className="p-2 bg-background rounded border text-xs">
                                <span className="text-muted-foreground block">MQL → SQL</span>
                                <span className="font-medium">{formatPercent(scenario.simulated_rates.mql_to_sql)}</span>
                              </div>
                            )}
                            {scenario.simulated_rates?.sql_to_opp !== undefined && (
                              <div className="p-2 bg-background rounded border text-xs">
                                <span className="text-muted-foreground block">SQL → Opp</span>
                                <span className="font-medium">{formatPercent(scenario.simulated_rates.sql_to_opp)}</span>
                              </div>
                            )}
                            {scenario.simulated_rates?.opp_to_sale !== undefined && (
                              <div className="p-2 bg-background rounded border text-xs">
                                <span className="text-muted-foreground block">Opp → Venda</span>
                                <span className="font-medium">{formatPercent(scenario.simulated_rates.opp_to_sale)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {scenario.notes && (
                        <div className="mt-4 p-2 bg-amber-50 border border-amber-200 rounded">
                          <p className="text-xs text-amber-800">
                            <strong>Obs:</strong> {scenario.notes}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-t mt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenScenario(scenario);
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Abrir cenário
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditScenario(scenario);
                          }}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEntryToDelete({ id: scenario.id, type: 'scenario' });
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Legacy Performance Entries */}
      {entries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Análises de Funil (legado)</CardTitle>
            <CardDescription>Entradas de performance anteriores</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Confiança</TableHead>
                  <TableHead>Gargalo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} className="group">
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {entryTypeLabels[entry.entry_type] || entry.entry_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatPeriod(entry.period_start, entry.period_end)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.channel ? (channelLabels[entry.channel] || entry.channel) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", getConfidenceColor(entry.summary?.confidence_score))}
                      >
                        {entry.summary?.confidence_score ? `${entry.summary.confidence_score}%` : '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">
                      {entry.summary?.bottleneck || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                        >
                          <ChevronDown className={cn(
                            "h-3 w-3 mr-1 transition-transform",
                            expandedId === entry.id && "rotate-180"
                          )} />
                          Detalhes
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={() => handleOpenAnalysis(entry)}
                          title="Abrir análise"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={() => handleEditAnalysis(entry)}
                          title="Editar análise"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => {
                            setEntryToDelete({ id: entry.id, type: 'entry' });
                            setDeleteDialogOpen(true);
                          }}
                          title="Excluir análise"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Expanded details for legacy entries */}
      {expandedId && entries.find(e => e.id === expandedId) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Detalhes da análise</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const entry = entries.find(e => e.id === expandedId)!;
              return (
                <div className="space-y-4">
                  {/* Gaps */}
                  {entry.summary?.gaps && entry.summary.gaps.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                        Maiores gaps
                      </p>
                      <div className="space-y-1">
                        {entry.summary.gaps.slice(0, 3).map((gap, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span>{gap.stage}</span>
                            <Badge variant="outline" className="text-destructive border-destructive/30">
                              {gap.gap > 0 ? '+' : ''}{gap.gap.toFixed(1)}pp
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key rates */}
                  {entry.summary?.key_rates && Object.keys(entry.summary.key_rates).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                        Taxas principais
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(entry.summary.key_rates).slice(0, 4).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-sm bg-muted/30 rounded px-2 py-1">
                            <span className="text-muted-foreground truncate">{key}</span>
                            <span className="font-medium">{typeof value === 'number' ? `${value.toFixed(1)}%` : value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOpenAnalysis(entry)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Abrir análise
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditAnalysis(entry)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setEntryToDelete({ id: entry.id, type: 'entry' });
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir análise</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta análise? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEntryToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEntry}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
