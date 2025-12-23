import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Save, Copy, Download, Sparkles, AlertTriangle, TrendingUp, TrendingDown, ChevronDown, Info } from "lucide-react";
import { motion } from "framer-motion";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CurrencyInput } from "@/components/ui/currency-input";
import { NumberInput } from "@/components/ui/number-input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  DREInputs,
  ProjectionModel,
  ScalingType,
  calculateDREProjection,
  formatCurrency,
  formatPercent,
  formatNumber,
  generateDREInsights,
  exportDREToCSV,
} from "@/lib/dre/calc";

const HORIZON_OPTIONS = [3, 6, 12, 18, 24];

export default function DREProjetado() {
  usePageMeta({
    title: "DRE Projetado | HUB Vivaz",
    description: "Simule performance financeira e projete resultados por mês.",
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Form state
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [name, setName] = useState(`DRE ${format(new Date(), "dd/MM/yyyy HH:mm")}`);
  const [baseMonth, setBaseMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [horizonMonths, setHorizonMonths] = useState(12);
  const [model, setModel] = useState<ProjectionModel>("INVEST_TO_REV");
  
  // Base month inputs
  const [receitaBase, setReceitaBase] = useState(0);
  const [pedidosBase, setPedidosBase] = useState(0);
  const [cmvBase, setCmvBase] = useState(0);
  const [freteBase, setFreteBase] = useState(0);
  const [investimentoBase, setInvestimentoBase] = useState(0);
  const [comissaoBase, setComissaoBase] = useState(0);
  const [custosFixosBase, setCustosFixosBase] = useState(0);
  const [impostoPct, setImpostoPct] = useState(10);
  
  // Growth params
  const [gMkt, setGMkt] = useState(0);
  const [dRoas, setDRoas] = useState(0);
  const [gRev, setGRev] = useState(0);
  const [gTicket, setGTicket] = useState(0);
  const [gFix, setGFix] = useState(0);
  const [retornoPct, setRetornoPct] = useState(0);
  
  // Scaling options
  const [cmvScaling, setCmvScaling] = useState<ScalingType>("pedidos");
  const [freteScaling, setFreteScaling] = useState<ScalingType>("pedidos");
  const [comissaoScaling, setComissaoScaling] = useState<ScalingType>("receita");
  
  // Thresholds
  const [margemMinima, setMargemMinima] = useState<number | undefined>(undefined);
  const [roasMinimo, setRoasMinimo] = useState<number | undefined>(undefined);
  const [ebitdaMinimo, setEbitdaMinimo] = useState<number | undefined>(undefined);
  
  // UI state
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  
  // Derived values
  const ticketMedio = pedidosBase > 0 ? receitaBase / pedidosBase : 0;
  const roasBase = investimentoBase > 0 ? receitaBase / investimentoBase : 0;
  
  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["clients-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name")
        .eq("status", "active")
        .order("company_name");
      if (error) throw error;
      return data;
    },
  });
  
  // Fetch recent simulations
  const { data: recentSimulations } = useQuery({
    queryKey: ["dre-simulations-recent"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("dre_simulations")
        .select("id, name, updated_at, client_id")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });
  
  // Calculate projection
  const projection = useMemo(() => {
    const inputs: DREInputs = {
      receitaBase,
      pedidosBase,
      cmvBase,
      freteBase,
      investimentoBase,
      comissaoBase,
      custosFixosBase,
      impostoPct,
      model,
      horizonMonths,
      gMkt,
      dRoas,
      gRev,
      gTicket,
      gFix,
      retornoPct,
      cmvScaling,
      freteScaling,
      comissaoScaling,
      margemMinima,
      roasMinimo,
      ebitdaMinimo,
    };
    
    const [year, month] = baseMonth.split("-").map(Number);
    const baseDate = new Date(year, month - 1, 1);
    
    return calculateDREProjection(inputs, baseDate);
  }, [
    receitaBase, pedidosBase, cmvBase, freteBase, investimentoBase,
    comissaoBase, custosFixosBase, impostoPct, model, horizonMonths,
    gMkt, dRoas, gRev, gTicket, gFix, retornoPct,
    cmvScaling, freteScaling, comissaoScaling,
    margemMinima, roasMinimo, ebitdaMinimo, baseMonth
  ]);
  
  const insights = useMemo(() => generateDREInsights(projection), [projection]);
  
  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      
      const [year, month] = baseMonth.split("-").map(Number);
      const baseDate = new Date(year, month - 1, 1);
      
      const payload = {
        user_id: user.id,
        client_id: clientId,
        name,
        base_month: format(baseDate, "yyyy-MM-dd"),
        horizon_months: horizonMonths,
        model,
        receita_base: receitaBase,
        pedidos_base: pedidosBase,
        cmv_base: cmvBase,
        frete_base: freteBase,
        investimento_base: investimentoBase,
        comissao_base: comissaoBase,
        custos_fixos_base: custosFixosBase,
        imposto_pct: impostoPct,
        g_mkt: gMkt,
        d_roas: dRoas,
        g_rev: gRev,
        g_ticket: gTicket,
        g_fix: gFix,
        retorno_pct: retornoPct,
        cmv_scaling: cmvScaling,
        frete_scaling: freteScaling,
        comissao_scaling: comissaoScaling,
        margem_minima: margemMinima ?? null,
        roas_minimo: roasMinimo ?? null,
        ebitda_minimo: ebitdaMinimo ?? null,
        projection_json: JSON.parse(JSON.stringify(projection)),
      };
      
      if (simulationId) {
        const { error } = await supabase
          .from("dre_simulations")
          .update(payload)
          .eq("id", simulationId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("dre_simulations")
          .insert([payload])
          .select("id")
          .single();
        if (error) throw error;
        setSimulationId(data.id);
      }
    },
    onSuccess: () => {
      toast.success("Simulação salva com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["dre-simulations-recent"] });
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });
  
  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async () => {
      setSimulationId(null);
      setName(`${name} (cópia)`);
      await saveMutation.mutateAsync();
    },
    onSuccess: () => {
      toast.success("Simulação duplicada com sucesso.");
    },
  });
  
  // Load simulation
  const loadSimulation = async (id: string) => {
    const { data, error } = await supabase
      .from("dre_simulations")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error) {
      toast.error("Erro ao carregar simulação");
      return;
    }
    
    setSimulationId(data.id);
    setClientId(data.client_id);
    setName(data.name);
    setBaseMonth(format(new Date(data.base_month), "yyyy-MM"));
    setHorizonMonths(data.horizon_months);
    setModel(data.model as ProjectionModel);
    setReceitaBase(Number(data.receita_base));
    setPedidosBase(Number(data.pedidos_base));
    setCmvBase(Number(data.cmv_base));
    setFreteBase(Number(data.frete_base));
    setInvestimentoBase(Number(data.investimento_base));
    setComissaoBase(Number(data.comissao_base));
    setCustosFixosBase(Number(data.custos_fixos_base));
    setImpostoPct(Number(data.imposto_pct));
    setGMkt(Number(data.g_mkt));
    setDRoas(Number(data.d_roas));
    setGRev(Number(data.g_rev));
    setGTicket(Number(data.g_ticket));
    setGFix(Number(data.g_fix));
    setRetornoPct(Number(data.retorno_pct));
    setCmvScaling(data.cmv_scaling as ScalingType);
    setFreteScaling(data.frete_scaling as ScalingType);
    setComissaoScaling(data.comissao_scaling as ScalingType);
    setMargemMinima(data.margem_minima ? Number(data.margem_minima) : undefined);
    setRoasMinimo(data.roas_minimo ? Number(data.roas_minimo) : undefined);
    setEbitdaMinimo(data.ebitda_minimo ? Number(data.ebitda_minimo) : undefined);
    
    toast.success("Simulação carregada");
  };
  
  // Export CSV
  const handleExportCSV = () => {
    const csv = exportDREToCSV(projection);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${name.replace(/\s+/g, "_")}.csv`;
    link.click();
    toast.success("CSV exportado com sucesso.");
  };
  
  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/ferramentas")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">DRE Projetado</h1>
                <p className="text-sm text-muted-foreground">
                  Simule performance financeira e projete resultados por mês com base nos seus custos e receita.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInsights(!showInsights)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                IA
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => duplicateMutation.mutate()}
                disabled={duplicateMutation.isPending}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </Button>
              <Button
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
          
          {/* AI Insights */}
          {showInsights && insights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Insights da Projeção
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm">
                    {insights.map((insight, i) => (
                      <li key={i}>{insight}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          )}
          
          <p className="text-xs text-muted-foreground">
            As projeções são estimativas. Revise premissas sempre que houver mudança em custos, impostos ou performance de mídia.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Parameters */}
            <div className="lg:col-span-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Parâmetros</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* A) Contexto */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Contexto</h4>
                    
                    <div className="space-y-2">
                      <Label>Cliente (opcional)</Label>
                      <Select value={clientId ?? "__none__"} onValueChange={(v) => setClientId(v === "__none__" ? null : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum</SelectItem>
                          {clients?.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Nome da simulação</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Mês base</Label>
                      <Input
                        type="month"
                        value={baseMonth}
                        onChange={(e) => setBaseMonth(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Horizonte de projeção</Label>
                      <Select value={String(horizonMonths)} onValueChange={(v) => setHorizonMonths(Number(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HORIZON_OPTIONS.map((h) => (
                            <SelectItem key={h} value={String(h)}>{h} meses</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* B) Dados do mês base */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Dados do mês base</h4>
                    
                    <div className="space-y-2">
                      <Label>Receita (R$)</Label>
                      <CurrencyInput value={receitaBase} onChange={setReceitaBase} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Número de pedidos</Label>
                      <NumberInput value={pedidosBase} onChange={setPedidosBase} min={0} />
                      {pedidosBase > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Ticket médio: {formatCurrency(ticketMedio)}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Custo de mercadoria / CMV (R$)</Label>
                      <CurrencyInput value={cmvBase} onChange={setCmvBase} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Custo de frete (R$)</Label>
                      <CurrencyInput value={freteBase} onChange={setFreteBase} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        Investimento em mídia (R$)
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Valor investido em anúncios pagos (Google Ads, Meta Ads, etc.)</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <CurrencyInput value={investimentoBase} onChange={setInvestimentoBase} />
                      {investimentoBase > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ROAS: {roasBase.toFixed(2)}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Custo de comissão (R$)</Label>
                      <CurrencyInput value={comissaoBase} onChange={setComissaoBase} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Custos fixos (R$)</Label>
                      <CurrencyInput value={custosFixosBase} onChange={setCustosFixosBase} />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        Imposto (%)
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Alíquota média de impostos sobre a receita (ICMS, ISS, PIS, COFINS, etc.)</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[impostoPct]}
                          onValueChange={([v]) => setImpostoPct(v)}
                          min={0}
                          max={40}
                          step={0.5}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium w-14 text-right">{formatPercent(impostoPct, 1)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* C) Modelo de projeção */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Modelo de projeção</h4>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={model === "INVEST_TO_REV" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setModel("INVEST_TO_REV")}
                        className="text-xs"
                      >
                        Investimento → Receita
                      </Button>
                      <Button
                        variant={model === "REV_GROWTH" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setModel("REV_GROWTH")}
                        className="text-xs"
                      >
                        Receita → Receita
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* D) Premissas de crescimento */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Premissas de crescimento</h4>
                    
                    {model === "INVEST_TO_REV" ? (
                      <>
                        <div className="space-y-2">
                          <Label>Crescimento do investimento (% ao mês)</Label>
                          <div className="flex items-center gap-2">
                            <Slider
                              value={[gMkt]}
                              onValueChange={([v]) => setGMkt(v)}
                              min={-20}
                              max={50}
                              step={0.5}
                              className="flex-1"
                            />
                            <span className="text-sm font-medium w-14 text-right">{formatPercent(gMkt, 1)}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            Perda de performance / queda de ROAS (% ao mês)
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Representa a degradação natural de performance ao escalar mídia.</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <div className="flex items-center gap-2">
                            <Slider
                              value={[dRoas]}
                              onValueChange={([v]) => setDRoas(v)}
                              min={0}
                              max={20}
                              step={0.5}
                              className="flex-1"
                            />
                            <span className="text-sm font-medium w-14 text-right">{formatPercent(dRoas, 1)}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label>Crescimento da receita (% ao mês)</Label>
                          <div className="flex items-center gap-2">
                            <Slider
                              value={[gRev]}
                              onValueChange={([v]) => setGRev(v)}
                              min={-20}
                              max={50}
                              step={0.5}
                              className="flex-1"
                            />
                            <span className="text-sm font-medium w-14 text-right">{formatPercent(gRev, 1)}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Crescimento do ticket (% ao mês)</Label>
                          <div className="flex items-center gap-2">
                            <Slider
                              value={[gTicket]}
                              onValueChange={([v]) => setGTicket(v)}
                              min={-10}
                              max={20}
                              step={0.5}
                              className="flex-1"
                            />
                            <span className="text-sm font-medium w-14 text-right">{formatPercent(gTicket, 1)}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Crescimento do investimento (% ao mês)</Label>
                          <div className="flex items-center gap-2">
                            <Slider
                              value={[gMkt]}
                              onValueChange={([v]) => setGMkt(v)}
                              min={-20}
                              max={50}
                              step={0.5}
                              className="flex-1"
                            />
                            <span className="text-sm font-medium w-14 text-right">{formatPercent(gMkt, 1)}</span>
                          </div>
                        </div>
                      </>
                    )}
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        Taxa de retorno/recorrência (% ao mês)
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Percentual da receita do mês anterior que retorna como receita adicional (recompra, assinatura, etc.)</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[retornoPct]}
                          onValueChange={([v]) => setRetornoPct(v)}
                          min={0}
                          max={50}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium w-14 text-right">{formatPercent(retornoPct, 0)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* E) Custos na projeção */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Custos na projeção</h4>
                    
                    <div className="space-y-2">
                      <Label>CMV: escalar</Label>
                      <Select value={cmvScaling} onValueChange={(v) => setCmvScaling(v as ScalingType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pedidos">Proporcional aos pedidos</SelectItem>
                          <SelectItem value="receita">Proporcional à receita</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Frete: escalar</Label>
                      <Select value={freteScaling} onValueChange={(v) => setFreteScaling(v as ScalingType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pedidos">Proporcional aos pedidos</SelectItem>
                          <SelectItem value="receita">Proporcional à receita</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Comissão: escalar</Label>
                      <Select value={comissaoScaling} onValueChange={(v) => setComissaoScaling(v as ScalingType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="receita">Proporcional à receita</SelectItem>
                          <SelectItem value="fixo">Valor fixo mensal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Crescimento dos custos fixos (% ao mês)</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[gFix]}
                          onValueChange={([v]) => setGFix(v)}
                          min={0}
                          max={20}
                          step={0.5}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium w-14 text-right">{formatPercent(gFix, 1)}</span>
                      </div>
                    </div>
                    
                    {/* Advanced */}
                    <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-between">
                          Avançado: Limites e alertas
                          <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Margem mínima (%)</Label>
                          <NumberInput
                            value={margemMinima ?? 0}
                            onChange={(v) => setMargemMinima(v > 0 ? v : undefined)}
                            suffix="%"
                            min={0}
                            max={100}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>ROAS mínimo</Label>
                          <NumberInput
                            value={roasMinimo ?? 0}
                            onChange={(v) => setRoasMinimo(v > 0 ? v : undefined)}
                            min={0}
                            max={20}
                            step={0.1}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>EBITDA mínimo (R$)</Label>
                          <CurrencyInput
                            value={ebitdaMinimo ?? 0}
                            onChange={(v) => setEbitdaMinimo(v > 0 ? v : undefined)}
                          />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </CardContent>
              </Card>
              
              {/* Recent simulations */}
              {recentSimulations && recentSimulations.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Simulações recentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {recentSimulations.map((sim) => (
                        <button
                          key={sim.id}
                          onClick={() => loadSimulation(sim.id)}
                          className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                        >
                          <p className="text-sm font-medium truncate">{sim.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(sim.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {/* Right Column: KPIs and Breakdown */}
            <div className="lg:col-span-8 space-y-4">
              {/* Main KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <KPICard
                  title="Receita"
                  baseValue={formatCurrency(projection.baseMonth.receita)}
                  lastValue={formatCurrency(projection.lastMonth.receita)}
                  trend={projection.lastMonth.receita > projection.baseMonth.receita ? 'up' : 'down'}
                />
                <KPICard
                  title="Pedidos"
                  baseValue={formatNumber(projection.baseMonth.pedidos)}
                  lastValue={formatNumber(projection.lastMonth.pedidos)}
                  trend={projection.lastMonth.pedidos > projection.baseMonth.pedidos ? 'up' : 'down'}
                />
                <KPICard
                  title="Margem Contrib."
                  baseValue={`${formatCurrency(projection.baseMonth.margemContrib)} (${formatPercent(projection.baseMonth.margemContribPct, 1)})`}
                  lastValue={`${formatCurrency(projection.lastMonth.margemContrib)} (${formatPercent(projection.lastMonth.margemContribPct, 1)})`}
                  trend={projection.lastMonth.margemContribPct > projection.baseMonth.margemContribPct ? 'up' : 'down'}
                />
                <KPICard
                  title="EBITDA"
                  baseValue={`${formatCurrency(projection.baseMonth.ebitda)} (${formatPercent(projection.baseMonth.ebitdaPct, 1)})`}
                  lastValue={`${formatCurrency(projection.lastMonth.ebitda)} (${formatPercent(projection.lastMonth.ebitdaPct, 1)})`}
                  trend={projection.lastMonth.ebitda > projection.baseMonth.ebitda ? 'up' : 'down'}
                  highlight={projection.lastMonth.ebitda < 0}
                />
                <KPICard
                  title="ROAS"
                  baseValue={projection.baseMonth.roas.toFixed(2)}
                  lastValue={projection.lastMonth.roas.toFixed(2)}
                  trend={projection.lastMonth.roas > projection.baseMonth.roas ? 'up' : 'down'}
                />
              </div>
              
              {/* Secondary KPIs */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                <SmallKPICard
                  title="Impostos"
                  baseValue={formatCurrency(projection.baseMonth.impostos)}
                  lastValue={formatCurrency(projection.lastMonth.impostos)}
                />
                <SmallKPICard
                  title="CMV"
                  baseValue={formatCurrency(projection.baseMonth.cmv)}
                  lastValue={formatCurrency(projection.lastMonth.cmv)}
                />
                <SmallKPICard
                  title="Frete"
                  baseValue={formatCurrency(projection.baseMonth.frete)}
                  lastValue={formatCurrency(projection.lastMonth.frete)}
                />
                <SmallKPICard
                  title="Comissão"
                  baseValue={formatCurrency(projection.baseMonth.comissao)}
                  lastValue={formatCurrency(projection.lastMonth.comissao)}
                />
                <SmallKPICard
                  title="Custos Fixos"
                  baseValue={formatCurrency(projection.baseMonth.custosFixos)}
                  lastValue={formatCurrency(projection.lastMonth.custosFixos)}
                />
                <SmallKPICard
                  title="Investimento"
                  baseValue={formatCurrency(projection.baseMonth.investimento)}
                  lastValue={formatCurrency(projection.lastMonth.investimento)}
                />
              </div>
              
              {/* Alerts */}
              {projection.alerts.length > 0 && (
                <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-orange-700 dark:text-orange-300">
                      <AlertTriangle className="h-4 w-4" />
                      Alertas ({projection.alerts.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {projection.alerts.slice(0, 10).map((alert, i) => (
                        <div
                          key={i}
                          className={`text-sm p-2 rounded ${
                            alert.severity === 'error'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                          }`}
                        >
                          <span className="font-medium">{alert.label}:</span> {alert.message}
                        </div>
                      ))}
                      {projection.alerts.length > 10 && (
                        <p className="text-xs text-muted-foreground">
                          + {projection.alerts.length - 10} alertas adicionais
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* DRE Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">DRE por mês</CardTitle>
                  <CardDescription>Demonstrativo de Resultado projetado mês a mês</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="w-full">
                    <div className="min-w-[800px]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 font-medium sticky left-0 bg-background z-10 min-w-[180px]">
                              Linha
                            </th>
                            {projection.months.map((m) => (
                              <th key={m.month} className="text-right py-2 px-3 font-medium min-w-[100px]">
                                {m.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <DRERow label="Receita bruta" values={projection.months.map(m => formatCurrency(m.receita))} />
                          <DRERow label="(-) Impostos" values={projection.months.map(m => formatCurrency(m.impostos))} muted />
                          <DRERow label="(=) Receita líquida" values={projection.months.map(m => formatCurrency(m.receitaLiquida))} highlight />
                          <DRERow label="(-) CMV" values={projection.months.map(m => formatCurrency(m.cmv))} muted />
                          <DRERow label="(-) Frete" values={projection.months.map(m => formatCurrency(m.frete))} muted />
                          <DRERow label="(-) Comissão" values={projection.months.map(m => formatCurrency(m.comissao))} muted />
                          <DRERow label="(=) Margem de contribuição (R$)" values={projection.months.map(m => formatCurrency(m.margemContrib))} highlight />
                          <DRERow label="(=) Margem de contribuição (%)" values={projection.months.map(m => formatPercent(m.margemContribPct, 1))} />
                          <DRERow label="(-) Investimento em mídia" values={projection.months.map(m => formatCurrency(m.investimento))} muted />
                          <DRERow label="(-) Custos fixos" values={projection.months.map(m => formatCurrency(m.custosFixos))} muted />
                          <DRERow
                            label="(=) EBITDA (R$)"
                            values={projection.months.map(m => formatCurrency(m.ebitda))}
                            highlight
                            negative={projection.months.some(m => m.ebitda < 0)}
                          />
                          <DRERow label="(=) EBITDA (%)" values={projection.months.map(m => formatPercent(m.ebitdaPct, 1))} />
                        </tbody>
                      </table>
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}

// Helper components
function KPICard({
  title,
  baseValue,
  lastValue,
  trend,
  highlight = false,
}: {
  title: string;
  baseValue: string;
  lastValue: string;
  trend: 'up' | 'down';
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-red-300 dark:border-red-700' : ''}>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground mb-1">{title}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Base</span>
            <span className="text-xs font-medium">{baseValue}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Último</span>
            <span className={`text-sm font-semibold flex items-center gap-1 ${highlight ? 'text-red-600 dark:text-red-400' : ''}`}>
              {lastValue}
              {trend === 'up' ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SmallKPICard({
  title,
  baseValue,
  lastValue,
}: {
  title: string;
  baseValue: string;
  lastValue: string;
}) {
  return (
    <Card>
      <CardContent className="p-2">
        <p className="text-[10px] text-muted-foreground mb-0.5">{title}</p>
        <p className="text-[10px]">
          <span className="text-muted-foreground">B: </span>
          <span className="font-medium">{baseValue}</span>
        </p>
        <p className="text-[10px]">
          <span className="text-muted-foreground">Ú: </span>
          <span className="font-medium">{lastValue}</span>
        </p>
      </CardContent>
    </Card>
  );
}

function DRERow({
  label,
  values,
  muted = false,
  highlight = false,
  negative = false,
}: {
  label: string;
  values: string[];
  muted?: boolean;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <tr className={`border-b ${highlight ? 'bg-muted/50 font-medium' : ''}`}>
      <td className={`py-2 px-3 sticky left-0 bg-background z-10 ${muted ? 'text-muted-foreground' : ''}`}>
        {label}
      </td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`py-2 px-3 text-right ${muted ? 'text-muted-foreground' : ''} ${negative && v.includes('-') ? 'text-red-600 dark:text-red-400' : ''}`}
        >
          {v}
        </td>
      ))}
    </tr>
  );
}
