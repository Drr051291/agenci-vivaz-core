import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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

import { calculateStageImpacts, findBottlenecks, StageImpact } from "@/lib/insideSalesMatrix/impact";
import { calculateConfidenceScore } from "@/lib/insideSalesMatrix/confidenceScore";
import { getEligibleStages, hasMediaDataComplete } from "@/lib/insideSalesMatrix/eligibility";

import { InputTabs } from "@/components/insideSalesMatrix/InputTabs";
import { ActionItemV2 } from "@/components/insideSalesMatrix/ActionPlanV2";
import { ActionItemBR2025 } from "@/components/insideSalesMatrix/ActionPlanBR2025";
import { PeriodPickerPresets, PeriodRange, formatPeriodLabel } from "@/components/insideSalesMatrix/PeriodPickerPresets";
import { ConfidenceChip } from "@/components/insideSalesMatrix/ConfidenceChip";
import { MobileBottomBar } from "@/components/insideSalesMatrix/MobileBottomBar";

// New BR 2025 components
import { FunnelVisualBR2025 } from "@/components/insideSalesMatrix/FunnelVisualBR2025";
import { DecisionPanelBR2025 } from "@/components/insideSalesMatrix/DecisionPanelBR2025";
import { GapsImpactPanelBR2025 } from "@/components/insideSalesMatrix/GapsImpactPanelBR2025";
import { ActionPlanBR2025 } from "@/components/insideSalesMatrix/ActionPlanBR2025";
import { AICopilotDrawerBR2025 } from "@/components/insideSalesMatrix/AICopilotDrawerBR2025";

import type { Json } from "@/integrations/supabase/types";

import { 
  getPeriodDays,
  calculateInvestmentDensity,
} from "@/lib/insideSalesMatrix/channelLogic";

import {
  BR2025Context,
  MercadoBR,
  SegmentoBR,
  CanalMidia,
  TipoCaptura,
  getBR2025Profile,
  SEGMENTOS_BR2025_LIST,
  CANAIS_MIDIA_LIST,
} from "@/lib/insideSalesMatrix/benchmarksBR2025";

import {
  generatePlaybookActions,
  PlaybookAction,
} from "@/lib/insideSalesMatrix/actionPlaybook";

