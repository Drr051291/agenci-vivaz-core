import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Zap,
  Users,
  Clock,
  DollarSign,
  HelpCircle,
  Wallet,
  BarChart3,
  Save,
  FileDown,
  Loader2,
  Circle,
  Sparkles,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePageMeta } from "@/hooks/usePageMeta";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { 
  SetorAtuacao, 
  SETORES_LIST, 
  getBenchmarkForSetor,
  StageStatus,
} from "@/lib/performanceMatrixPro/benchmarks";
import { 
  FunnelInputs, 
  FunnelStage,
  calculateFunnel, 
  formatPercent, 
  formatCurrency,
  formatNumber,
  identifyBottleneck,
  simulateFunnel,
  SimulatedRates,
  SimulationResult,
} from "@/lib/performanceMatrixPro/calc";
import { 
  generateInsights,
  Insight,
} from "@/lib/performanceMatrixPro/insights";

// Funnel stage colors
const STAGE_COLORS = [
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-fuchsia-500',
];

// Status colors and indicators
const STATUS_CONFIG: Record<StageStatus, { color: string; bg: string; icon: string; label: string }> = {
  ok: { color: 'text-green-600', bg: 'bg-green-50', icon: '🟢', label: 'OK' },
  warning: { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: '🟡', label: 'Atenção' },
  critical: { color: 'text-red-600', bg: 'bg-red-50', icon: '🔴', label: 'Crítico' },
  no_data: { color: 'text-muted-foreground', bg: 'bg-muted/30', icon: '⚪', label: 'Sem dados' },
};

