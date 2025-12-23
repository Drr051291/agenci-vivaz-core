import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Copy, Download, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, ShoppingCart, CreditCard, Users, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { usePageMeta } from "@/hooks/usePageMeta";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { cn } from "@/lib/utils";

import {
  EcommerceInputs,
  EcommerceOutputs,
  StageResult,
  StageDiagnostic,
  calculateOutputs,
  calculateStageResults,
  getStageDiagnostics,
  generateInsights,
  formatCurrency,
  formatPercent,
  formatNumber,
  exportToCSV,
  BENCHMARKS,
} from "@/lib/ecommerce/calc";

const statusConfig = {
  ok: { label: 'OK', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50 border-green-200', icon: CheckCircle },
  atencao: { label: 'Atenção', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50 border-yellow-200', icon: AlertTriangle },
  critico: { label: 'Crítico', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50 border-red-200', icon: TrendingDown },
  sem_dados: { label: 'Sem dados', color: 'bg-muted', textColor: 'text-muted-foreground', bgLight: 'bg-muted/50 border-border', icon: Eye },
};

export default function MatrizEcommerce() {
  usePageMeta({ title: "Matriz E-commerce | Ferramentas" });
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [clientId, setClientId] = useState<string | null>(null);
  const [name, setName] = useState(`Diagnóstico ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
  const [periodLabel, setPeriodLabel] = useState("");

  // Inputs
  const [inputs, setInputs] = useState<EcommerceInputs>({
    ctrFacebook: 0,
    cpcFacebook: 0,
    investFacebook: 0,
    ctrGoogle: 0,
    cpcGoogle: 0,
    investGoogle: 0,
    visitantes: 0,
    carrinhos: 0,
    compras: 0,
    vendasPagas: 0,
    ticketMedio: 0,
  });

  // Load clients
  const { data: clients } = useQuery({
    queryKey: ['clients-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name')
        .eq('status', 'active')
        .order('company_name');
      if (error) throw error;
      return data;
    },
  });

  // Load recent diagnostics
  const { data: recentDiagnostics, refetch: refetchDiagnostics } = useQuery({
    queryKey: ['ecommerce-diagnostics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecommerce_diagnostics')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Calculations
  const outputs = useMemo(() => calculateOutputs(inputs), [inputs]);
  const stageResults = useMemo(() => calculateStageResults(outputs), [outputs]);
  const stageDiagnostics = useMemo(() => getStageDiagnostics(stageResults), [stageResults]);
  const insights = useMemo(() => generateInsights(stageResults, outputs), [stageResults, outputs]);

  // Helpers
  const updateInput = (key: keyof EcommerceInputs, value: string) => {
    const parsed = parseFloat(value) || 0;
    setInputs(prev => ({ ...prev, [key]: parsed }));
  };

  // Actions
  const handleSave = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast({ title: "Erro", description: "Usuário não autenticado", variant: "destructive" });
      return;
    }

    const payload = {
      user_id: userData.user.id,
      client_id: clientId,
      name,
      period_label: periodLabel || null,
      ctr_facebook: inputs.ctrFacebook,
      cpc_facebook: inputs.cpcFacebook,
      invest_facebook: inputs.investFacebook,
      ctr_google: inputs.ctrGoogle,
      cpc_google: inputs.cpcGoogle,
      invest_google: inputs.investGoogle,
      visitantes: inputs.visitantes,
      carrinhos: inputs.carrinhos,
      compras: inputs.compras,
      vendas_pagas: inputs.vendasPagas,
      ticket_medio: inputs.ticketMedio,
      faturamento: outputs.faturamento,
      roas: outputs.roas,
      taxa_visitante_carrinho: outputs.taxaVisitanteCarrinho,
      taxa_carrinho_compra: outputs.taxaCarrinhoCompra,
      taxa_compra_pagamento: outputs.taxaCompraPagamento,
      diagnostico_json: JSON.parse(JSON.stringify({ diagnostics: stageDiagnostics, insights })),
      status_trafego: 'ok', // Could be calculated based on CPC/CTR
      status_visitante_carrinho: stageResults[0]?.status || 'sem_dados',
      status_carrinho_compra: stageResults[1]?.status || 'sem_dados',
      status_compra_pagamento: stageResults[2]?.status || 'sem_dados',
    };

    const { error } = await supabase.from('ecommerce_diagnostics').insert([payload]);
    
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Diagnóstico salvo com sucesso!" });
      refetchDiagnostics();
    }
  };

  const handleExportCSV = () => {
    const csv = exportToCSV(inputs, outputs, stageResults);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagnostico-ecommerce-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast({ title: "CSV exportado!" });
  };

  const handleDuplicate = () => {
    setName(`${name} (cópia)`);
    toast({ title: "Duplicado! Edite e salve novamente." });
  };

  const loadDiagnostic = (diag: any) => {
    setClientId(diag.client_id);
    setName(diag.name);
    setPeriodLabel(diag.period_label || '');
    setInputs({
      ctrFacebook: diag.ctr_facebook || 0,
      cpcFacebook: diag.cpc_facebook || 0,
      investFacebook: diag.invest_facebook || 0,
      ctrGoogle: diag.ctr_google || 0,
      cpcGoogle: diag.cpc_google || 0,
      investGoogle: diag.invest_google || 0,
      visitantes: diag.visitantes || 0,
      carrinhos: diag.carrinhos || 0,
      compras: diag.compras || 0,
      vendasPagas: diag.vendas_pagas || 0,
      ticketMedio: diag.ticket_medio || 0,
    });
    toast({ title: "Diagnóstico carregado!" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/ferramentas')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Matriz E-commerce</h1>
              <p className="text-muted-foreground text-sm">Diagnóstico de funil e identificação de gargalos</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDuplicate}>
              <Copy className="h-4 w-4 mr-2" />Duplicar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />CSV
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />Salvar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Inputs */}
          <div className="space-y-6">
            {/* Context Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Contexto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do diagnóstico</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Cliente (opcional)</Label>
                  <Select value={clientId ?? "__none__"} onValueChange={v => setClientId(v === "__none__" ? null : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {clients?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Período (opcional)</Label>
                  <Input placeholder="Ex: Janeiro 2025" value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {/* Traffic Inputs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Tráfego
                </CardTitle>
                <CardDescription>Dados de mídia paga</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Invest. Facebook (R$)</Label>
                    <Input type="number" value={inputs.investFacebook || ''} onChange={e => updateInput('investFacebook', e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Invest. Google (R$)</Label>
                    <Input type="number" value={inputs.investGoogle || ''} onChange={e => updateInput('investGoogle', e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">CPC Facebook (R$)</Label>
                    <Input type="number" step="0.01" value={inputs.cpcFacebook || ''} onChange={e => updateInput('cpcFacebook', e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">CPC Google (R$)</Label>
                    <Input type="number" step="0.01" value={inputs.cpcGoogle || ''} onChange={e => updateInput('cpcGoogle', e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">CTR Facebook (%)</Label>
                    <Input type="number" step="0.01" value={inputs.ctrFacebook || ''} onChange={e => updateInput('ctrFacebook', e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">CTR Google (%)</Label>
                    <Input type="number" step="0.01" value={inputs.ctrGoogle || ''} onChange={e => updateInput('ctrGoogle', e.target.value)} placeholder="0" />
                  </div>
                </div>
                <Separator />
                <div className="text-sm text-muted-foreground">
                  <p>Total: <span className="font-medium text-foreground">{formatCurrency(outputs.investimentoTotal)}</span></p>
                  {outputs.cliquesTotal && <p>Cliques est.: <span className="font-medium text-foreground">{formatNumber(outputs.cliquesTotal)}</span></p>}
                </div>
              </CardContent>
            </Card>

            {/* Funnel Inputs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Funil de Vendas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Visitantes</Label>
                    <Input type="number" value={inputs.visitantes || ''} onChange={e => updateInput('visitantes', e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Carrinhos</Label>
                    <Input type="number" value={inputs.carrinhos || ''} onChange={e => updateInput('carrinhos', e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Compras iniciadas</Label>
                    <Input type="number" value={inputs.compras || ''} onChange={e => updateInput('compras', e.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Vendas pagas</Label>
                    <Input type="number" value={inputs.vendasPagas || ''} onChange={e => updateInput('vendasPagas', e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Ticket Médio (R$)</Label>
                  <Input type="number" step="0.01" value={inputs.ticketMedio || ''} onChange={e => updateInput('ticketMedio', e.target.value)} placeholder="0" />
                </div>
              </CardContent>
            </Card>

            {/* Recent Diagnostics */}
            {recentDiagnostics && recentDiagnostics.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Diagnósticos recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recentDiagnostics.slice(0, 5).map((d: any) => (
                      <button
                        key={d.id}
                        onClick={() => loadDiagnostic(d)}
                        className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors text-sm"
                      >
                        <p className="font-medium truncate">{d.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(d.updated_at).toLocaleDateString('pt-BR')}
                        </p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Middle Column - Funnel Visual + KPIs */}
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Faturamento</p>
                  <p className="text-2xl font-bold">{formatCurrency(outputs.faturamento)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">ROAS</p>
                  <p className="text-2xl font-bold">{outputs.roas ? `${outputs.roas.toFixed(2)}x` : '—'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Funnel Visualization */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Funil de Conversão</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Funnel bars */}
                <TooltipProvider>
                  <div className="space-y-3">
                    {/* Visitantes */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Visitantes
                        </span>
                        <span className="font-medium">{formatNumber(inputs.visitantes)}</span>
                      </div>
                      <div className="h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground text-sm font-medium">
                        100%
                      </div>
                    </div>

                    {/* Conversion arrow */}
                    <div className="flex items-center justify-center">
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className={cn("gap-1", statusConfig[stageResults[0]?.status || 'sem_dados'].bgLight)}>
                            ↓ {formatPercent(outputs.taxaVisitanteCarrinho)}
                            <span className="text-xs text-muted-foreground">(meta: {BENCHMARKS.visitanteCarrinho}%)</span>
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Taxa de conversão: Visitantes → Carrinho</TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Carrinhos */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4" />
                          Carrinhos
                        </span>
                        <span className="font-medium">{formatNumber(inputs.carrinhos)}</span>
                      </div>
                      <div 
                        className={cn("h-8 rounded-md flex items-center justify-center text-white text-sm font-medium", statusConfig[stageResults[0]?.status || 'sem_dados'].color)}
                        style={{ width: `${Math.max((outputs.taxaVisitanteCarrinho || 0) * 5, 20)}%` }}
                      >
                        {formatPercent(outputs.taxaVisitanteCarrinho)}
                      </div>
                    </div>

                    {/* Conversion arrow */}
                    <div className="flex items-center justify-center">
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className={cn("gap-1", statusConfig[stageResults[1]?.status || 'sem_dados'].bgLight)}>
                            ↓ {formatPercent(outputs.taxaCarrinhoCompra)}
                            <span className="text-xs text-muted-foreground">(meta: {BENCHMARKS.carrinhoCompra}%)</span>
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Taxa de conversão: Carrinho → Compra</TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Compras */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Compras iniciadas
                        </span>
                        <span className="font-medium">{formatNumber(inputs.compras)}</span>
                      </div>
                      <div 
                        className={cn("h-8 rounded-md flex items-center justify-center text-white text-sm font-medium", statusConfig[stageResults[1]?.status || 'sem_dados'].color)}
                        style={{ width: `${Math.max((outputs.taxaCarrinhoCompra || 0) * 3, 15)}%` }}
                      >
                        {formatPercent(outputs.taxaCarrinhoCompra)}
                      </div>
                    </div>

                    {/* Conversion arrow */}
                    <div className="flex items-center justify-center">
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className={cn("gap-1", statusConfig[stageResults[2]?.status || 'sem_dados'].bgLight)}>
                            ↓ {formatPercent(outputs.taxaCompraPagamento)}
                            <span className="text-xs text-muted-foreground">(meta: {BENCHMARKS.compraPagamento}%)</span>
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Taxa de conversão: Compra → Pagamento</TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Vendas Pagas */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Vendas pagas
                        </span>
                        <span className="font-medium">{formatNumber(inputs.vendasPagas)}</span>
                      </div>
                      <div 
                        className={cn("h-8 rounded-md flex items-center justify-center text-white text-sm font-medium", statusConfig[stageResults[2]?.status || 'sem_dados'].color)}
                        style={{ width: `${Math.max((outputs.taxaCompraPagamento || 0) * 0.8, 10)}%` }}
                      >
                        {formatPercent(outputs.taxaCompraPagamento)}
                      </div>
                    </div>
                  </div>
                </TooltipProvider>

                {/* Status Legend */}
                <Separator />
                <div className="flex flex-wrap gap-2 justify-center">
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <Badge key={key} variant="outline" className={cn("gap-1", config.bgLight)}>
                      <div className={cn("w-2 h-2 rounded-full", config.color)} />
                      {config.label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Insights */}
            {insights.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Insights Rápidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {insights.map((insight, i) => (
                      <li key={i} className="text-sm">{insight}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Diagnostics */}
          <div className="space-y-6">
            {/* Stage Status Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Resumo por Etapa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stageResults.map((stage) => {
                    const config = statusConfig[stage.status];
                    const Icon = config.icon;
                    return (
                      <div key={stage.stage} className={cn("p-3 rounded-lg border", config.bgLight)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-4 w-4", config.textColor)} />
                            <span className="font-medium text-sm">{stage.label}</span>
                          </div>
                          <Badge variant="outline" className={config.textColor}>
                            {formatPercent(stage.atual)} / {formatPercent(stage.meta)}
                          </Badge>
                        </div>
                        {stage.gap !== null && stage.status !== 'ok' && (
                          <p className={cn("text-xs mt-1", config.textColor)}>
                            Gap: {stage.gap > 0 ? '+' : ''}{formatPercent(stage.gap)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Diagnostics Details */}
            {stageDiagnostics.length > 0 ? (
              stageDiagnostics.map((diag) => {
                const config = statusConfig[diag.status];
                return (
                  <Card key={diag.stage} className={cn("border-l-4", diag.status === 'critico' ? 'border-l-red-500' : 'border-l-yellow-500')}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className={cn("h-4 w-4", config.textColor)} />
                        {diag.label}
                      </CardTitle>
                      <CardDescription>Possíveis causas e soluções</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {diag.items.map((item) => (
                          <div key={item.id} className="space-y-1">
                            <p className="text-sm font-medium text-destructive">{item.id}. {item.falha}</p>
                            <p className="text-sm text-muted-foreground pl-4">→ {item.solucao}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                    <p className="font-medium">Nenhum problema identificado</p>
                    <p className="text-sm">Todas as taxas estão dentro ou acima do benchmark</p>
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
