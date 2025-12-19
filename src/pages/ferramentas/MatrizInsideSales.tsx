import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, Copy, Download, HelpCircle, CheckCircle2, AlertTriangle, XCircle, Minus, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

import {
  InsideSalesInputs,
  InsideSalesOutputs,
  calculateOutputs,
  formatMetricByKey,
  getMetricValue,
} from "@/lib/insideSalesMatrix/calc";

import {
  Targets,
  DEFAULT_TARGETS,
  STAGES,
  evaluateStage,
  evaluateMetricStatus,
  calculatePriorities,
  StageStatus,
  MetricStatus,
  StageMetric,
  PriorityItem,
} from "@/lib/insideSalesMatrix/status";

import {
  MatrixRule,
  DEFAULT_RULES,
  getMatchingRules,
  transformDbRules,
  DiagnosticItem,
} from "@/lib/insideSalesMatrix/rules";

import { FunnelChart } from "@/components/insideSalesMatrix/FunnelChart";

import type { Json } from "@/integrations/supabase/types";

const CHANNELS = [
  { value: 'landing', label: 'Tráfego para landing' },
  { value: 'lead_ads', label: 'Lead Ads' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'outro', label: 'Outro' },
];

function TooltipHelper({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function StatusBadge({ status }: { status: StageStatus | MetricStatus }) {
  const config = {
    ok: { label: 'OK', variant: 'default' as const, icon: CheckCircle2, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
    positivo: { label: 'Positivo', variant: 'default' as const, icon: CheckCircle2, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
    atencao: { label: 'Atenção', variant: 'secondary' as const, icon: AlertTriangle, className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    critico: { label: 'Crítico', variant: 'destructive' as const, icon: XCircle, className: 'bg-red-500/10 text-red-600 border-red-500/20' },
    negativo: { label: 'Negativo', variant: 'destructive' as const, icon: XCircle, className: 'bg-red-500/10 text-red-600 border-red-500/20' },
    sem_dados: { label: 'Sem dados', variant: 'outline' as const, icon: Minus, className: 'bg-muted text-muted-foreground' },
  };
  
  const { label, icon: Icon, className } = config[status];
  
  return (
    <Badge variant="outline" className={`gap-1 ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function InputField({
  id,
  label,
  value,
  onChange,
  type = 'number',
  placeholder,
  tooltip,
  suffix,
  prefix,
}: {
  id: string;
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  tooltip?: string;
  suffix?: string;
  prefix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {tooltip && <TooltipHelper text={tooltip} />}
      </div>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {prefix}
          </span>
        )}
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${prefix ? 'pl-8' : ''} ${suffix ? 'pr-10' : ''}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

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

  function updateInput<K extends keyof InsideSalesInputs>(key: K, value: string) {
    const numValue = value === '' ? undefined : parseFloat(value);
    setInputs(prev => ({ ...prev, [key]: numValue }));
  }

  function updateTarget(key: string, field: 'value' | 'direction', value: string | number) {
    setTargets(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: field === 'value' ? parseFloat(value as string) : value,
      },
    }));
  }

  // Computed outputs
  const outputs = useMemo(() => calculateOutputs(inputs), [inputs]);

  // Stage evaluations
  const stageResults = useMemo(() => {
    return STAGES.map(stage => ({
      stage,
      ...evaluateStage(stage, inputs, outputs, targets),
    }));
  }, [inputs, outputs, targets]);

  // Priorities
  const priorities = useMemo(() => calculatePriorities(inputs, outputs, targets), [inputs, outputs, targets]);

  // Diagnostics per stage
  const stageDiagnostics = useMemo(() => {
    return stageResults.map(({ stage, failingMetrics }) => ({
      stageId: stage.id,
      diagnostics: getMatchingRules(stage.id, failingMetrics, rules),
    }));
  }, [stageResults, rules]);

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
      ['Métrica', 'Valor', 'Meta', 'Status'],
    ];

    stageResults.forEach(({ stage, metrics }) => {
      rows.push([`--- ${stage.name} ---`, '', '', '']);
      metrics.forEach(m => {
        rows.push([
          m.label,
          m.value !== undefined ? String(m.value) : '-',
          m.target?.value !== undefined ? String(m.target.value) : '-',
          m.status,
        ]);
      });
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

  function resetTargets() {
    setTargets(DEFAULT_TARGETS);
    toast.info('Metas restauradas para o padrão.');
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/ferramentas')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Matriz de Performance — Inside Sales</h1>
            <p className="text-muted-foreground">Diagnóstico por etapa do funil com metas e ações recomendadas</p>
          </div>
        </div>

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
                    <InputField
                      id="clientName"
                      label="Nome do cliente"
                      value={clientName}
                      onChange={setClientName}
                      type="text"
                    />
                  )}
                  <InputField
                    id="periodLabel"
                    label="Período"
                    value={periodLabel}
                    onChange={setPeriodLabel}
                    type="text"
                    placeholder="Ex: Jan/2025"
                  />
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

            {/* Input Card - Simplified */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Dados do Funil</CardTitle>
                <CardDescription>Preencha os números principais do funil</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InputField id="investimento" label="Investimento" value={inputs.investimento ?? ''} onChange={v => updateInput('investimento', v)} prefix="R$" tooltip="Valor total investido em mídia" />
                  <InputField id="leads" label="Leads" value={inputs.leads ?? ''} onChange={v => updateInput('leads', v)} tooltip="Total de leads captados" />
                  <InputField id="mql" label="MQL" value={inputs.mql ?? ''} onChange={v => updateInput('mql', v)} tooltip="Marketing Qualified Leads" />
                  <InputField id="sql" label="SQL" value={inputs.sql ?? ''} onChange={v => updateInput('sql', v)} tooltip="Sales Qualified Leads" />
                  <InputField id="reunioes" label="Reuniões" value={inputs.reunioes ?? ''} onChange={v => updateInput('reunioes', v)} tooltip="Reuniões agendadas" />
                  <InputField id="contratos" label="Contratos" value={inputs.contratos ?? ''} onChange={v => updateInput('contratos', v)} tooltip="Contratos fechados (wins)" />
                  <InputField id="receita" label="Receita" value={inputs.receita ?? ''} onChange={v => updateInput('receita', v)} prefix="R$" tooltip="Receita total gerada (opcional)" />
                </div>

                {/* Computed metrics */}
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Taxas de conversão calculadas:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <span className="text-xs text-muted-foreground block">Lead → MQL</span>
                      <span className="font-medium">{formatMetricByKey('leadToMql', outputs.leadToMql)}</span>
                    </div>
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <span className="text-xs text-muted-foreground block">MQL → SQL</span>
                      <span className="font-medium">{formatMetricByKey('mqlToSql', outputs.mqlToSql)}</span>
                    </div>
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <span className="text-xs text-muted-foreground block">SQL → Reunião</span>
                      <span className="font-medium">{formatMetricByKey('sqlToMeeting', outputs.sqlToMeeting)}</span>
                    </div>
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <span className="text-xs text-muted-foreground block">Win Rate</span>
                      <span className="font-medium">{formatMetricByKey('meetingToWin', outputs.meetingToWin)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <span className="text-xs text-muted-foreground block">CPL</span>
                      <span className="font-medium">{formatMetricByKey('cpl', outputs.cpl)}</span>
                    </div>
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <span className="text-xs text-muted-foreground block">CAC</span>
                      <span className="font-medium">{formatMetricByKey('cac', outputs.cac)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar diagnóstico'}
              </Button>
              <Button variant="outline" onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </Button>
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>

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

          {/* RIGHT: Results */}
          <div className="space-y-4">
            {/* Funnel Stepper */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Saúde do Funil</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-2">
                  {stageResults.map(({ stage, status, metrics }, idx) => {
                    const mainMetric = metrics.find(m => m.key === stage.mainConversionKey);
                    return (
                      <motion.div
                        key={stage.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex-1 text-center"
                      >
                        <div className="mb-2">
                          <StatusBadge status={status} />
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{stage.name}</p>
                        <p className="text-lg font-semibold">
                          {mainMetric ? formatMetricByKey(mainMetric.key, mainMetric.value) : '-'}
                        </p>
                        {idx < stageResults.length - 1 && (
                          <div className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground">→</div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Funnel Chart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Funil de Conversão</CardTitle>
                <CardDescription>Visualização das quedas entre etapas</CardDescription>
              </CardHeader>
              <CardContent>
                <FunnelChart
                  stages={[
                    { id: 'leads', label: 'Leads', value: inputs.leads },
                    { id: 'mql', label: 'MQL', value: inputs.mql, conversionRate: outputs.leadToMql, conversionKey: 'leadToMql' },
                    { id: 'sql', label: 'SQL', value: inputs.sql, conversionRate: outputs.mqlToSql, conversionKey: 'mqlToSql' },
                    { id: 'reunioes', label: 'Reuniões', value: inputs.reunioes, conversionRate: outputs.sqlToMeeting, conversionKey: 'sqlToMeeting' },
                    { id: 'contratos', label: 'Contratos', value: inputs.contratos, conversionRate: outputs.meetingToWin, conversionKey: 'meetingToWin' },
                  ]}
                />
              </CardContent>
            </Card>

            {/* KPIs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">KPIs Principais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { key: 'leadToMql', label: 'Lead → MQL' },
                    { key: 'mqlToSql', label: 'MQL → SQL' },
                    { key: 'sqlToMeeting', label: 'SQL → Reunião' },
                    { key: 'meetingToWin', label: 'Win Rate' },
                    { key: 'cac', label: 'CAC' },
                    { key: 'cpl', label: 'CPL' },
                  ].map(({ key, label }) => {
                    const value = getMetricValue(key, inputs, outputs);
                    const status = evaluateMetricStatus(value, targets[key]);
                    return (
                      <div key={key} className="bg-muted/30 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className="text-lg font-semibold">{formatMetricByKey(key, value)}</p>
                        <div className="mt-1">
                          <StatusBadge status={status} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Stage Diagnostics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Diagnóstico por Etapa</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {stageResults.map(({ stage, status, metrics }, idx) => {
                    const diagItems = stageDiagnostics.find(d => d.stageId === stage.id)?.diagnostics || [];
                    return (
                      <AccordionItem key={stage.id} value={stage.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={status} />
                            <span>{stage.name}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                            {/* Metrics table */}
                            <div className="text-sm">
                              <div className="grid grid-cols-4 gap-2 font-medium text-muted-foreground border-b pb-1 mb-1">
                                <span>Métrica</span>
                                <span>Atual</span>
                                <span>Meta</span>
                                <span>Status</span>
                              </div>
                              {metrics.filter(m => m.value !== undefined || m.target !== undefined).map(m => (
                                <div key={m.key} className="grid grid-cols-4 gap-2 py-1 border-b border-muted/50">
                                  <span className="truncate">{m.label}</span>
                                  <span>{formatMetricByKey(m.key, m.value)}</span>
                                  <span>{m.target ? formatMetricByKey(m.key, m.target.value) : '-'}</span>
                                  <StatusBadge status={m.status} />
                                </div>
                              ))}
                            </div>

                            {/* Diagnostics */}
                            {diagItems.length > 0 && (
                              <div className="space-y-2 mt-3">
                                <p className="text-sm font-medium">Análise e Ações:</p>
                                {diagItems.map((d, i) => (
                                  <div key={i} className="bg-muted/40 rounded p-3 space-y-1">
                                    <p className="text-sm font-medium text-destructive">{d.situation}</p>
                                    <p className="text-xs text-muted-foreground">Métrica: {d.metricLabel}</p>
                                    <p className="text-sm">{d.action}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>

            {/* Priorities */}
            {priorities.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Prioridades da Semana (Top 3)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {priorities.map((p, idx) => (
                      <motion.div
                        key={`${p.stageId}-${p.metricKey}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start gap-3 bg-destructive/5 border border-destructive/20 rounded-lg p-3"
                      >
                        <span className="bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{p.metricLabel}</p>
                          <p className="text-xs text-muted-foreground">
                            Etapa: {p.stageName} • Atual: {formatMetricByKey(p.metricKey, p.value)} • Meta: {formatMetricByKey(p.metricKey, p.target.value)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