export default function MatrizPerformancePro() {
  usePageMeta({ title: "Matriz de Performance Pro | Ferramentas" });
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);

  // State
  const [setor, setSetor] = useState<SetorAtuacao>('geral_b2b');
  const [inputs, setInputs] = useState<FunnelInputs>({
    leads: 0,
    mqls: 0,
    sqls: 0,
    oportunidades: 0,
    contratos: 0,
    cicloVendas: undefined,
    ticketMedio: undefined,
    investimento: undefined,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [diagnosticName, setDiagnosticName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  // Simulator state
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simRates, setSimRates] = useState<SimulatedRates>({
    lead_to_mql: 0,
    mql_to_sql: 0,
    sql_to_opp: 0,
    opp_to_sale: 0,
  });
  
  // Save scenario state
  const [saveScenarioDialogOpen, setSaveScenarioDialogOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioNotes, setScenarioNotes] = useState('');
  const [isSavingScenario, setIsSavingScenario] = useState(false);

  // Load clients when dialog opens
  useEffect(() => {
    if (saveDialogOpen && clients.length === 0) {
      const loadClients = async () => {
        setIsLoadingClients(true);
        try {
          const { data, error } = await supabase
            .from('clients')
            .select('id, company_name')
            .eq('status', 'active')
            .order('company_name');
          
          if (error) throw error;
          setClients(data || []);
        } catch (error) {
          console.error('Error loading clients:', error);
        } finally {
          setIsLoadingClients(false);
        }
      };
      loadClients();
    }
  }, [saveDialogOpen, clients.length]);

  // Calculations with sector benchmarks
  const benchmark = useMemo(() => getBenchmarkForSetor(setor), [setor]);
  const outputs = useMemo(() => calculateFunnel(inputs, setor), [inputs, setor]);
  const bottleneck = useMemo(() => identifyBottleneck(outputs.stages), [outputs.stages]);
  const insights = useMemo(() => generateInsights(outputs, setor, inputs), [outputs, setor, inputs]);

  // Simulation results
  const simulationResult = useMemo<SimulationResult | null>(() => {
    if (!simulatorOpen || inputs.leads === 0) return null;
    return simulateFunnel(inputs.leads, simRates, inputs.ticketMedio, inputs.investimento);
  }, [simulatorOpen, inputs.leads, inputs.ticketMedio, inputs.investimento, simRates]);

  // Initialize simulator rates from current data
  const initializeSimulator = () => {
    setSimRates({
      lead_to_mql: outputs.stages[0]?.rate ?? benchmark.stages.lead_to_mql.avg,
      mql_to_sql: outputs.stages[1]?.rate ?? benchmark.stages.mql_to_sql.avg,
      sql_to_opp: outputs.stages[2]?.rate ?? benchmark.stages.sql_to_opp.avg,
      opp_to_sale: outputs.stages[3]?.rate ?? benchmark.stages.opp_to_sale.avg,
    });
    setSimulatorOpen(true);
  };

  // Reset simulator to benchmark averages
  const resetSimToAvg = () => {
    setSimRates({
      lead_to_mql: benchmark.stages.lead_to_mql.avg,
      mql_to_sql: benchmark.stages.mql_to_sql.avg,
      sql_to_opp: benchmark.stages.sql_to_opp.avg,
      opp_to_sale: benchmark.stages.opp_to_sale.avg,
    });
  };

  // Helpers
  const updateInput = (key: keyof FunnelInputs, value: string) => {
    const parsed = value === '' ? 0 : parseFloat(value);
    setInputs(prev => ({ ...prev, [key]: isNaN(parsed) ? 0 : parsed }));
  };

  const updateOptionalInput = (key: 'cicloVendas' | 'ticketMedio' | 'investimento', value: string) => {
    const parsed = value === '' ? undefined : parseFloat(value);
    setInputs(prev => ({ ...prev, [key]: parsed }));
  };

  // Save diagnostic to database - Updated to include new fields
  const handleSave = async () => {
    if (!diagnosticName.trim()) {
      toast({ title: "Digite um nome para o diagnóstico", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Faça login para salvar", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from('performance_matrix_diagnostics' as never).insert({
        user_id: user.id,
        client_id: selectedClientId || null,
        name: diagnosticName.trim(),
        tool_type: 'performance_pro',
        setor,
        inputs: inputs as unknown as Record<string, unknown>,
        outputs: {
          ...outputs,
          stages: outputs.stages.map(s => ({
            key: s.key,
            label: s.label,
            labelShort: s.labelShort,
            rate: s.rate,
            status: s.status,
            benchmark: s.benchmark,
          })),
        } as unknown as Record<string, unknown>,
        insights: insights as unknown as Record<string, unknown>[],
        status: 'published',
      } as never);

      if (error) throw error;

      toast({ 
        title: "Diagnóstico salvo com sucesso!",
        description: selectedClientId ? "O cliente poderá visualizar na área de performance." : undefined,
      });
      setSaveDialogOpen(false);
      setDiagnosticName('');
      setSelectedClientId(null);
    } catch (error) {
      console.error('Error saving diagnostic:', error);
      toast({ title: "Erro ao salvar diagnóstico", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Save simulation scenario for client
  const handleSaveScenario = async () => {
    if (!scenarioName.trim()) {
      toast({ title: "Digite um nome para o cenário", variant: "destructive" });
      return;
    }
    if (!selectedClientId) {
      toast({ title: "Selecione um cliente", variant: "destructive" });
      return;
    }
    if (!simulationResult) {
      toast({ title: "Execute uma simulação primeiro", variant: "destructive" });
      return;
    }

    setIsSavingScenario(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Faça login para salvar", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from('performance_simulation_scenarios' as never).insert({
        client_id: selectedClientId,
        created_by: user.id,
        name: scenarioName.trim(),
        setor,
        inputs: inputs,
        simulated_rates: simRates,
        current_results: {
          contratos: inputs.contratos,
          revenue: outputs.financial.revenue,
          roi: outputs.financial.roi,
          cac: outputs.financial.cac,
          globalConversion: outputs.globalConversion,
          stages: outputs.stages.map(s => ({
            key: s.key,
            label: s.label,
            rate: s.rate,
            status: s.status,
          })),
        },
        simulated_results: {
          leads: simulationResult.leads,
          mqls: simulationResult.mqls,
          sqls: simulationResult.sqls,
          oportunidades: simulationResult.oportunidades,
          contratos: simulationResult.contratos,
          revenue: simulationResult.revenue,
          roi: simulationResult.roi,
          cac: simulationResult.cac,
          globalConversion: simulationResult.globalConversion,
        },
        benchmark_data: {
          label: benchmark.label,
          conversionRange: benchmark.conversionRange,
          stages: benchmark.stages,
        },
        notes: scenarioNotes.trim() || null,
      } as never);

      if (error) throw error;

      toast({ title: "Cenário salvo com sucesso!", description: "O cliente poderá visualizar na área de performance." });
      setSaveScenarioDialogOpen(false);
      setScenarioName('');
      setScenarioNotes('');
    } catch (error) {
      console.error('Error saving scenario:', error);
      toast({ title: "Erro ao salvar cenário", variant: "destructive" });
    } finally {
      setIsSavingScenario(false);
    }
  };
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Matriz de Performance Pro", pageWidth / 2, y, { align: "center" });
      y += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Setor: ${benchmark.label} | Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, y, { align: "center" });
      y += 15;

      // Funnel Data
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Dados do Funil", 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const funnelData = [
        `Leads: ${formatNumber(inputs.leads)}`,
        `MQL: ${formatNumber(inputs.mqls)}`,
        `SQL: ${formatNumber(inputs.sqls)}`,
        `Oportunidades: ${formatNumber(inputs.oportunidades)}`,
        `Contratos: ${formatNumber(inputs.contratos)}`,
      ];
      funnelData.forEach(line => {
        doc.text(line, 14, y);
        y += 6;
      });
      y += 5;

      // Conversion Rates with Benchmarks
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Taxas de Conversão (vs Benchmark)", 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Conversão Geral: ${formatPercent(outputs.globalConversion)} (Meta: ${benchmark.conversionRange.min}-${benchmark.conversionRange.max}%)`, 14, y);
      y += 6;

      outputs.stages.forEach(stage => {
        const isBottleneck = bottleneck?.key === stage.key;
        const statusIcon = STATUS_CONFIG[stage.status].icon;
        const benchmarkText = stage.benchmark ? `Meta: ${stage.benchmark.min}-${stage.benchmark.max}%` : '';
        doc.text(`${statusIcon} ${stage.labelShort}: ${formatPercent(stage.rate)} | ${benchmarkText}${isBottleneck ? ' ⚠️ GARGALO' : ''}`, 14, y);
        y += 6;
      });
      y += 5;

      // Financial Metrics
      if (inputs.investimento) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Métricas Financeiras", 14, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`CPL: ${formatCurrency(outputs.financial.cpl)}`, 14, y);
        y += 6;
        doc.text(`CAC: ${formatCurrency(outputs.financial.cac)}`, 14, y);
        y += 6;
        if (outputs.financial.roi !== null) {
          doc.text(`ROI: ${outputs.financial.roi.toFixed(0)}%`, 14, y);
          y += 6;
        }
        y += 5;
      }

      // Insights
      if (insights.length > 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Diagnóstico & Ações", 14, y);
        y += 8;

        insights.forEach(insight => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }

          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          const typeLabel = insight.type === 'critical' ? '❌' : insight.type === 'warning' ? '⚠️' : insight.type === 'success' ? '✅' : 'ℹ️';
          doc.text(`${typeLabel} ${insight.title}`, 14, y);
          y += 6;

          if (insight.diagnosis) {
            doc.setFont("helvetica", "normal");
            const diagLines = doc.splitTextToSize(insight.diagnosis, pageWidth - 28);
            diagLines.forEach((line: string) => {
              doc.text(line, 14, y);
              y += 5;
            });
          }

          if (insight.action) {
            doc.setFont("helvetica", "italic");
            const actionLines = doc.splitTextToSize(`→ ${insight.action}`, pageWidth - 28);
            actionLines.forEach((line: string) => {
              doc.text(line, 14, y);
              y += 5;
            });
          }
          y += 4;
        });
      }

      // Footer
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Hub Vivaz - Matriz de Performance Pro | Benchmark Brasil 2025", pageWidth / 2, 290, { align: "center" });

      doc.save(`diagnostico-performance-${new Date().toISOString().slice(0,10)}.pdf`);
      toast({ title: "PDF exportado com sucesso!" });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({ title: "Erro ao exportar PDF", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  // Get insight icon
  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />;
      case 'critical': return <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />;
      default: return <Info className="h-4 w-4 text-blue-500 shrink-0" />;
    }
  };

  // Get insight border color
  const getInsightBorder = (type: Insight['type']) => {
    switch (type) {
      case 'success': return 'border-l-4 border-l-green-500';
      case 'warning': return 'border-l-4 border-l-yellow-500';
      case 'critical': return 'border-l-4 border-l-red-500';
      default: return 'border-l-4 border-l-blue-500';
    }
  };

  // Render status indicator
  const renderStatusIndicator = (status: StageStatus) => {
    const config = STATUS_CONFIG[status];
    return (
      <Tooltip>
        <TooltipTrigger>
          <span className="text-sm">{config.icon}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.label}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="space-y-4">
          {/* Header - Compact */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/ferramentas')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Matriz de Performance Pro</h1>
                <p className="text-muted-foreground text-xs">
                  Benchmark Brasil 2025 • {benchmark.label}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={simulatorOpen ? "default" : "outline"}
                size="sm"
                onClick={() => simulatorOpen ? setSimulatorOpen(false) : initializeSimulator()}
                disabled={inputs.leads === 0}
                className={simulatorOpen ? "bg-gradient-to-r from-purple-500 to-indigo-500" : ""}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                E se?
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveDialogOpen(true)}
                disabled={inputs.leads === 0}
              >
                <Save className="h-4 w-4 mr-1" />
                Salvar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={isExporting || inputs.leads === 0}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-1" />
                )}
                PDF
              </Button>
            </div>
          </div>

          {/* Simulator Panel */}
          {simulatorOpen && (
            <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50/50 to-indigo-50/50">
              <CardHeader className="pb-2 px-4 pt-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    Simulador "E se?"
                    <Badge variant="secondary" className="text-[10px]">Ajuste as taxas e veja o impacto</Badge>
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={resetSimToAvg} className="h-7 text-xs">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Usar média do setor
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Rate Sliders */}
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground font-medium">Taxas de Conversão Simuladas</p>
                    {[
                      { key: 'lead_to_mql' as const, label: 'Lead → MQL', current: outputs.stages[0]?.rate },
                      { key: 'mql_to_sql' as const, label: 'MQL → SQL', current: outputs.stages[1]?.rate },
                      { key: 'sql_to_opp' as const, label: 'SQL → Opp', current: outputs.stages[2]?.rate },
                      { key: 'opp_to_sale' as const, label: 'Opp → Venda', current: outputs.stages[3]?.rate },
                    ].map(({ key, label, current }) => (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Atual: {formatPercent(current)}</span>
                            <span className="font-bold text-purple-600">{simRates[key].toFixed(1)}%</span>
                          </div>
                        </div>
                        <Input
                          type="range"
                          min={0}
                          max={100}
                          step={0.5}
                          value={simRates[key]}
                          onChange={(e) => setSimRates(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                          className="h-2 accent-purple-500"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>0%</span>
                          <span className="text-purple-400">Meta: {benchmark.stages[key].avg}%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Right: Results Comparison */}
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground font-medium">Impacto Projetado</p>
                    {simulationResult && (
                      <div className="space-y-2">
                        {/* Contracts Comparison */}
                        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border">
                          <div className="flex-1">
                            <p className="text-[10px] text-muted-foreground">Contratos Atuais</p>
                            <p className="text-lg font-bold">{formatNumber(inputs.contratos)}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-purple-400" />
                          <div className="flex-1 text-right">
                            <p className="text-[10px] text-muted-foreground">Contratos Simulados</p>
                            <p className={cn(
                              "text-lg font-bold",
                              simulationResult.contratos > inputs.contratos ? "text-green-600" : 
                              simulationResult.contratos < inputs.contratos ? "text-red-600" : ""
                            )}>
                              {formatNumber(simulationResult.contratos)}
                              {simulationResult.contratos !== inputs.contratos && (
                                <span className="text-xs ml-1">
                                  ({simulationResult.contratos > inputs.contratos ? '+' : ''}{simulationResult.contratos - inputs.contratos})
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Revenue Comparison */}
                        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border">
                          <div className="flex-1">
                            <p className="text-[10px] text-muted-foreground">Faturamento Atual</p>
                            <p className="text-lg font-bold">{formatCurrency(outputs.financial.revenue)}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-purple-400" />
                          <div className="flex-1 text-right">
                            <p className="text-[10px] text-muted-foreground">Faturamento Simulado</p>
                            <p className={cn(
                              "text-lg font-bold",
                              (simulationResult.revenue ?? 0) > (outputs.financial.revenue ?? 0) ? "text-green-600" : 
                              (simulationResult.revenue ?? 0) < (outputs.financial.revenue ?? 0) ? "text-red-600" : ""
                            )}>
                              {formatCurrency(simulationResult.revenue)}
                            </p>
                          </div>
                        </div>

                        {/* ROI Comparison */}
                        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border">
                          <div className="flex-1">
                            <p className="text-[10px] text-muted-foreground">ROI Atual</p>
                            <p className="text-lg font-bold">
                              {outputs.financial.roi !== null ? `${outputs.financial.roi.toFixed(0)}%` : '—'}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-purple-400" />
                          <div className="flex-1 text-right">
                            <p className="text-[10px] text-muted-foreground">ROI Simulado</p>
                            <p className={cn(
                              "text-lg font-bold",
                              (simulationResult.roi ?? 0) > (outputs.financial.roi ?? 0) ? "text-green-600" : 
                              (simulationResult.roi ?? 0) < (outputs.financial.roi ?? 0) ? "text-red-600" : ""
                            )}>
                              {simulationResult.roi !== null ? `${simulationResult.roi.toFixed(0)}%` : '—'}
                            </p>
                          </div>
                        </div>

                        {/* Funnel Flow Preview */}
                        <div className="p-2 bg-purple-50 rounded-lg border border-purple-100">
                          <p className="text-[10px] text-purple-600 font-medium mb-1">Funil Simulado</p>
                          <div className="flex items-center justify-between text-[10px]">
                            <span>{formatNumber(simulationResult.leads)} Leads</span>
                            <span>→</span>
                            <span>{formatNumber(simulationResult.mqls)} MQL</span>
                            <span>→</span>
                            <span>{formatNumber(simulationResult.sqls)} SQL</span>
                            <span>→</span>
                            <span>{formatNumber(simulationResult.oportunidades)} Opp</span>
                            <span>→</span>
                            <span className="font-bold text-purple-600">{formatNumber(simulationResult.contratos)} ✓</span>
                          </div>
                        </div>

                        {/* Conversion Rate */}
                        <div className="text-center p-2 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg">
                          <p className="text-[10px] text-muted-foreground">Conversão Geral Simulada</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {formatPercent(simulationResult.globalConversion)}
                          </p>
                          {simulationResult.globalConversion !== null && outputs.globalConversion !== null && (
                            <p className={cn(
                              "text-xs",
                              simulationResult.globalConversion > outputs.globalConversion ? "text-green-600" : "text-red-600"
                            )}>
                              {simulationResult.globalConversion > outputs.globalConversion ? '+' : ''}
                              {(simulationResult.globalConversion - outputs.globalConversion).toFixed(2)}pp vs atual
                            </p>
                          )}
                        </div>

                        {/* Save Scenario Button */}
                        <Button 
                          className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
                          size="sm"
                          onClick={() => {
                            if (!selectedClientId) {
                              // Ensure clients are loaded
                              if (clients.length === 0) {
                                const loadClients = async () => {
                                  const { data } = await supabase
                                    .from('clients')
                                    .select('id, company_name')
                                    .eq('status', 'active')
                                    .order('company_name');
                                  setClients(data || []);
                                };
                                loadClients();
                              }
                            }
                            setSaveScenarioDialogOpen(true);
                          }}
                          disabled={!simulationResult}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Salvar Cenário para Cliente
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Grid: 3-5-4 layout */}
          <div className="grid grid-cols-12 gap-4">
            {/* Left Column - Inputs (3 cols = 25%) */}
            <Card className="col-span-12 md:col-span-3">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Dados do Funil
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-3">
                {/* Sector */}
                <div className="space-y-1">
                  <Label className="text-xs">Setor</Label>
                  <Select value={setor} onValueChange={(v) => setSetor(v as SetorAtuacao)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SETORES_LIST.map(s => (
                        <SelectItem key={s.value} value={s.value} className="text-xs">
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Funnel Fields */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Leads</Label>
                    <Input 
                      type="number" 
                      className="h-8 text-xs"
                      value={inputs.leads || ''} 
                      onChange={e => updateInput('leads', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      MQL
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Marketing Qualified Lead</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input 
                      type="number" 
                      className="h-8 text-xs"
                      value={inputs.mqls || ''} 
                      onChange={e => updateInput('mqls', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      SQL
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Sales Qualified Lead</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input 
                      type="number" 
                      className="h-8 text-xs"
                      value={inputs.sqls || ''} 
                      onChange={e => updateInput('sqls', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Oportunidades</Label>
                    <Input 
                      type="number" 
                      className="h-8 text-xs"
                      value={inputs.oportunidades || ''} 
                      onChange={e => updateInput('oportunidades', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Contratos Fechados</Label>
                  <Input 
                    type="number" 
                    className="h-8 text-xs"
                    value={inputs.contratos || ''} 
                    onChange={e => updateInput('contratos', e.target.value)}
                    placeholder="0"
                  />
                </div>

                <Separator className="my-2" />

                {/* Financial & Optional */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Wallet className="h-3 w-3" />
                    Investimento em Tráfego
                  </Label>
                  <Input 
                    type="number" 
                    className="h-8 text-xs"
                    value={inputs.investimento ?? ''} 
                    onChange={e => updateOptionalInput('investimento', e.target.value)}
                    placeholder="R$ 0,00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Ciclo (dias)
                    </Label>
                    <Input 
                      type="number" 
                      className="h-8 text-xs"
                      value={inputs.cicloVendas ?? ''} 
                      onChange={e => updateOptionalInput('cicloVendas', e.target.value)}
                      placeholder="—"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Ticket Médio
                    </Label>
                    <Input 
                      type="number" 
                      className="h-8 text-xs"
                      value={inputs.ticketMedio ?? ''} 
                      onChange={e => updateOptionalInput('ticketMedio', e.target.value)}
                      placeholder="—"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Middle Column - Funnel + Metrics (5 cols = 40%) */}
            <Card className="col-span-12 md:col-span-5">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Funil de Vendas
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-3">
                {/* Global KPI - Compact with benchmark range */}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                  <div>
                    <p className="text-xs text-muted-foreground">Conversão Geral</p>
                    <p className={cn(
                      "text-2xl font-bold",
                      outputs.globalConversion !== null && outputs.globalConversion >= benchmark.conversionRange.min
                        ? "text-green-600"
                        : outputs.globalConversion !== null && outputs.globalConversion < benchmark.conversionRange.min
                          ? "text-red-600"
                          : ""
                    )}>
                      {formatPercent(outputs.globalConversion)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Meta ({benchmark.label})</p>
                    <p className="text-lg font-semibold text-primary">
                      {benchmark.conversionRange.min}-{benchmark.conversionRange.max}%
                    </p>
                  </div>
                </div>

                {/* Funnel Bars - Responsive */}
                <div className="space-y-1">
                  {[
                    { label: 'Leads', value: inputs.leads },
                    { label: 'MQL', value: inputs.mqls },
                    { label: 'SQL', value: inputs.sqls },
                    { label: 'Opp', value: inputs.oportunidades },
                    { label: 'Contratos', value: inputs.contratos },
                  ].map((stage, idx, arr) => {
                    const maxValue = Math.max(...arr.map(s => s.value), 1);
                    const width = stage.value > 0 ? (stage.value / maxValue) * 100 : 5;
                    
                    return (
                      <div key={stage.label} className="flex items-center gap-2">
                        <div className="w-16 text-xs text-right text-muted-foreground shrink-0">
                          {stage.label}
                        </div>
                        <div className="flex-1 h-6 bg-muted/30 rounded overflow-hidden relative">
                          <div 
                            className={cn(
                              "h-full transition-all duration-300 rounded flex items-center justify-end px-2",
                              STAGE_COLORS[idx]
                            )}
                            style={{ width: `${Math.max(width, 8)}%`, minWidth: '32px' }}
                          >
                            {stage.value > 0 && (
                              <span className="text-white text-xs font-medium">
                                {formatNumber(stage.value)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Stage Conversions - Enhanced Meta vs Realizado Table */}
                <div className="rounded-lg border overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-1 bg-muted/50 px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase">
                    <div className="col-span-4">Etapa</div>
                    <div className="col-span-3 text-center">Realizado</div>
                    <div className="col-span-3 text-center">Meta</div>
                    <div className="col-span-2 text-center">Status</div>
                  </div>
                  
                  {/* Table Body */}
                  {outputs.stages.map((stage, idx) => {
                    const isBottleneck = bottleneck?.key === stage.key;
                    const config = STATUS_CONFIG[stage.status];
                    const gap = stage.rate !== null && stage.benchmark 
                      ? stage.rate - stage.benchmark.avg 
                      : null;
                    
                    return (
                      <Tooltip key={stage.key}>
                        <TooltipTrigger asChild>
                          <div 
                            className={cn(
                              "grid grid-cols-12 gap-1 items-center px-2 py-2 cursor-help border-t transition-colors hover:bg-muted/30",
                              isBottleneck && "bg-red-50/50 border-l-2 border-l-red-500"
                            )}
                          >
                            {/* Etapa */}
                            <div className="col-span-4 flex items-center gap-1.5">
                              <div className={cn("w-2 h-2 rounded-full shrink-0", STAGE_COLORS[idx])} />
                              <span className="text-xs font-medium truncate">{stage.labelShort}</span>
                              {isBottleneck && (
                                <Badge variant="destructive" className="text-[8px] h-3 px-1 ml-auto">
                                  Gargalo
                                </Badge>
                              )}
                            </div>
                            
                            {/* Realizado */}
                            <div className="col-span-3 text-center">
                              <span className={cn(
                                "text-sm font-bold",
                                config.color
                              )}>
                                {formatPercent(stage.rate)}
                              </span>
                            </div>
                            
                            {/* Meta */}
                            <div className="col-span-3 text-center">
                              {stage.benchmark ? (
                                <div className="text-xs">
                                  <span className="text-muted-foreground">
                                    {stage.benchmark.min}-{stage.benchmark.max}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                            
                            {/* Status + Gap */}
                            <div className="col-span-2 flex flex-col items-center gap-0.5">
                              <span className="text-sm">{config.icon}</span>
                              {gap !== null && stage.rate !== null && (
                                <span className={cn(
                                  "text-[9px] font-medium",
                                  gap >= 0 ? "text-green-600" : "text-red-600"
                                )}>
                                  {gap >= 0 ? '+' : ''}{gap.toFixed(1)}pp
                                </span>
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <div className="space-y-1.5">
                            <p className="font-medium text-sm">{stage.label}</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="text-muted-foreground">Realizado</p>
                                <p className="font-bold">{formatPercent(stage.rate)}</p>
                              </div>
                              {stage.benchmark && (
                                <div>
                                  <p className="text-muted-foreground">Meta (média)</p>
                                  <p className="font-bold">{stage.benchmark.avg}%</p>
                                </div>
                              )}
                            </div>
                            {stage.benchmark && (
                              <p className="text-[10px] text-muted-foreground">
                                Faixa esperada: {stage.benchmark.min}% - {stage.benchmark.max}%
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground border-t pt-1">
                              {stage.from} → {stage.to}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>

                {/* Status Legend */}
                <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
                  <span>🟢 ≥ Média</span>
                  <span>🟡 Entre mín. e média</span>
                  <span>🔴 {'<'} Mínimo</span>
                </div>

                <Separator className="my-2" />

                {/* Financial Metrics - Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-muted/30 rounded-lg">
                    <p className="text-[10px] text-muted-foreground mb-0.5">CPL</p>
                    <p className="text-sm font-bold">{formatCurrency(outputs.financial.cpl)}</p>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded-lg">
                    <p className="text-[10px] text-muted-foreground mb-0.5">CAC</p>
                    <p className="text-sm font-bold">{formatCurrency(outputs.financial.cac)}</p>
                  </div>
                  <div className={cn(
                    "text-center p-2 rounded-lg",
                    outputs.financial.roi !== null && outputs.financial.roi < 0 
                      ? "bg-red-50" 
                      : outputs.financial.roi !== null && outputs.financial.roi > 100
                        ? "bg-green-50"
                        : "bg-muted/30"
                  )}>
                    <p className="text-[10px] text-muted-foreground mb-0.5">ROI</p>
                    <p className={cn(
                      "text-sm font-bold",
                      outputs.financial.roi !== null && outputs.financial.roi < 0 && "text-red-600",
                      outputs.financial.roi !== null && outputs.financial.roi > 100 && "text-green-600"
                    )}>
                      {outputs.financial.roi !== null ? `${outputs.financial.roi.toFixed(0)}%` : '—'}
                    </p>
                  </div>
                </div>

                {/* Sales Velocity */}
                {outputs.salesVelocity !== null && (
                  <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-medium">Velocidade de Vendas</span>
                    </div>
                    <span className="font-bold text-sm">
                      {formatCurrency(outputs.salesVelocity)}/dia
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Column - Insights (4 cols = 35%) */}
            <Card className="col-span-12 md:col-span-4">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Diagnóstico & Ações
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <ScrollArea className="h-[calc(100vh-280px)] pr-2">
                  {insights.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      Preencha os dados para receber insights.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {insights.map(insight => (
                        <div 
                          key={insight.id}
                          className={cn(
                            "p-2 rounded-lg bg-card",
                            getInsightBorder(insight.type)
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {getInsightIcon(insight.type)}
                            <div className="flex-1 min-w-0 space-y-1">
                              {insight.stage && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1">
                                  {insight.stage}
                                </Badge>
                              )}
                              <p className="text-xs font-medium leading-tight">
                                {insight.title}
                              </p>
                              {insight.diagnosis && (
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                  {insight.diagnosis}
                                </p>
                              )}
                              {insight.action && (
                                <p className="text-[11px] font-medium text-primary leading-snug">
                                  → {insight.action}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Save Dialog */}
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Salvar Diagnóstico</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do diagnóstico</Label>
                  <Input
                    id="name"
                    value={diagnosticName}
                    onChange={(e) => setDiagnosticName(e.target.value)}
                    placeholder="Ex: Análise Q1 2025"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Vincular a cliente (opcional)</Label>
                  <Select 
                    value={selectedClientId || "none"} 
                    onValueChange={(v) => setSelectedClientId(v === "none" ? null : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isLoadingClients ? "Carregando..." : "Selecione um cliente"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum cliente</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Save Scenario Dialog */}
          <Dialog open={saveScenarioDialogOpen} onOpenChange={setSaveScenarioDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Salvar Cenário de Simulação
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="scenario-name">Nome do cenário</Label>
                  <Input
                    id="scenario-name"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    placeholder="Ex: Cenário Otimista Q1 2025"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scenario-client">Cliente *</Label>
                  <Select 
                    value={selectedClientId || ""} 
                    onValueChange={(v) => setSelectedClientId(v || null)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isLoadingClients ? "Carregando..." : "Selecione um cliente"} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    O cenário ficará visível na área de Performance do cliente
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scenario-notes">Observações (opcional)</Label>
                  <Input
                    id="scenario-notes"
                    value={scenarioNotes}
                    onChange={(e) => setScenarioNotes(e.target.value)}
                    placeholder="Ex: Meta agressiva de conversão"
                  />
                </div>

                {/* Preview */}
                {simulationResult && (
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 space-y-2">
                    <p className="text-xs font-medium text-purple-700">Resumo do cenário:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Setor:</span>{' '}
                        <span className="font-medium">{benchmark.label}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Leads:</span>{' '}
                        <span className="font-medium">{formatNumber(inputs.leads)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Contratos simulados:</span>{' '}
                        <span className="font-medium text-purple-600">{formatNumber(simulationResult.contratos)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Conversão:</span>{' '}
                        <span className="font-medium text-purple-600">{formatPercent(simulationResult.globalConversion)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSaveScenarioDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveScenario} 
                  disabled={isSavingScenario || !selectedClientId}
                  className="bg-gradient-to-r from-purple-500 to-indigo-500"
                >
                  {isSavingScenario ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Cenário
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
