import { useState, useMemo, useRef } from "react";
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
} from "@/lib/performanceMatrixPro/benchmarks";
import { 
  FunnelInputs, 
  calculateFunnel, 
  formatPercent, 
  formatCurrency,
  formatNumber,
  identifyBottleneck,
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

  // Calculations
  const benchmark = useMemo(() => getBenchmarkForSetor(setor), [setor]);
  const outputs = useMemo(() => calculateFunnel(inputs), [inputs]);
  const bottleneck = useMemo(() => identifyBottleneck(outputs.stages), [outputs.stages]);
  const insights = useMemo(() => generateInsights(outputs, setor, inputs), [outputs, setor, inputs]);

  // Helpers
  const updateInput = (key: keyof FunnelInputs, value: string) => {
    const parsed = value === '' ? 0 : parseFloat(value);
    setInputs(prev => ({ ...prev, [key]: isNaN(parsed) ? 0 : parsed }));
  };

  const updateOptionalInput = (key: 'cicloVendas' | 'ticketMedio' | 'investimento', value: string) => {
    const parsed = value === '' ? undefined : parseFloat(value);
    setInputs(prev => ({ ...prev, [key]: parsed }));
  };

  // Save diagnostic to database
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
        name: diagnosticName.trim(),
        setor,
        inputs: inputs as unknown as Record<string, unknown>,
        outputs: outputs as unknown as Record<string, unknown>,
        insights: insights as unknown as Record<string, unknown>[],
      } as never);

      if (error) throw error;

      toast({ title: "Diagnóstico salvo com sucesso!" });
      setSaveDialogOpen(false);
      setDiagnosticName('');
    } catch (error) {
      console.error('Error saving diagnostic:', error);
      toast({ title: "Erro ao salvar diagnóstico", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Export as PDF
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

      // Conversion Rates
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Taxas de Conversão", 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Conversão Geral: ${formatPercent(outputs.globalConversion)} (Benchmark: ${formatPercent(benchmark.conversionRate)})`, 14, y);
      y += 6;

      outputs.stages.forEach(stage => {
        const isBottleneck = bottleneck?.key === stage.key;
        doc.text(`${stage.labelShort}: ${formatPercent(stage.rate)}${isBottleneck ? ' ⚠️ GARGALO' : ''}`, 14, y);
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
                {/* Global KPI - Compact */}
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Conversão Geral</p>
                    <p className="text-xl font-bold">
                      {formatPercent(outputs.globalConversion)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Benchmark</p>
                    <p className="text-sm font-medium">{formatPercent(benchmark.conversionRate)}</p>
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

                {/* Stage Conversions - Compact Table */}
                <div className="space-y-1">
                  {outputs.stages.map((stage, idx) => (
                    <div 
                      key={stage.key}
                      className={cn(
                        "flex items-center justify-between py-1 px-2 rounded text-xs",
                        bottleneck?.key === stage.key && "bg-red-50 border border-red-200"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", STAGE_COLORS[idx])} />
                        <span className="truncate">{stage.labelShort}</span>
                        {bottleneck?.key === stage.key && (
                          <Badge variant="destructive" className="text-[10px] h-4 px-1">
                            Gargalo
                          </Badge>
                        )}
                      </div>
                      <span className={cn(
                        "font-medium",
                        !stage.eligible && "text-muted-foreground"
                      )}>
                        {formatPercent(stage.rate)}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator className="my-2" />

                {/* Financial Metrics - Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-muted/30 rounded">
                    <p className="text-[10px] text-muted-foreground mb-0.5">CPL</p>
                    <p className="text-sm font-bold">{formatCurrency(outputs.financial.cpl)}</p>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded">
                    <p className="text-[10px] text-muted-foreground mb-0.5">CAC</p>
                    <p className="text-sm font-bold">{formatCurrency(outputs.financial.cac)}</p>
                  </div>
                  <div className={cn(
                    "text-center p-2 rounded",
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
                  <div className="flex items-center justify-between p-2 bg-amber-50 rounded">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-medium">Velocidade</span>
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
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