export default function MatrizInsideSales() {
  usePageMeta({
    title: "Matriz de Performance — Inside Sales (BR 2025) | HUB Vivaz",
    description: "Diagnóstico visual do funil com benchmarks Brasil 2025.",
  });

  const navigate = useNavigate();

  // Context BR 2025
  const [clientId, setClientId] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [periodRange, setPeriodRange] = useState<PeriodRange | null>(null);
  const [mercado, setMercado] = useState<MercadoBR>('B2B');
  const [segmento, setSegmento] = useState<SegmentoBR | ''>('');
  const [canal, setCanal] = useState<CanalMidia | ''>('');
  const [captura, setCaptura] = useState<TipoCaptura | ''>('');
  const [whatsappCrm, setWhatsappCrm] = useState(false);

  // Clients from DB
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);

  // Inputs
  const [inputs, setInputs] = useState<InsideSalesInputs>({});

  // Targets
  const [targets, setTargets] = useState<Targets>(DEFAULT_TARGETS);

  // Rules from DB
  const [rules, setRules] = useState<MatrixRule[]>(DEFAULT_RULES);

  // Action Plan
  const [actionItems, setActionItems] = useState<ActionItemBR2025[]>([]);

  // AI Copilot
  const [copilotOpen, setCopilotOpen] = useState(false);

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
      [key]: { ...prev[key], value },
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

  // BR 2025 Context
  const br2025Context: BR2025Context = useMemo(() => ({
    mercado,
    segmento: segmento || undefined,
    canal: canal || undefined,
    captura: captura || undefined,
    whatsappCrm,
  }), [mercado, segmento, canal, captura, whatsappCrm]);

  // Benchmark profile
  const benchmarkProfile = useMemo(() => getBR2025Profile(br2025Context), [br2025Context]);

  // Computed outputs
  const outputs = useMemo(() => calculateOutputs(inputs), [inputs]);

  // Stage impacts with status and impact calculation
  const impacts = useMemo(() => calculateStageImpacts(inputs, outputs, targets), [inputs, outputs, targets]);

  // Find bottlenecks
  const { gargalo1, gargalo2 } = useMemo(() => findBottlenecks(impacts), [impacts]);

  // Confidence score with period days for investment density
  const confidenceScore = useMemo(() => calculateConfidenceScore(inputs, { periodDays }), [inputs, periodDays]);
  
  // Investment density for context
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

  // Stage evaluations for diagnostics
  const stageResults = useMemo(() => {
    return STAGES.map(stage => ({
      stage,
      ...evaluateStage(stage, inputs, outputs, targets),
    }));
  }, [inputs, outputs, targets]);

  // Check if we have minimum data for AI
  const canUseAI = inputs.leads && inputs.mql && inputs.sql;

  // Generate deterministic actions
  const deterministicActions = useMemo(() => {
    return generatePlaybookActions({ inputs, outputs, impacts, br2025Context });
  }, [inputs, outputs, impacts, br2025Context]);

  function addToActionPlan(action: PlaybookAction) {
    const newItem: ActionItemBR2025 = {
      id: crypto.randomUUID(),
      title: action.title,
      stage: action.stage,
      type: action.type,
      priority: action.priority,
      status: 'A Fazer',
      metricToWatch: action.metricToWatch,
      nextStep: action.nextStep,
      source: 'br2025',
    };
    setActionItems(prev => [...prev, newItem]);
    toast.success('Ação adicionada ao plano!');
  }

  async function applyAIPlan(items: ActionItemBR2025[], options?: { linkToMeeting: boolean; meetingId?: string; createTasks: boolean }) {
    setActionItems(prev => [...prev, ...items]);
    
    if (options?.linkToMeeting && options.meetingId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const linkPromises = items.map(item => 
          (supabase.from('meeting_action_links') as any).insert({
            meeting_id: options.meetingId,
            action_item: {
              title: item.title,
              type: item.type,
              stage: item.stage,
              priority: item.priority,
              metric_to_watch: item.metricToWatch,
              next_step: item.nextStep,
            },
          })
        );
        await Promise.all(linkPromises);
      }
    }

    if (options?.createTasks && clientId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const taskPromises = items.map(item =>
          supabase.from('tasks').insert({
            client_id: clientId,
            title: item.title,
            category: item.type === 'midia' ? 'gestao_de_trafego' : 'comercial',
            priority: item.priority === 'Alta' ? 'high' : item.priority === 'Média' ? 'medium' : 'low',
            status: 'todo',
            description: item.nextStep || '',
            source: 'performance_analysis',
            created_by: user.id,
          })
        );
        await Promise.all(taskPromises);
        toast.success(`${items.length} tarefa(s) criada(s)!`);
      }
    }
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

      const { data: diagData, error: diagError } = await supabase.from('inside_sales_diagnostics').insert({
        client_id: clientId || null,
        client_name: clientName || null,
        period_label: periodLabel || null,
        channel: canal || null,
        inputs: inputs as unknown as Json,
        outputs: outputs as unknown as Json,
        targets: targets as unknown as Json,
        stage_status: stageStatusData as unknown as Json,
        created_by: user.id,
      }).select().single();

      if (diagError) throw diagError;

      if (clientId && diagData) {
        const summary = {
          bottleneck: gargalo1?.stageName || null,
          gaps: impacts
            .filter(i => i.gapPp !== undefined && i.gapPp < 0 && eligibleStages.includes(i.stageId))
            .slice(0, 3)
            .map(i => ({ stage: i.stageName, gap: i.gapPp! })),
          confidence_score: confidenceScore.score,
          key_rates: {
            'Lead→MQL': outputs.leadToMql,
            'MQL→SQL': outputs.mqlToSql,
            'SQL→Contrato': outputs.sqlToWin,
          },
        };

        await (supabase.from('client_performance_entries') as any).insert({
          client_id: clientId,
          entry_type: 'inside_sales_matrix',
          period_start: periodRange?.startDate || null,
          period_end: periodRange?.endDate || null,
          channel: canal || null,
          summary: summary,
          diagnostic_id: diagData.id,
          created_by: user.id,
        });
      }

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
      ['Etapa', 'Taxa Atual', 'Meta', 'Benchmark BR 2025', 'Gap (pp)', 'Status'],
    ];

    impacts.forEach((impact) => {
      rows.push([
        impact.stageName,
        impact.current.rate !== undefined ? `${impact.current.rate.toFixed(1)}%` : '-',
        `${impact.target.rate.toFixed(1)}%`,
        benchmarkProfile?.conversaoGeral ? `${benchmarkProfile.conversaoGeral}%` : '-',
        impact.gapPp !== undefined ? `${impact.gapPp.toFixed(1)}pp` : '-',
        impact.status,
      ]);
    });

    const csvContent = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagnostico-inside-sales-br2025-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado!');
  }

  function loadDiagnostic(diag: any) {
    setClientId(diag.client_id || '');
    setClientName(diag.client_name || '');
    setCanal((diag.channel || '') as CanalMidia);
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

  // Apply benchmark as targets
  function applyBenchmarkAsTargets() {
    if (!benchmarkProfile) return;
    
    const newTargets = { ...targets };
    
    // Conversão geral aplica ao Lead→MQL como proxy
    if (benchmarkProfile.conversaoGeral) {
      newTargets.leadToMql = { ...newTargets.leadToMql, value: Math.round(benchmarkProfile.conversaoGeral * 10) / 10 };
    }
    
    // CPL range - usa o valor médio
    if (benchmarkProfile.cplRange) {
      const avgCpl = (benchmarkProfile.cplRange.min + benchmarkProfile.cplRange.max) / 2;
      newTargets.cpl = { ...newTargets.cpl, value: Math.round(avgCpl) };
    }
    
    // Lead→Oportunidade (SQL) do LinkedIn
    if (benchmarkProfile.leadToOportunidade) {
      const avgLeadToSql = (benchmarkProfile.leadToOportunidade.min + benchmarkProfile.leadToOportunidade.max) / 2;
      newTargets.mqlToSql = { ...newTargets.mqlToSql, value: Math.round(avgLeadToSql) };
    }
    
    setTargets(newTargets);
    toast.success('Metas atualizadas com benchmarks BR 2025!');
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* A) TOP STICKY HEADER */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3">
            {/* Back + Title */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/ferramentas')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">Matriz de Performance — Inside Sales (BR 2025)</h1>
              </div>
            </div>

            {/* Context chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {clientName && <Badge variant="secondary" className="text-xs">{clientName}</Badge>}
              {periodLabel && <Badge variant="outline" className="text-xs">{periodLabel}</Badge>}
              <Badge variant="outline" className="text-xs">{mercado}</Badge>
              {segmento && <Badge variant="outline" className="text-xs">{SEGMENTOS_BR2025_LIST.find(s => s.value === segmento)?.label || segmento}</Badge>}
              {canal && <Badge variant="outline" className="text-xs">{CANAIS_MIDIA_LIST.find(c => c.value === canal)?.label || canal}</Badge>}
              {captura && <Badge variant="outline" className="text-xs">{captura === 'landing_page' ? 'Landing Page' : 'Lead Nativo'}</Badge>}
              <ConfidenceChip confidence={confidenceScore} size="sm" />
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-shrink-0">
              <Button onClick={handleSave} disabled={saving} size="sm">
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDuplicate}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4" />
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

        {/* B) ROW 1: Funnel + Decision Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Funnel Visual BR 2025 (8 cols on desktop) */}
          <div className="lg:col-span-8">
            <FunnelVisualBR2025 
              inputs={inputs} 
              outputs={outputs} 
              impacts={impacts}
              br2025Context={br2025Context}
            />
          </div>
          
          {/* Decision Panel (4 cols on desktop, hidden on mobile - use bottom bar) */}
          <div className="hidden lg:block lg:col-span-4">
            <DecisionPanelBR2025
              gargalo1={gargalo1}
              gargalo2={gargalo2}
              impacts={impacts}
              eligibleStages={eligibleStages}
              confidence={confidenceScore}
              hasMediaData={inputs.investimento > 0 || inputs.cliques > 0}
              playbookActions={deterministicActions}
              onOpenCopilot={() => setCopilotOpen(true)}
              canUseAI={!!canUseAI}
            />
          </div>
        </div>

        {/* C) ROW 2: Inputs + Gaps/Impact */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT: Inputs */}
          <div className="space-y-4">
            {/* Context Card BR 2025 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Contexto BR 2025</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Cliente */}
                  {clients.length > 0 ? (
                    <div className="space-y-1">
                      <Label className="text-xs">Cliente</Label>
                      <Select value={clientId} onValueChange={(v) => {
                        setClientId(v);
                        const c = clients.find(c => c.id === v);
                        setClientName(c?.company_name || '');
                      }}>
                        <SelectTrigger className="h-8 text-xs">
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
                    <div className="space-y-1">
                      <Label className="text-xs">Nome do cliente</Label>
                      <Input 
                        className="h-8 text-xs"
                        value={clientName} 
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Nome"
                      />
                    </div>
                  )}
                  
                  {/* Mercado */}
                  <div className="space-y-1">
                    <Label className="text-xs">Mercado *</Label>
                    <Select value={mercado} onValueChange={(v) => setMercado(v as MercadoBR)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="B2B">B2B</SelectItem>
                        <SelectItem value="B2C">B2C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Período */}
                <div>
                  <PeriodPickerPresets
                    value={periodRange}
                    onChange={setPeriodRange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Canal */}
                  <div className="space-y-1">
                    <Label className="text-xs">Canal de Mídia</Label>
                    <Select value={canal || "__none__"} onValueChange={(v) => setCanal(v === "__none__" ? '' : v as CanalMidia)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Não especificado</SelectItem>
                        {CANAIS_MIDIA_LIST.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Segmento */}
                  <div className="space-y-1">
                    <Label className="text-xs">Segmento</Label>
                    <Select value={segmento || "__none__"} onValueChange={(v) => setSegmento(v === "__none__" ? '' : v as SegmentoBR)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Não especificado</SelectItem>
                        {SEGMENTOS_BR2025_LIST.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Tipo de Captura */}
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de Captura</Label>
                    <Select value={captura || "__none__"} onValueChange={(v) => setCaptura(v === "__none__" ? '' : v as TipoCaptura)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Não especificado</SelectItem>
                        <SelectItem value="landing_page">Landing Page</SelectItem>
                        <SelectItem value="lead_nativo">Lead Nativo (Form)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* WhatsApp CRM */}
                  <div className="space-y-1">
                    <Label className="text-xs">WhatsApp integrado ao CRM?</Label>
                    <div className="flex items-center gap-2 h-8">
                      <Switch checked={whatsappCrm} onCheckedChange={setWhatsappCrm} />
                      <span className="text-xs text-muted-foreground">{whatsappCrm ? 'Sim' : 'Não'}</span>
                    </div>
                  </div>
                </div>

                {/* Benchmark chip compacto + botão "Usar Bench como Meta" */}
                {benchmarkProfile && (
                  <div className="flex items-center justify-between p-2 bg-primary/5 border border-primary/20 rounded text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] h-5">Bench ativo</Badge>
                      <span className="text-muted-foreground truncate max-w-[200px]">
                        {mercado}{segmento ? ` • ${SEGMENTOS_BR2025_LIST.find(s => s.value === segmento)?.label?.split(' ')[0] || segmento}` : ''}
                        {canal ? ` • ${CANAIS_MIDIA_LIST.find(c => c.value === canal)?.label}` : ''}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-[10px] px-2"
                      onClick={applyBenchmarkAsTargets}
                    >
                      Usar como Meta
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Input Tabs */}
            <InputTabs
              inputs={inputs}
              outputs={outputs}
              targets={targets}
              onInputChange={updateInput}
              onTargetChange={updateTarget}
              onResetTargets={resetTargets}
            />

            {/* History */}
            {history.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Histórico</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                    {history.map((h) => (
                      <div key={h.id} className="flex items-center justify-between text-xs bg-muted/30 rounded p-2">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate block">{h.client_name || 'Sem cliente'}</span>
                          <span className="text-muted-foreground">
                            {h.period_label || 'Sem período'} • {new Date(h.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => loadDiagnostic(h)}>Ver</Button>
                          <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-destructive" onClick={() => deleteDiagnostic(h.id)}>×</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT: Gaps & Impact + Action Plan (melhor uso do espaço) */}
          <div className="space-y-4">
            <GapsImpactPanelBR2025
              impacts={impacts}
              onAddToActionPlan={addToActionPlan}
            />
            
            {/* Action Plan agora no grid direito para preencher espaço */}
            <ActionPlanBR2025
              items={actionItems}
              onChange={setActionItems}
              dailyChecklist={deterministicActions.slice(0, 3)}
            />
          </div>
        </div>

        {/* AI Copilot Drawer */}
        <AICopilotDrawerBR2025
          open={copilotOpen}
          onOpenChange={setCopilotOpen}
          inputs={inputs}
          outputs={outputs}
          targets={targets}
          impacts={impacts}
          context={br2025Context}
          eligibleStages={eligibleStages}
          onApplyPlan={applyAIPlan}
          clientId={clientId || undefined}
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
