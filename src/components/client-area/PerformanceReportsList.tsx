import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  TrendingUp,
  Calendar,
  Target,
  DollarSign,
  Users,
  AlertCircle,
  CheckCircle,
  Lightbulb,
} from "lucide-react";

interface PerformanceReport {
  id: string;
  title: string;
  period_label: string | null;
  scenario: "conservador" | "realista" | "agressivo";
  source_tool: string;
  inputs_json: {
    investimento: number;
    leads: number;
    mql: number;
    sql: number;
    oportunidades: number;
    contratos?: number;
    ticketMedio?: number;
    periodo?: string;
    cicloDias?: number;
  };
  outputs_json: {
    costs: {
      cpl: number | null;
      custoMql: number | null;
      custoSql: number | null;
      custoOpp: number | null;
      custoContrato: number | null;
    };
    projectedCosts: {
      cpl: number | null;
      custoMql: number | null;
      custoSql: number | null;
      custoOpp: number | null;
      custoContrato: number | null;
    };
    largestCostStep: {
      label: string;
      delta: number;
    } | null;
    conversions: Array<{
      key: string;
      label: string;
      rate: number | null;
      status: "ok" | "warning" | "critical" | "no_data";
      isProjected?: boolean;
    }>;
    globalConversion: number | null;
    projectedStages: {
      leads: { value: number; isProjected: boolean };
      mql: { value: number; isProjected: boolean };
      sql: { value: number; isProjected: boolean };
      oportunidades: { value: number; isProjected: boolean };
      contratos: { value: number; isProjected: boolean };
    };
    leadsForContract: {
      leadsNeeded: number;
      investmentNeeded: number | null;
      conversionPath: string;
    } | null;
  };
  created_at: string;
}

interface PerformanceReportsListProps {
  clientId: string;
}

