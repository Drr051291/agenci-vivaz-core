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

import { FunnelBarChart } from "@/components/insideSalesMatrix/FunnelBarChart";
import { QuickSummary } from "@/components/insideSalesMatrix/QuickSummary";
import { InputTabs } from "@/components/insideSalesMatrix/InputTabs";
import { StageDiagnosis } from "@/components/insideSalesMatrix/StageDiagnosis";
import { ActionPlan, ActionItem } from "@/components/insideSalesMatrix/ActionPlan";
import { AICopilotDrawer } from "@/components/insideSalesMatrix/AICopilotDrawer";

import type { Json } from "@/integrations/supabase/types";

const CHANNELS = [
  { value: 'landing', label: 'Tráfego para landing' },
  { value: 'lead_ads', label: 'Lead Ads' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'outro', label: 'Outro' },
];

export default function MatrizInsideSales() {
  usePageMeta({
    title: "Matriz de Performance — Inside Sales | HUB Vivaz",
    description: "Diagnóstico por etapa do funil com metas e ações recomendadas.",
  });

  const navigate = useNavigate();

  // Context
  const [clientId, setClientId] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [periodLabel, setPeriodLabel] = useState('');
  const [channel, setChannel] = useState('');

  // Clients from DB
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);

  // Inputs
  const [inputs, setInputs] = useState<InsideSalesInputs>({});

  // Targets
  const [targets, setTargets] = useState<Targets>(DEFAULT_TARGETS);

  // Rules from DB
  const [rules, setRules] = useState<MatrixRule[]>(DEFAULT_RULES);

  // Action Plan
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

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

  // Computed outputs
  const outputs = useMemo(() => calculateOutputs(inputs), [inputs]);

  // Stage impacts with status and impact calculation
  const impacts = useMemo(() => calculateStageImpacts(inputs, outputs, targets), [inputs, outputs, targets]);

  // Find bottlenecks
  const { gargalo1, gargalo2, melhorEtapa } = useMemo(() => findBottlenecks(impacts), [impacts]);

  // Confidence level
  const confidence = useMemo(() => calculateConfidenceLevel(inputs), [inputs]);

  // Stage evaluations for diagnostics
  const stageResults = useMemo(() => {
    return STAGES.map(stage => ({
      stage,
      ...evaluateStage(stage, inputs, outputs, targets),
    }));
  }, [inputs, outputs, targets]);

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

  function addToActionPlan(action: { title: string; stage: string }) {
    const newItem: ActionItem = {
      id: crypto.randomUUID(),
      title: action.title,
      stage: action.stage,
      priority: 'Média',
      status: 'A Fazer',
    };
    setActionItems(prev => [...prev, newItem]);
    toast.success('Ação adicionada ao plano!');
  }

  function applyAIPlan(items: ActionItem[]) {
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
    setPeriodLabel(diag.period_label || '');
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
            <div className="flex flex-wrap gap-2">
              {clientName && <Badge variant="secondary">{clientName}</Badge>}
              {periodLabel && <Badge variant="outline">{periodLabel}</Badge>}
              {channel && <Badge variant="outline">{CHANNELS.find(c => c.value === channel)?.label || channel}</Badge>}
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

        {/* Placar do Funil - Top Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <FunnelBarChart impacts={impacts} />
          </div>
          <QuickSummary
            gargalo1={gargalo1}
            gargalo2={gargalo2}
            melhorEtapa={melhorEtapa}
            confidence={confidence}
          />
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
                  <div className="space-y-1.5">
                    <Label>Período</Label>
                    <Input 
                      value={periodLabel} 
                      onChange={(e) => setPeriodLabel(e.target.value)}
                      placeholder="Ex: Jan/2025"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Canal</Label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
            <StageDiagnosis
              impacts={impacts}
              stageDiagnostics={mappedStageDiagnostics}
              onAddToActionPlan={addToActionPlan}
            />

            {/* Action Plan */}
            <ActionPlan
              items={actionItems}
              onChange={setActionItems}
            />
          </div>
        </div>

        {/* AI Copilot Drawer */}
        <AICopilotDrawer
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
        />
      </div>
    </DashboardLayout>
  );
}
