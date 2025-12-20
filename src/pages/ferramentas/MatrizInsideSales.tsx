import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, Copy, Download, Sparkles } from "lucide-react";

import {
  InsideSalesInputs,
  InsideSalesOutputs,
  calculateOutputs,
} from "@/lib/insideSalesMatrix/calc";

import {
  Targets,
  DEFAULT_TARGETS,
  STAGES,
  evaluateStage,
} from "@/lib/insideSalesMatrix/status";

import {
  MatrixRule,
  DEFAULT_RULES,
  getMatchingRules,
  transformDbRules,
} from "@/lib/insideSalesMatrix/rules";

import { calculateStageImpacts, findBottlenecks, calculateConfidenceLevel, StageImpact } from "@/lib/insideSalesMatrix/impact";
import { calculateConfidenceScore } from "@/lib/insideSalesMatrix/confidenceScore";
import { getEligibleStages, hasMediaDataComplete } from "@/lib/insideSalesMatrix/eligibility";

import { FunnelVisual } from "@/components/insideSalesMatrix/FunnelVisual";
import { InputTabs } from "@/components/insideSalesMatrix/InputTabs";
import { StageDiagnosisV2 } from "@/components/insideSalesMatrix/StageDiagnosisV2";
import { ActionPlanV2, ActionItemV2 } from "@/components/insideSalesMatrix/ActionPlanV2";
import { AICopilotDrawerV2 } from "@/components/insideSalesMatrix/AICopilotDrawerV2";
import { PeriodPickerPresets, PeriodRange, formatPeriodLabel } from "@/components/insideSalesMatrix/PeriodPickerPresets";
import { ConfidenceChip } from "@/components/insideSalesMatrix/ConfidenceChip";
import { StickySummaryPanel } from "@/components/insideSalesMatrix/StickySummaryPanel";
import { MobileBottomBar } from "@/components/insideSalesMatrix/MobileBottomBar";

import type { Json } from "@/integrations/supabase/types";

import { 
  CHANNELS_LIST, 
  FORM_COMPLEXITY_OPTIONS, 
  FormComplexity,
  getPeriodDays,
  getChannelAdjustedTargets,
  getChannelInsights,
  calculateInvestmentDensity,
} from "@/lib/insideSalesMatrix/channelLogic";