const formatCurrency = (n?: number | null): string => {
  if (n === undefined || n === null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const formatPercent = (n?: number | null): string => {
  if (n === undefined || n === null) return "—";
  return `${n.toFixed(1)}%`;
};

const formatNumber = (n?: number | null): string => {
  if (n === undefined || n === null) return "—";
  return n.toLocaleString("pt-BR");
};

const SCENARIO_LABELS: Record<string, { label: string; color: string }> = {
  conservador: { label: "Conservador", color: "bg-amber-100 text-amber-700 border-amber-200" },
  realista: { label: "Realista", color: "bg-blue-100 text-blue-700 border-blue-200" },
  agressivo: { label: "Agressivo", color: "bg-green-100 text-green-700 border-green-200" },
};

const STATUS_ICONS = {
  ok: <CheckCircle className="h-3 w-3 text-green-500" />,
  warning: <AlertCircle className="h-3 w-3 text-amber-500" />,
  critical: <AlertCircle className="h-3 w-3 text-red-500" />,
  no_data: <span className="h-3 w-3 text-muted-foreground">—</span>,
};

export function PerformanceReportsList({ clientId }: PerformanceReportsListProps) {
  const [reports, setReports] = useState<PerformanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (clientId) {
      loadReports();
    }
  }, [clientId]);

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from("performance_reports")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports((data || []) as unknown as PerformanceReport[]);
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  if (reports.length === 0) {
    return null; // Don't render anything if no reports
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Relatórios de Performance
        </CardTitle>
        <CardDescription>
          Análises de funil e custos por etapa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {reports.map((report) => {
          const scenario = SCENARIO_LABELS[report.scenario] || SCENARIO_LABELS.realista;
          const outputs = report.outputs_json;
          const inputs = report.inputs_json;
          const isExpanded = expandedId === report.id;

          // Find bottlenecks (critical/warning from real data only)
          const bottlenecks = outputs.conversions?.filter(
            (c) => !c.isProjected && (c.status === "critical" || c.status === "warning")
          ) || [];

          return (
            <div key={report.id} className="border rounded-lg overflow-hidden">
              {/* Header */}
              <div
                className={cn(
                  "flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                  isExpanded && "bg-muted/30"
                )}
                onClick={() => setExpandedId(isExpanded ? null : report.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{report.title}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <Badge variant="outline" className={cn("text-[10px]", scenario.color)}>
                        {scenario.label}
                      </Badge>
                      {report.period_label && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {report.period_label}
                        </span>
                      )}
                      <span>
                        {format(new Date(report.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    {/* Quick metrics */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
                      <span>
                        <strong className="text-foreground">{formatNumber(inputs.leads)}</strong> leads
                      </span>
                      <span>
                        <strong className="text-foreground">{formatNumber(inputs.oportunidades)}</strong> opp
                      </span>
                      <span>
                        Invest: <strong className="text-foreground">{formatCurrency(inputs.investimento)}</strong>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Summary badges */}
                  <div className="hidden sm:flex items-center gap-2">
                    {outputs.globalConversion !== null && (
                      <Badge variant="secondary" className="text-xs">
                        {formatPercent(outputs.globalConversion)} conv.
                      </Badge>
                    )}
                    {outputs.projectedCosts?.custoContrato && (
                      <Badge variant="outline" className="text-xs">
                        CAC {formatCurrency(outputs.projectedCosts.custoContrato)}
                      </Badge>
                    )}
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t bg-muted/20 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Funnel Stages */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Funil de Vendas
                      </p>
                      <div className="space-y-1">
                        {[
                          { key: "leads", label: "Leads", value: outputs.projectedStages?.leads },
                          { key: "mql", label: "MQL", value: outputs.projectedStages?.mql },
                          { key: "sql", label: "SQL", value: outputs.projectedStages?.sql },
                          { key: "oportunidades", label: "Oportunidades", value: outputs.projectedStages?.oportunidades },
                          { key: "contratos", label: "Contratos", value: outputs.projectedStages?.contratos },
                        ].map((stage) => (
                          <div
                            key={stage.key}
                            className={cn(
                              "flex justify-between items-center p-2 bg-background rounded border text-xs",
                              stage.value?.isProjected && "border-dashed border-purple-300"
                            )}
                          >
                            <span className="text-muted-foreground">{stage.label}</span>
                            <span className={cn("font-medium", stage.value?.isProjected && "text-purple-600")}>
                              {formatNumber(stage.value?.value)}
                              {stage.value?.isProjected && (
                                <span className="text-[10px] ml-1">(proj.)</span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Conversion Rates */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Taxas de Conversão</p>
                      <div className="space-y-1">
                        {outputs.conversions?.map((conv) => (
                          <div
                            key={conv.key}
                            className={cn(
                              "flex justify-between items-center p-2 bg-background rounded border text-xs",
                              conv.isProjected && "border-dashed border-purple-300"
                            )}
                          >
                            <span className="text-muted-foreground">{conv.label}</span>
                            <div className="flex items-center gap-2">
                              <span className={cn("font-medium", conv.isProjected && "text-purple-600")}>
                                {formatPercent(conv.rate)}
                                {conv.isProjected && <span className="text-[10px] ml-1">(proj.)</span>}
                              </span>
                              {!conv.isProjected && STATUS_ICONS[conv.status]}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Costs Row */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Custo por Etapa
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { label: "CPL", value: outputs.costs?.cpl },
                        { label: "Custo/MQL", value: outputs.projectedStages?.mql?.isProjected ? outputs.projectedCosts?.custoMql : outputs.costs?.custoMql },
                        { label: "Custo/SQL", value: outputs.projectedStages?.sql?.isProjected ? outputs.projectedCosts?.custoSql : outputs.costs?.custoSql },
                        { label: "Custo/Opp", value: outputs.projectedStages?.oportunidades?.isProjected ? outputs.projectedCosts?.custoOpp : outputs.costs?.custoOpp },
                        { label: "CAC", value: outputs.projectedStages?.contratos?.isProjected ? outputs.projectedCosts?.custoContrato : outputs.costs?.custoContrato },
                      ].map((cost, i) => (
                        <div key={cost.label} className="bg-background rounded border p-2 text-center">
                          <p className="text-[10px] text-muted-foreground">{cost.label}</p>
                          <p className="text-xs font-semibold">{formatCurrency(cost.value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Leads for 1 Contract */}
                  {outputs.leadsForContract && (
                    <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                      <p className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        Leads para 1 Contrato
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-muted-foreground">Leads necessários</p>
                          <p className="font-bold text-purple-600">{formatNumber(outputs.leadsForContract.leadsNeeded)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Investimento estimado</p>
                          <p className="font-bold text-purple-600">{formatCurrency(outputs.leadsForContract.investmentNeeded)}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Cálculo: {outputs.leadsForContract.conversionPath}
                      </p>
                    </div>
                  )}

                  {/* Bottlenecks */}
                  {bottlenecks.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Lightbulb className="h-3 w-3" />
                        Gargalos Identificados
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {bottlenecks.map((b) => (
                          <Badge
                            key={b.key}
                            variant="outline"
                            className={cn(
                              "text-xs",
                              b.status === "critical" && "bg-red-50 text-red-700 border-red-200",
                              b.status === "warning" && "bg-amber-50 text-amber-700 border-amber-200"
                            )}
                          >
                            {b.label}: {formatPercent(b.rate)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Largest Cost Step */}
                  {outputs.largestCostStep && outputs.largestCostStep.delta > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        📈 Maior degrau de custo: <strong>{outputs.largestCostStep.label}</strong> (+{formatCurrency(outputs.largestCostStep.delta)})
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
