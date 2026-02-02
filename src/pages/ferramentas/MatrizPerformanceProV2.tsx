import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Users,
  DollarSign,
  HelpCircle,
  Save,
  FileDown,
  Loader2,
  ChevronDown,
  ChevronUp,
  Target,
  Zap,
  BarChart3,
  ArrowRight,
  AlertCircle,
  Lightbulb,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePageMeta } from "@/hooks/usePageMeta";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import {
  FunnelInputsV2,
  FunnelOutputsV2,
  ConversionRate,
  Projection,
  BENCHMARKS,
  PROJECTION_SCENARIOS,
  calculateFunnelV2,
  getBottlenecks,
  getStageActions,
  formatCurrency,
  formatPercent,
  formatNumber,
} from "@/lib/performanceMatrixPro/calcV2";

// Period options
const PERIOD_OPTIONS = [
  { value: 'mes_passado', label: 'Mês passado' },
  { value: 'ultimo_trimestre', label: 'Último trimestre' },
  { value: 'ultimo_semestre', label: 'Último semestre' },
  { value: 'customizado', label: 'Personalizado' },
];

// Status config
const STATUS_CONFIG = {
  ok: { color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30', icon: '🟢', label: 'OK' },
  warning: { color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', icon: '🟡', label: 'Atenção' },
  critical: { color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', icon: '🔴', label: 'Crítico' },
  no_data: { color: 'text-muted-foreground', bg: 'bg-muted/30', icon: '⚪', label: 'Sem dados' },
};

export default function MatrizPerformanceProV2() {
  usePageMeta({ title: "Matriz de Performance Pro | Ferramentas" });
  const navigate = useNavigate();

  // State
  const [inputs, setInputs] = useState<FunnelInputsV2>({
    investimento: 0,
    leads: 0,
    mql: 0,
    sql: 0,
    oportunidades: 0,
    contratos: undefined,
    ticketMedio: undefined,
    periodo: 'mes_passado',
    cicloDias: undefined,
  });
  
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<'conservador' | 'realista' | 'agressivo'>('realista');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [diagnosticName, setDiagnosticName] = useState('');

  // Calculations
  const outputs = useMemo(() => calculateFunnelV2(inputs), [inputs]);
  const bottlenecks = useMemo(() => getBottlenecks(outputs.conversions), [outputs.conversions]);
  const selectedProjection = useMemo(() => 
    outputs.projections?.find(p => p.scenario === selectedScenario) ?? null,
    [outputs.projections, selectedScenario]
  );

  // Check if required fields are filled
  const requiredFields = [
    { key: 'investimento', label: 'Investimento em mídia', value: inputs.investimento },
    { key: 'leads', label: 'Número de leads', value: inputs.leads },
    { key: 'mql', label: 'Número de MQL', value: inputs.mql },
    { key: 'sql', label: 'Número de SQL', value: inputs.sql },
    { key: 'oportunidades', label: 'Número de oportunidades', value: inputs.oportunidades },
  ];
  const missingFields = requiredFields.filter(f => !f.value || f.value === 0);

  // Input handlers
  const updateInput = useCallback((key: keyof FunnelInputsV2, value: string) => {
    const parsed = value === '' ? 0 : parseFloat(value);
    setInputs(prev => ({ ...prev, [key]: isNaN(parsed) ? 0 : parsed }));
  }, []);

  const updateOptionalInput = useCallback((key: keyof FunnelInputsV2, value: string) => {
    const parsed = value === '' ? undefined : parseFloat(value);
    setInputs(prev => ({ ...prev, [key]: parsed }));
  }, []);

  // Save handler
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

      // Save to inside_sales_diagnostics
      const insertData = {
        client_name: diagnosticName.trim(),
        channel: 'performance_pro_v2',
        period_label: inputs.periodo || null,
        inputs: JSON.parse(JSON.stringify(inputs)),
        outputs: JSON.parse(JSON.stringify(outputs)),
        targets: JSON.parse(JSON.stringify({ 
          scenario: selectedScenario,
          projection: selectedProjection,
        })),
        stage_status: JSON.parse(JSON.stringify(outputs.conversions.reduce((acc, c) => ({ 
          ...acc, 
          [c.key]: c.status 
        }), {}))),
        created_by: user.id,
      };

      const { error } = await supabase.from('inside_sales_diagnostics').insert([insertData]);

      if (error) throw error;

      toast({ title: "Diagnóstico salvo com sucesso!" });
      setSaveDialogOpen(false);
      setDiagnosticName('');
    } catch (error) {
      console.error('Error saving:', error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // PDF Export
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
      doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, y, { align: "center" });
      y += 15;

      // Dados do Funil
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Dados do Funil", 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const funnelData = [
        `Investimento: ${formatCurrency(inputs.investimento)}`,
        `Leads: ${formatNumber(inputs.leads)}`,
        `MQL: ${formatNumber(inputs.mql)}`,
        `SQL: ${formatNumber(inputs.sql)}`,
        `Oportunidades: ${formatNumber(inputs.oportunidades)}`,
        inputs.contratos !== undefined ? `Contratos: ${formatNumber(inputs.contratos)}` : 'Contratos: Projetado',
      ];
      funnelData.forEach(line => {
        doc.text(line, 14, y);
        y += 6;
      });
      y += 5;

      // Custo por Etapa
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Custo por Etapa", 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`CPL: ${formatCurrency(outputs.costs.cpl)}`, 14, y); y += 6;
      doc.text(`Custo/MQL: ${formatCurrency(outputs.costs.custoMql)}`, 14, y); y += 6;
      doc.text(`Custo/SQL: ${formatCurrency(outputs.costs.custoSql)}`, 14, y); y += 6;
      doc.text(`Custo/Opp: ${formatCurrency(outputs.costs.custoOpp)}`, 14, y); y += 6;
      if (outputs.costs.custoContrato) {
        doc.text(`CAC (real): ${formatCurrency(outputs.costs.custoContrato)}`, 14, y);
      } else if (selectedProjection) {
        doc.text(`CAC projetado (${selectedProjection.label}): ${formatCurrency(selectedProjection.cacProjetado)}`, 14, y);
      }
      y += 10;

      // Taxas de Conversão
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Taxas de Conversão (vs Meta)", 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      outputs.conversions.forEach(conv => {
        const status = STATUS_CONFIG[conv.status];
        doc.text(`${status.icon} ${conv.label}: ${formatPercent(conv.rate)} (Meta: ${conv.benchmark.min}-${conv.benchmark.max}%)`, 14, y);
        y += 6;
      });
      y += 5;

      // Gargalos
      if (bottlenecks.length > 0) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Principais Gargalos", 14, y);
        y += 8;

        doc.setFontSize(10);
        bottlenecks.forEach(b => {
          doc.setFont("helvetica", "bold");
          doc.text(`${b.label} (${formatPercent(b.rate)})`, 14, y);
          y += 5;
          
          const actions = getStageActions(b.key);
          doc.setFont("helvetica", "normal");
          actions.slice(0, 2).forEach(action => {
            doc.text(`  → ${action}`, 14, y);
            y += 5;
          });
          y += 3;
        });
      }

      // Footer
      doc.setFontSize(8);
      doc.text("Hub Vivaz - Matriz de Performance Pro", pageWidth / 2, 290, { align: "center" });

      doc.save(`matriz-performance-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: "PDF exportado com sucesso!" });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({ title: "Erro ao exportar PDF", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/ferramentas')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Matriz de Performance Pro</h1>
                <p className="text-muted-foreground text-xs">
                  Custo por etapa • Gargalos • CAC projetado
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveDialogOpen(true)}
                disabled={missingFields.length > 0}
              >
                <Save className="h-4 w-4 mr-1" />
                Salvar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={isExporting || missingFields.length > 0}
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

          {/* Validation Errors */}
          {outputs.validationErrors.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Os valores parecem inconsistentes
                  </p>
                  <ul className="text-xs text-amber-600 dark:text-amber-500 space-y-0.5">
                    {outputs.validationErrors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Main 3-Column Layout */}
          <div className="grid grid-cols-12 gap-4">
            {/* LEFT: Dados do Funil */}
            <Card className="col-span-12 lg:col-span-3">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Dados do Funil
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                {/* Investimento (Required, highlighted) */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Investimento em mídia (R$) *
                  </Label>
                  <Input
                    type="number"
                    className="h-9"
                    value={inputs.investimento || ''}
                    onChange={e => updateInput('investimento', e.target.value)}
                    placeholder="0"
                  />
                  {inputs.investimento > 0 && inputs.leads > 0 && (
                    <p className="text-xs text-muted-foreground">
                      CPL: <span className="font-medium text-primary">{formatCurrency(outputs.costs.cpl)}</span>
                    </p>
                  )}
                </div>

                {/* Required Funnel Fields */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Leads *</Label>
                    <Input
                      type="number"
                      className="h-9"
                      value={inputs.leads || ''}
                      onChange={e => updateInput('leads', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1">
                      MQL *
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
                      className="h-9"
                      value={inputs.mql || ''}
                      onChange={e => updateInput('mql', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1">
                      SQL *
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
                      className="h-9"
                      value={inputs.sql || ''}
                      onChange={e => updateInput('sql', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs">Oportunidades *</Label>
                    <Input
                      type="number"
                      className="h-9"
                      value={inputs.oportunidades || ''}
                      onChange={e => updateInput('oportunidades', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                <Separator />

                {/* Optional Advanced Section */}
                <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between h-8 px-2">
                      <span className="text-xs font-medium">Avançado</span>
                      {advancedOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Contratos fechados</Label>
                      <Input
                        type="number"
                        className="h-9"
                        value={inputs.contratos ?? ''}
                        onChange={e => updateOptionalInput('contratos', e.target.value)}
                        placeholder="Deixe vazio para projetar"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label className="text-xs">Ticket médio (R$)</Label>
                      <Input
                        type="number"
                        className="h-9"
                        value={inputs.ticketMedio ?? ''}
                        onChange={e => updateOptionalInput('ticketMedio', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label className="text-xs">Período</Label>
                      <Select 
                        value={inputs.periodo} 
                        onValueChange={v => setInputs(prev => ({ ...prev, periodo: v }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PERIOD_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label className="text-xs">Ciclo de vendas (dias)</Label>
                      <Input
                        type="number"
                        className="h-9"
                        value={inputs.cicloDias ?? ''}
                        onChange={e => updateOptionalInput('cicloDias', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            {/* CENTER: Funil + Custos */}
            <Card className="col-span-12 lg:col-span-5">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Funil de Vendas
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                {/* Missing Fields Checklist */}
                {missingFields.length > 0 ? (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Faltam dados para gerar a análise:
                    </p>
                    <ul className="space-y-1">
                      {missingFields.map(f => (
                        <li key={f.key} className="text-xs flex items-center gap-2 text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                          {f.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <>
                    {/* Funnel Visual */}
                    <div className="space-y-1">
                      {/* Funnel Stages */}
                      {['Leads', 'MQL', 'SQL', 'Oportunidades', 'Contratos'].map((stage, idx) => {
                        const values = [inputs.leads, inputs.mql, inputs.sql, inputs.oportunidades, inputs.contratos ?? selectedProjection?.contratosProjetados ?? 0];
                        const maxValue = Math.max(...values.filter(v => v > 0));
                        const value = values[idx];
                        const width = maxValue > 0 ? Math.max(20, (value / maxValue) * 100) : 100;
                        const isProjected = idx === 4 && inputs.contratos === undefined;
                        
                        return (
                          <div key={stage} className="space-y-0.5">
                            <div 
                              className={cn(
                                "h-10 rounded flex items-center justify-between px-3 transition-all",
                                idx === 0 && "bg-blue-500",
                                idx === 1 && "bg-indigo-500",
                                idx === 2 && "bg-violet-500",
                                idx === 3 && "bg-purple-500",
                                idx === 4 && "bg-fuchsia-500",
                                isProjected && "opacity-75 border-2 border-dashed border-fuchsia-300"
                              )}
                              style={{ width: `${width}%` }}
                            >
                              <span className="text-xs font-medium text-white truncate">
                                {stage}
                                {isProjected && (
                                  <span className="opacity-75 ml-1">(proj.)</span>
                                )}
                              </span>
                              <span className="text-sm font-bold text-white">
                                {formatNumber(value)}
                              </span>
                            </div>
                            {/* Conversion Rate Arrow */}
                            {idx < 4 && outputs.conversions[idx] && (
                              <div className="flex items-center gap-1.5 pl-2 py-0.5">
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">
                                  {formatPercent(outputs.conversions[idx].rate)}
                                </span>
                                <span className="text-[10px]">
                                  {STATUS_CONFIG[outputs.conversions[idx].status].icon}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  (Meta: {outputs.conversions[idx].benchmark.min}-{outputs.conversions[idx].benchmark.max}%)
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <Separator />

                    {/* Cost Staircase */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        Escada de Custos
                      </p>
                      <div className="grid grid-cols-5 gap-1 text-center">
                        {[
                          { label: 'CPL', value: outputs.costs.cpl },
                          { label: 'Custo/MQL', value: outputs.costs.custoMql },
                          { label: 'Custo/SQL', value: outputs.costs.custoSql },
                          { label: 'Custo/Opp', value: outputs.costs.custoOpp },
                          { 
                            label: inputs.contratos !== undefined ? 'CAC' : 'CAC (proj)', 
                            value: outputs.costs.custoContrato ?? selectedProjection?.cacProjetado ?? null,
                            isProjected: inputs.contratos === undefined
                          },
                        ].map((item, i) => (
                          <div 
                            key={item.label} 
                            className={cn(
                              "p-2 rounded-lg border",
                              'isProjected' in item && item.isProjected 
                                ? "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800"
                                : "bg-muted/50"
                            )}
                          >
                            <p className="text-[10px] text-muted-foreground truncate">{item.label}</p>
                            <p className={cn(
                              "text-xs font-bold",
                              'isProjected' in item && item.isProjected && "text-purple-600"
                            )}>
                              {formatCurrency(item.value)}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Largest Cost Step */}
                      {outputs.largestCostStep && outputs.largestCostStep.delta !== null && (
                        <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                          <TrendingUp className="h-4 w-4 text-red-500" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-red-700 dark:text-red-400">
                              Maior degrau de custo: {outputs.largestCostStep.label}
                            </p>
                            <p className="text-[10px] text-red-600 dark:text-red-500">
                              +{formatCurrency(outputs.largestCostStep.delta)} ({outputs.largestCostStep.from} → {outputs.largestCostStep.to})
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Projections (when no contracts) */}
                    {outputs.projections && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          Projeção de Contratos
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {outputs.projections.map(proj => (
                            <button
                              key={proj.scenario}
                              onClick={() => setSelectedScenario(proj.scenario)}
                              className={cn(
                                "p-2 rounded-lg border text-left transition-all",
                                selectedScenario === proj.scenario
                                  ? "border-purple-400 bg-purple-50 dark:bg-purple-950/30 ring-1 ring-purple-400"
                                  : "hover:border-muted-foreground/30"
                              )}
                            >
                              <p className="text-[10px] text-muted-foreground">{proj.label}</p>
                              <p className="text-sm font-bold">{proj.contratosProjetados}</p>
                              <p className="text-[10px] text-muted-foreground">
                                CAC: {formatCurrency(proj.cacProjetado)}
                              </p>
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center">
                          Taxa de fechamento: {PROJECTION_SCENARIOS.find(s => s.key === selectedScenario)?.rate ? 
                            `${(PROJECTION_SCENARIOS.find(s => s.key === selectedScenario)!.rate * 100).toFixed(0)}%` : '—'}
                        </p>
                      </div>
                    )}

                    {/* Conversion Table */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Etapa | Real | Meta | Status</p>
                      <div className="space-y-1">
                        {outputs.conversions.map(conv => {
                          const config = STATUS_CONFIG[conv.status];
                          return (
                            <div 
                              key={conv.key} 
                              className={cn(
                                "grid grid-cols-12 gap-2 items-center p-2 rounded text-xs",
                                config.bg
                              )}
                            >
                              <span className="col-span-4 font-medium truncate">{conv.labelShort}</span>
                              <span className="col-span-3 text-right font-bold">{formatPercent(conv.rate)}</span>
                              <span className="col-span-3 text-right text-muted-foreground">
                                {conv.benchmark.min}-{conv.benchmark.max}%
                              </span>
                              <span className="col-span-2 text-center">{config.icon}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Status Legend */}
                    <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground pt-2">
                      <span>🟢 ≥ Média</span>
                      <span>🟡 Entre mín. e média</span>
                      <span>🔴 {'<'} Mínimo</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* RIGHT: Diagnóstico & Ações */}
            <Card className="col-span-12 lg:col-span-4">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Diagnóstico & Ações
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ScrollArea className="h-[calc(100vh-220px)] pr-2">
                  {missingFields.length > 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Info className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Preencha os dados obrigatórios para receber o diagnóstico.
                      </p>
                    </div>
                  ) : bottlenecks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                      <p className="text-sm font-medium text-green-600">
                        Todas as taxas estão dentro da meta!
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Continue monitorando para manter a performance.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Bottlenecks */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Principais Gargalos
                        </p>
                        {bottlenecks.map((conv, idx) => {
                          const config = STATUS_CONFIG[conv.status];
                          const actions = getStageActions(conv.key);
                          const gap = conv.rate !== null && conv.benchmark 
                            ? conv.benchmark.min - conv.rate 
                            : null;
                          
                          return (
                            <div 
                              key={conv.key}
                              className={cn(
                                "p-3 rounded-lg border-l-4",
                                conv.status === 'critical' 
                                  ? "border-l-red-500 bg-red-50 dark:bg-red-950/20" 
                                  : "border-l-amber-500 bg-amber-50 dark:bg-amber-950/20"
                              )}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div>
                                  <p className="text-xs font-medium flex items-center gap-1">
                                    {config.icon} {conv.label}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatPercent(conv.rate)} (Meta: {conv.benchmark.min}-{conv.benchmark.max}%)
                                  </p>
                                </div>
                                {gap !== null && gap > 0 && (
                                  <Badge variant="destructive" className="text-[10px] shrink-0">
                                    -{gap.toFixed(1)}pp
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="space-y-1">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                  Ações recomendadas:
                                </p>
                                {actions.map((action, i) => (
                                  <p key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                                    <span className="text-primary mt-0.5">→</span>
                                    {action}
                                  </p>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Largest Cost Step Insight */}
                      {outputs.largestCostStep && outputs.largestCostStep.delta !== null && (
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1 mb-1">
                            <TrendingUp className="h-3 w-3" />
                            Maior Degrau de Custo
                          </p>
                          <p className="text-xs text-muted-foreground">
                            A etapa <strong>{outputs.largestCostStep.label}</strong> é onde o custo por lead mais aumenta 
                            (+{formatCurrency(outputs.largestCostStep.delta)}). Priorize melhorar esta conversão.
                          </p>
                        </div>
                      )}

                      {/* Global Conversion */}
                      {outputs.globalConversion !== null && (
                        <div className={cn(
                          "p-3 rounded-lg border",
                          outputs.globalConversion >= BENCHMARKS.global.avg
                            ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                            : outputs.globalConversion >= BENCHMARKS.global.min
                              ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                              : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                        )}>
                          <p className="text-xs font-medium flex items-center gap-1 mb-1">
                            <BarChart3 className="h-3 w-3" />
                            Conversão Geral
                          </p>
                          <p className="text-lg font-bold">
                            {formatPercent(outputs.globalConversion, 2)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Meta: {BENCHMARKS.global.min}% - {BENCHMARKS.global.max}%
                          </p>
                        </div>
                      )}

                      {/* Summary if projecting */}
                      {selectedProjection && (
                        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                          <p className="text-xs font-medium text-purple-700 dark:text-purple-400 flex items-center gap-1 mb-2">
                            <Zap className="h-3 w-3" />
                            Resumo — Cenário {selectedProjection.label}
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">Contratos projetados</p>
                              <p className="font-bold text-purple-600">{selectedProjection.contratosProjetados}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">CAC projetado</p>
                              <p className="font-bold text-purple-600">{formatCurrency(selectedProjection.cacProjetado)}</p>
                            </div>
                          </div>
                        </div>
                      )}
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
                    placeholder="Ex: Análise Jan/2026"
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