export default function MatrizInsideSales() {
  usePageMeta({
    title: "Matriz de Performance — Inside Sales | HUB Vivaz",
    description: "Diagnóstico por etapa do funil com metas e ações recomendadas.",
  });

  const navigate = useNavigate();

  // Context
  const [clientId, setClientId] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [periodRange, setPeriodRange] = useState<PeriodRange | null>(null);
  const [channel, setChannel] = useState('');
  const [formComplexity, setFormComplexity] = useState<FormComplexity | ''>('');

  // Clients from DB
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);

  // Inputs
  const [inputs, setInputs] = useState<InsideSalesInputs>({});

  // Targets
  const [targets, setTargets] = useState<Targets>(DEFAULT_TARGETS);

  // Rules from DB
  const [rules, setRules] = useState<MatrixRule[]>(DEFAULT_RULES);

  // Action Plan
  const [actionItems, setActionItems] = useState<ActionItemV2[]>([]);

  // AI Copilot
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [cachedAnalysis, setCachedAnalysis] = useState<any>(null);

  // History
  const [history, setHistory] = useState<any[]>([]);

  // Loading states
  const [saving, setSaving] = useState(false);

  // Load clients and rules on mount
  useEffect(() => {
    loadClients();
    loadRules();
    loadHistory();
    loadDefaultTargets();
  }, []);

  async function loadClients() {
    const { data } = await supabase
      .from('clients')
      .select('id, company_name')
      .eq('status', 'active')
      .order('company_name');
    if (data) setClients(data);
  }

  async function loadRules() {
    const { data } = await supabase
      .from('inside_sales_matrix_rules')
      .select('*')
      .order('sort_order');
    if (data && data.length > 0) {
      setRules(transformDbRules(data));
    }
  }

  async function loadDefaultTargets() {
    const { data } = await supabase
      .from('inside_sales_targets')
      .select('*')
      .eq('is_default', true)
      .maybeSingle();
    if (data?.targets) {
      setTargets(data.targets as unknown as Targets);
    }
  }

  async function loadHistory() {
    const { data } = await supabase
      .from('inside_sales_diagnostics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setHistory(data);
  }

  function updateInput(key: keyof InsideSalesInputs, value: string) {
    const numValue = value === '' ? undefined : parseFloat(value);
    setInputs(prev => ({ ...prev, [key]: numValue }));
  }

  function updateTarget(key: string, value: number) {
    setTargets(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        value,
      },
    }));
  }

  function resetTargets() {
    setTargets(DEFAULT_TARGETS);
    toast.info('Metas restauradas para o padrão.');
  }

  // Period in days for density calculation
  const periodDays = useMemo(() => {
    if (!periodRange) return 0;
    return getPeriodDays(periodRange.startDate, periodRange.endDate);
  }, [periodRange]);

  // Dynamic targets based on channel
  const adjustedTargets = useMemo(() => {
    if (!channel) return targets;
    return getChannelAdjustedTargets(
      targets, 
      channel, 
      formComplexity as FormComplexity || undefined
    );
  }, [targets, channel, formComplexity]);

  // Channel insights
  const channelInsights = useMemo(() => {
    if (!channel) return null;
    return getChannelInsights(channel, formComplexity as FormComplexity || undefined);
  }, [channel, formComplexity]);

  // Computed outputs
  const outputs = useMemo(() => calculateOutputs(inputs), [inputs]);

  // Stage impacts with status and impact calculation (use adjusted targets)
  const impacts = useMemo(() => calculateStageImpacts(inputs, outputs, adjustedTargets), [inputs, outputs, adjustedTargets]);

  // Find bottlenecks
  const { gargalo1, gargalo2, melhorEtapa } = useMemo(() => findBottlenecks(impacts), [impacts]);

  // Confidence score with period days for investment density
  const confidenceScore = useMemo(() => calculateConfidenceScore(inputs, { periodDays }), [inputs, periodDays]);
  
  // Investment density for AI context
  const investmentDensity = useMemo(() => 
    calculateInvestmentDensity(inputs.investimento, periodDays), 
    [inputs.investimento, periodDays]
  );
  
  // Eligible stages
  const eligibleStages = useMemo(() => getEligibleStages(inputs), [inputs]);
  
  // Has complete media data
  const hasMediaData = useMemo(() => hasMediaDataComplete(inputs), [inputs]);
  
  // Period label for display
  const periodLabel = useMemo(() => formatPeriodLabel(periodRange), [periodRange]);

  // Stage evaluations for diagnostics (use adjusted targets)
  const stageResults = useMemo(() => {
    return STAGES.map(stage => ({
      stage,
      ...evaluateStage(stage, inputs, outputs, adjustedTargets),
    }));
  }, [inputs, outputs, adjustedTargets]);

  // Diagnostics per stage
  const stageDiagnostics = useMemo(() => {
    return stageResults.map(({ stage, failingMetrics }) => ({
      stageId: stage.id,
      diagnostics: getMatchingRules(stage.id, failingMetrics, rules),
    }));
  }, [stageResults, rules]);

  // Map stage IDs between impact and diagnosis systems
  const mappedStageDiagnostics = useMemo(() => {
    const mapping: Record<string, string> = {
      'lead_to_mql': 'lead_to_mql',
      'mql_to_sql': 'mql_to_sql',
      'sql_to_meeting': 'sql_to_meeting',
      'meeting_to_win': 'meeting_to_win',
    };
    
    return impacts.map(impact => ({
      stageId: impact.stageId,
      diagnostics: stageDiagnostics.find(d => d.stageId === mapping[impact.stageId])?.diagnostics || [],
    }));
  }, [impacts, stageDiagnostics]);

  // Check if we have minimum data for AI
  const canUseAI = inputs.leads && inputs.mql && inputs.sql && inputs.reunioes;

  function addToActionPlan(action: { title: string; stage: string; type?: 'midia' | 'processo' }) {
    const newItem: ActionItemV2 = {
      id: crypto.randomUUID(),
      title: action.title,
      stage: action.stage,
      type: action.type || 'processo',
      priority: 'Média',
      status: 'A Fazer',
    };
    setActionItems(prev => [...prev, newItem]);
    toast.success('Ação adicionada ao plano!');
  }

  function applyAIPlan(items: ActionItemV2[]) {
    setActionItems(prev => [...prev, ...items]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Você precisa estar logado para salvar.');
        return;
      }

      const stageStatusData = stageResults.reduce((acc, { stage, status, failingMetrics }) => {
        acc[stage.id] = { status, failingMetrics };
        return acc;
      }, {} as Record<string, any>);

      const { error } = await supabase.from('inside_sales_diagnostics').insert({
        client_id: clientId || null,
        client_name: clientName || null,
        period_label: periodLabel || null,
        channel: channel || null,
        inputs: inputs as unknown as Json,
        outputs: outputs as unknown as Json,
        targets: targets as unknown as Json,
        stage_status: stageStatusData as unknown as Json,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success('Diagnóstico salvo com sucesso!');
      loadHistory();
    } catch (error: any) {
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  function handleDuplicate() {
    toast.info('Dados mantidos. Altere os campos e salve novamente.');
  }

  function handleExportCSV() {
    const rows: string[][] = [
      ['Etapa', 'Taxa Atual', 'Meta', 'Gap (pp)', 'Status', 'Impacto'],
    ];

    impacts.forEach((impact) => {
      rows.push([
        impact.stageName,
        impact.current.rate !== undefined ? `${impact.current.rate.toFixed(1)}%` : '-',
        `${impact.target.rate.toFixed(1)}%`,
        impact.gapPp !== undefined ? `${impact.gapPp.toFixed(1)}pp` : '-',
        impact.status,
        impact.impact?.description || '-',
      ]);
    });

    const csvContent = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagnostico-inside-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado!');
  }

  function loadDiagnostic(diag: any) {
    setClientId(diag.client_id || '');
    setClientName(diag.client_name || '');
    setChannel(diag.channel || '');
    setInputs(diag.inputs as InsideSalesInputs);
    setTargets(diag.targets as Targets);
    toast.info('Diagnóstico carregado.');
  }

  async function deleteDiagnostic(id: string) {
    const { error } = await supabase.from('inside_sales_diagnostics').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir.');
    } else {
      toast.success('Excluído.');
      loadHistory();
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4">
            <div className="flex items-center gap-4 flex-1">
              <Button variant="ghost" size="icon" onClick={() => navigate('/ferramentas')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Matriz de Performance — Inside Sales</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">Diagnóstico por etapa do funil com metas e ações recomendadas</p>
              </div>
            </div>

            {/* Context chips */}
            <div className="flex flex-wrap items-center gap-2">
              {clientName && <Badge variant="secondary">{clientName}</Badge>}
              {periodLabel && <Badge variant="outline">{periodLabel}</Badge>}
              {channel && <Badge variant="outline">{CHANNELS_LIST.find(c => c.value === channel)?.label || channel}</Badge>}
              <ConfidenceChip confidence={confidenceScore} size="sm" />
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <Button onClick={handleSave} disabled={saving} size="sm">
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-1" />
                Duplicar
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
              <Button 
                size="sm"
                onClick={() => setCopilotOpen(true)}
                disabled={!canUseAI}
                className="bg-primary"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                IA
              </Button>
            </div>
          </div>
        </div>

        {/* Painel do Funil - Top Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Funnel (8 cols on desktop) */}
          <div className="lg:col-span-8">
            <FunnelVisual inputs={inputs} outputs={outputs} impacts={impacts} />
          </div>
          
          {/* Sticky Summary Panel (4 cols on desktop, hidden on mobile - use bottom bar) */}
          <div className="hidden lg:block lg:col-span-4">
            <StickySummaryPanel
              gargalo1={gargalo1}
              gargalo2={gargalo2}
              impacts={impacts}
              confidence={confidenceScore}
              eligibleStages={eligibleStages}
              hasMediaData={hasMediaData}
              onOpenCopilot={() => setCopilotOpen(true)}
              canUseAI={!!canUseAI}
            />
          </div>
        </div>

        {/* Main Content - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Inputs */}
          <div className="space-y-4">
            {/* Context Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Contexto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {clients.length > 0 ? (
                    <div className="space-y-1.5">
                      <Label>Cliente</Label>
                      <Select value={clientId} onValueChange={(v) => {
                        setClientId(v);
                        const c = clients.find(c => c.id === v);
                        setClientName(c?.company_name || '');
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label>Nome do cliente</Label>
                      <Input 
                        value={clientName} 
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Nome do cliente"
                      />
                    </div>
                  )}
                  <div className="col-span-2">
                    <PeriodPickerPresets
                      value={periodRange}
                      onChange={setPeriodRange}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Canal de conversão</Label>
                    <Select value={channel} onValueChange={(v) => {
                      setChannel(v);
                      if (v !== 'lead_nativo') setFormComplexity('');
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {CHANNELS_LIST.map(c => (
                          <SelectItem key={c.value} value={c.value}>
                            <div className="flex flex-col">
                              <span>{c.label}</span>
                              <span className="text-xs text-muted-foreground">{c.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Form complexity - only for lead_nativo */}
                  {channel === 'lead_nativo' && (
                    <div className="space-y-1.5">
                      <Label>Complexidade do formulário</Label>
                      <Select value={formComplexity} onValueChange={(v) => setFormComplexity(v as FormComplexity)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {FORM_COMPLEXITY_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex flex-col">
                                <span>{opt.label}</span>
                                <span className="text-xs text-muted-foreground">{opt.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                {/* Channel insights */}
                {channelInsights && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{CHANNELS_LIST.find(c => c.value === channel)?.label}</span>
                      <Badge variant="outline" className="text-xs">{channelInsights.qualityNote}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>CVR esperado: {channelInsights.expectedConversion}</span>
                      <span>CPL: {channelInsights.expectedCpl}</span>
                    </div>
                    {channelInsights.recommendations.length > 0 && (
                      <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                        {channelInsights.recommendations.slice(0, 2).map((rec, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-primary">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Input Tabs - show adjusted targets */}
            <InputTabs
              inputs={inputs}
              outputs={outputs}
              targets={adjustedTargets}
              onInputChange={updateInput}
              onTargetChange={updateTarget}
              onResetTargets={resetTargets}
            />

            {/* History */}
            {history.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Histórico</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {history.map((h) => (
                      <div key={h.id} className="flex items-center justify-between text-sm bg-muted/30 rounded p-2">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate block">{h.client_name || 'Sem cliente'}</span>
                          <span className="text-xs text-muted-foreground">
                            {h.period_label || 'Sem período'} • {new Date(h.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => loadDiagnostic(h)}>Ver</Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteDiagnostic(h.id)} className="text-destructive hover:text-destructive">Excluir</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT: Diagnosis */}
          <div className="space-y-4">
            {/* Stage Diagnosis */}
            <StageDiagnosisV2
              impacts={impacts}
              stageDiagnostics={mappedStageDiagnostics}
              onAddToActionPlan={addToActionPlan}
            />

            {/* Action Plan */}
            <ActionPlanV2
              items={actionItems}
              onChange={setActionItems}
            />
          </div>
        </div>

        {/* AI Copilot Drawer */}
        <AICopilotDrawerV2
          open={copilotOpen}
          onOpenChange={setCopilotOpen}
          inputs={inputs}
          outputs={outputs}
          targets={targets}
          impacts={impacts}
          rules={rules}
          onApplyPlan={applyAIPlan}
          cachedAnalysis={cachedAnalysis}
          onAnalysisGenerated={setCachedAnalysis}
          channel={channel}
          formComplexity={formComplexity as FormComplexity || undefined}
          investmentDensity={investmentDensity || undefined}
          adjustedTargets={adjustedTargets}
        />

        {/* Mobile Bottom Bar */}
        <MobileBottomBar
          gargalo1={gargalo1}
          impacts={impacts}
          confidence={confidenceScore}
          eligibleStages={eligibleStages}
          actionItems={actionItems}
          onOpenCopilot={() => setCopilotOpen(true)}
          canUseAI={!!canUseAI}
        />
      </div>
    </DashboardLayout>
  );
}
