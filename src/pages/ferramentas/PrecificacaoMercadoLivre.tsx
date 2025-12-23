import { useState, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CurrencyInput } from "@/components/ui/currency-input";
import { NumberInput } from "@/components/ui/number-input";
import { ArrowLeft, Save, Copy, Download, Sparkles, Info, AlertTriangle, TrendingUp, DollarSign, Percent, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  calculateFromPrice, 
  calculatePriceForMargin, 
  calculatePriceForProfit, 
  formatBRL, 
  formatPercent 
} from "@/lib/mlPricing/calc";

type ListingType = 'CLASSICO' | 'PREMIUM';
type ProductCondition = 'NOVO' | 'USADO';
type CalculationMode = 'PRICE_TO_RESULT' | 'TARGET_TO_PRICE';
type TargetType = 'MARGIN' | 'PROFIT';

interface Simulation {
  id: string;
  name: string;
  created_at: string;
  listing_type: ListingType;
  mode: CalculationMode;
}

export default function PrecificacaoMercadoLivre() {
  usePageMeta({
    title: "Calculadora de Precificação — Mercado Livre | HUB Vivaz",
    description: "Simule taxas, frete e margem para definir o preço ideal por anúncio.",
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form state
  const [clientId, setClientId] = useState<string>("");
  const [simulationName, setSimulationName] = useState(`Simulação ${format(new Date(), "dd/MM/yyyy HH:mm")}`);
  const [sku, setSku] = useState("");
  const [listingType, setListingType] = useState<ListingType>("CLASSICO");
  const [productCondition, setProductCondition] = useState<ProductCondition>("NOVO");
  const [hasFreeShipping, setHasFreeShipping] = useState(false);
  const [mode, setMode] = useState<CalculationMode>("PRICE_TO_RESULT");
  const [targetType, setTargetType] = useState<TargetType>("MARGIN");
  
  // Values
  const [salePrice, setSalePrice] = useState(0);
  const [targetValue, setTargetValue] = useState(0);
  const [cogs, setCogs] = useState(0);
  const [commissionPct, setCommissionPct] = useState(0);
  const [fixedFee, setFixedFee] = useState(0);
  const [taxPct, setTaxPct] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [packagingCost, setPackagingCost] = useState(0);
  const [platformCost, setPlatformCost] = useState(0);
  const [adsCost, setAdsCost] = useState(0);
  const [otherCost, setOtherCost] = useState(0);

  const [currentSimulationId, setCurrentSimulationId] = useState<string | null>(null);

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ['clients-for-ml'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name')
        .order('company_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch recent simulations
  const { data: recentSimulations, isLoading: loadingSimulations } = useQuery({
    queryKey: ['ml-simulations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('ml_pricing_simulations')
        .select('id, name, created_at, listing_type, mode')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as Simulation[];
    },
  });

  // Calculate extra costs sum
  const extraCosts = packagingCost + platformCost + adsCost + otherCost;

  // Compute outputs
  const outputs = useMemo(() => {
    if (mode === 'TARGET_TO_PRICE') {
      // Calculate suggested price first
      const result = targetType === 'MARGIN'
        ? calculatePriceForMargin(targetValue, cogs, commissionPct, fixedFee, taxPct, shippingCost, extraCosts)
        : calculatePriceForProfit(targetValue, cogs, commissionPct, fixedFee, taxPct, shippingCost, extraCosts);
      
      if (!result.isValid) {
        return {
          suggestedPrice: 0,
          isValid: false,
          errorMessage: result.errorMessage,
          mlFee: 0,
          taxAmount: 0,
          extraCosts,
          netReceipt: 0,
          profit: 0,
          marginPct: 0,
          breakEvenPrice: 0,
        };
      }
      
      // Now calculate all outputs using suggested price
      const computed = calculateFromPrice({
        salePrice: result.suggestedPrice,
        cogs,
        commissionPct,
        fixedFee,
        taxPct,
        shippingCost,
        packagingCost,
        platformCost,
        adsCost,
        otherCost,
      });
      
      return {
        ...computed,
        suggestedPrice: result.suggestedPrice,
        isValid: true,
      };
    } else {
      // PRICE_TO_RESULT mode
      const computed = calculateFromPrice({
        salePrice,
        cogs,
        commissionPct,
        fixedFee,
        taxPct,
        shippingCost,
        packagingCost,
        platformCost,
        adsCost,
        otherCost,
      });
      
      return {
        ...computed,
        suggestedPrice: 0,
        isValid: true,
      };
    }
  }, [mode, targetType, targetValue, salePrice, cogs, commissionPct, fixedFee, taxPct, shippingCost, packagingCost, platformCost, adsCost, otherCost, extraCosts]);

  const effectivePrice = mode === 'TARGET_TO_PRICE' ? outputs.suggestedPrice : salePrice;

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const payload = {
        user_id: user.id,
        client_id: clientId || null,
        name: simulationName,
        sku: sku || null,
        listing_type: listingType,
        product_condition: productCondition,
        has_free_shipping: hasFreeShipping,
        mode,
        target_type: mode === 'TARGET_TO_PRICE' ? targetType : null,
        target_value: mode === 'TARGET_TO_PRICE' ? targetValue : null,
        sale_price: mode === 'PRICE_TO_RESULT' ? salePrice : outputs.suggestedPrice,
        cogs,
        commission_pct: commissionPct,
        fixed_fee: fixedFee,
        tax_pct: taxPct,
        shipping_cost: shippingCost,
        packaging_cost: packagingCost,
        platform_cost: platformCost,
        ads_cost: adsCost,
        other_cost: otherCost,
      };

      if (currentSimulationId) {
        const { error } = await supabase
          .from('ml_pricing_simulations')
          .update(payload)
          .eq('id', currentSimulationId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('ml_pricing_simulations')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setCurrentSimulationId(data.id);
      }
    },
    onSuccess: () => {
      toast.success("Simulação salva com sucesso.");
      queryClient.invalidateQueries({ queryKey: ['ml-simulations'] });
    },
    onError: (error) => {
      toast.error("Erro ao salvar simulação: " + error.message);
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from('ml_pricing_simulations')
        .insert({
          user_id: user.id,
          client_id: clientId || null,
          name: `${simulationName} (cópia)`,
          sku: sku || null,
          listing_type: listingType,
          product_condition: productCondition,
          has_free_shipping: hasFreeShipping,
          mode,
          target_type: mode === 'TARGET_TO_PRICE' ? targetType : null,
          target_value: mode === 'TARGET_TO_PRICE' ? targetValue : null,
          sale_price: mode === 'PRICE_TO_RESULT' ? salePrice : outputs.suggestedPrice,
          cogs,
          commission_pct: commissionPct,
          fixed_fee: fixedFee,
          tax_pct: taxPct,
          shipping_cost: shippingCost,
          packaging_cost: packagingCost,
          platform_cost: platformCost,
          ads_cost: adsCost,
          other_cost: otherCost,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setCurrentSimulationId(data.id);
      setSimulationName(`${simulationName} (cópia)`);
      toast.success("Simulação duplicada com sucesso.");
      queryClient.invalidateQueries({ queryKey: ['ml-simulations'] });
    },
    onError: (error) => {
      toast.error("Erro ao duplicar: " + error.message);
    },
  });

  // Load simulation
  const loadSimulation = async (id: string) => {
    const { data, error } = await supabase
      .from('ml_pricing_simulations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      toast.error("Erro ao carregar simulação");
      return;
    }

    setCurrentSimulationId(data.id);
    setSimulationName(data.name);
    setClientId(data.client_id || "");
    setSku(data.sku || "");
    setListingType(data.listing_type as ListingType);
    setProductCondition((data.product_condition as ProductCondition) || "NOVO");
    setHasFreeShipping(data.has_free_shipping);
    setMode(data.mode as CalculationMode);
    setTargetType((data.target_type as TargetType) || "MARGIN");
    setTargetValue(data.target_value || 0);
    setSalePrice(data.sale_price || 0);
    setCogs(data.cogs);
    setCommissionPct(data.commission_pct);
    setFixedFee(data.fixed_fee);
    setTaxPct(data.tax_pct);
    setShippingCost(data.shipping_cost);
    setPackagingCost(data.packaging_cost);
    setPlatformCost(data.platform_cost);
    setAdsCost(data.ads_cost);
    setOtherCost(data.other_cost);
    
    toast.success("Simulação carregada");
  };

  // CSV Export
  const exportCSV = () => {
    const headers = [
      'Nome', 'SKU', 'Tipo Anúncio', 'Modo', 'Preço Venda', 'Custo Produto',
      'Comissão %', 'Tarifa Fixa', 'Impostos %', 'Frete', 'Embalagem',
      'Plataforma', 'Ads', 'Outros', 'Taxa ML', 'Impostos R$', 'Custos Extras',
      'Líquido Recebido', 'Lucro', 'Margem %', 'Ponto Equilíbrio'
    ];
    
    const values = [
      simulationName,
      sku,
      listingType,
      mode,
      effectivePrice,
      cogs,
      commissionPct,
      fixedFee,
      taxPct,
      shippingCost,
      packagingCost,
      platformCost,
      adsCost,
      otherCost,
      outputs.mlFee,
      outputs.taxAmount,
      outputs.extraCosts,
      outputs.netReceipt,
      outputs.profit,
      outputs.marginPct,
      outputs.breakEvenPrice,
    ];
    
    const csvContent = headers.join(';') + '\n' + values.join(';');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `precificacao-ml-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    link.click();
    toast.success("CSV exportado com sucesso.");
  };

  // AI Summary
  const generateAISummary = () => {
    const warnings: string[] = [];
    if (outputs.profit < 0) warnings.push("⚠️ Lucro negativo! Você está vendendo no prejuízo.");
    if (outputs.marginPct < 10 && outputs.marginPct >= 0) warnings.push("⚠️ Margem abaixo de 10% — considere ajustar o preço.");
    if (commissionPct > 20) warnings.push("⚠️ Comissão alta. Verifique se está no tipo de anúncio correto.");
    
    const summary = `
📊 Resumo da Simulação: ${simulationName}

💰 Preço de Venda: ${formatBRL(effectivePrice)}
📦 Custo do Produto: ${formatBRL(cogs)}
📉 Taxa Mercado Livre: ${formatBRL(outputs.mlFee)} (${commissionPct}% + ${formatBRL(fixedFee)})
${hasFreeShipping ? `🚚 Frete (vendedor): ${formatBRL(shippingCost)}` : ''}
💵 Você Recebe (líquido): ${formatBRL(outputs.netReceipt)}
✅ Lucro Final: ${formatBRL(outputs.profit)}
📈 Margem: ${formatPercent(outputs.marginPct)}
⚖️ Ponto de Equilíbrio: ${formatBRL(outputs.breakEvenPrice)}

${warnings.length > 0 ? '\n' + warnings.join('\n') : '✅ Operação saudável!'}
    `.trim();
    
    navigator.clipboard.writeText(summary);
    toast.success("Resumo copiado para a área de transferência.");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/ferramentas')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Calculadora de Precificação — Mercado Livre</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Simule custos e descubra quanto você recebe por unidade e qual preço garante sua margem.
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={generateAISummary}>
              <Sparkles className="h-4 w-4 mr-2" />
              IA
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => duplicateMutation.mutate()} disabled={duplicateMutation.isPending}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicar
            </Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Parameters */}
          <div className="lg:col-span-5 space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Parâmetros</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Contexto */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Contexto</h4>
                  
                  <div className="space-y-2">
                    <Label>Cliente (opcional)</Label>
                    <Select value={clientId} onValueChange={setClientId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Nome da simulação</Label>
                    <Input value={simulationName} onChange={(e) => setSimulationName(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>SKU / Produto (opcional)</Label>
                    <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ex: SKU-12345" />
                  </div>
                </div>

                <Separator />

                {/* Anúncio */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Anúncio</h4>
                  
                  <div className="space-y-2">
                    <Label>Tipo de anúncio</Label>
                    <div className="flex rounded-lg border p-1 bg-muted/30">
                      <button
                        className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${listingType === 'CLASSICO' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                        onClick={() => setListingType('CLASSICO')}
                      >
                        Clássico
                      </button>
                      <button
                        className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${listingType === 'PREMIUM' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                        onClick={() => setListingType('PREMIUM')}
                      >
                        Premium
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Frete grátis</Label>
                    <div className="flex rounded-lg border p-1 bg-muted/30">
                      <button
                        className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${!hasFreeShipping ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                        onClick={() => setHasFreeShipping(false)}
                      >
                        Não
                      </button>
                      <button
                        className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${hasFreeShipping ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                        onClick={() => setHasFreeShipping(true)}
                      >
                        Sim
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Modo de cálculo</Label>
                    <div className="flex rounded-lg border p-1 bg-muted/30">
                      <button
                        className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${mode === 'PRICE_TO_RESULT' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                        onClick={() => setMode('PRICE_TO_RESULT')}
                      >
                        Preço → Resultado
                      </button>
                      <button
                        className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${mode === 'TARGET_TO_PRICE' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                        onClick={() => setMode('TARGET_TO_PRICE')}
                      >
                        Meta → Preço
                      </button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Preço / Meta */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    {mode === 'PRICE_TO_RESULT' ? 'Preço' : 'Meta'}
                  </h4>
                  
                  {mode === 'PRICE_TO_RESULT' ? (
                    <div className="space-y-2">
                      <Label>Preço de venda</Label>
                      <CurrencyInput value={salePrice} onChange={setSalePrice} />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Escolha a meta</Label>
                        <div className="flex rounded-lg border p-1 bg-muted/30">
                          <button
                            className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${targetType === 'MARGIN' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                            onClick={() => setTargetType('MARGIN')}
                          >
                            Margem %
                          </button>
                          <button
                            className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${targetType === 'PROFIT' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                            onClick={() => setTargetType('PROFIT')}
                          >
                            Lucro R$
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{targetType === 'MARGIN' ? 'Meta de margem (%)' : 'Meta de lucro (R$)'}</Label>
                        {targetType === 'MARGIN' ? (
                          <NumberInput value={targetValue} onChange={setTargetValue} suffix="%" />
                        ) : (
                          <CurrencyInput value={targetValue} onChange={setTargetValue} />
                        )}
                      </div>
                    </>
                  )}
                </div>

                <Separator />

                {/* Custos e Taxas */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Custos e Taxas</h4>
                  
                  <div className="space-y-2">
                    <Label>Custo do produto (COGS)</Label>
                    <CurrencyInput value={cogs} onChange={setCogs} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Comissão Mercado Livre (%)</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">A comissão varia por categoria e tipo de anúncio. Consulte seu painel do ML.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <NumberInput value={commissionPct} onChange={setCommissionPct} suffix="%" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Tarifa fixa (R$)</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Pode variar por faixa de preço e categoria. Verifique as regras atuais.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <CurrencyInput value={fixedFee} onChange={setFixedFee} />
                  </div>

                  <div className="space-y-2">
                    <Label>Impostos (%)</Label>
                    <NumberInput value={taxPct} onChange={setTaxPct} suffix="%" />
                  </div>

                  {hasFreeShipping && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label>Custo de envio (R$)</Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Informe o custo estimado do envio que será descontado do seu pagamento.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <CurrencyInput value={shippingCost} onChange={setShippingCost} />
                    </div>
                  )}
                </div>

                {/* Avançado */}
                <Accordion type="single" collapsible>
                  <AccordionItem value="advanced" className="border-none">
                    <AccordionTrigger className="text-sm text-muted-foreground hover:no-underline py-2">
                      Custos avançados (opcional)
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>Embalagem (R$)</Label>
                        <CurrencyInput value={packagingCost} onChange={setPackagingCost} />
                      </div>
                      <div className="space-y-2">
                        <Label>Taxa de plataforma/ERP (R$)</Label>
                        <CurrencyInput value={platformCost} onChange={setPlatformCost} />
                      </div>
                      <div className="space-y-2">
                        <Label>Ads / Impulsionamento (R$)</Label>
                        <CurrencyInput value={adsCost} onChange={setAdsCost} />
                      </div>
                      <div className="space-y-2">
                        <Label>Outros custos (R$)</Label>
                        <CurrencyInput value={otherCost} onChange={setOtherCost} />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <p className="text-xs text-muted-foreground">
                  As tarifas podem mudar. Use valores atualizados do seu anúncio/categoria.
                </p>
              </CardContent>
            </Card>

            {/* Recent Simulations */}
            {recentSimulations && recentSimulations.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Simulações recentes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentSimulations.map((sim) => (
                    <button
                      key={sim.id}
                      onClick={() => loadSimulation(sim.id)}
                      className="w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-between"
                    >
                      <span className="text-sm truncate">{sim.name}</span>
                      <Badge variant="secondary" className="text-xs">{sim.listing_type}</Badge>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - KPIs */}
          <div className="lg:col-span-7 space-y-4">
            {/* Error State */}
            {!outputs.isValid && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-destructive bg-destructive/5">
                  <CardContent className="flex items-center gap-3 py-4">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <p className="text-sm text-destructive">{outputs.errorMessage}</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Main KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-xs font-medium">Preço de venda</span>
                    </div>
                    <p className="text-xl font-bold">{formatBRL(effectivePrice)}</p>
                    {mode === 'TARGET_TO_PRICE' && outputs.isValid && (
                      <Badge variant="secondary" className="mt-1 text-xs">Sugerido</Badge>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-xs font-medium">Você recebe</span>
                    </div>
                    <p className="text-xl font-bold">{formatBRL(outputs.netReceipt)}</p>
                    <span className="text-xs text-muted-foreground">Após taxas e frete</span>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className={outputs.profit < 0 ? 'border-destructive' : outputs.profit > 0 ? 'border-green-500/30' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-xs font-medium">Lucro líquido</span>
                    </div>
                    <p className={`text-xl font-bold ${outputs.profit < 0 ? 'text-destructive' : outputs.profit > 0 ? 'text-green-600' : ''}`}>
                      {formatBRL(outputs.profit)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <Card className={outputs.marginPct < 0 ? 'border-destructive' : outputs.marginPct >= 20 ? 'border-green-500/30' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Percent className="h-4 w-4" />
                      <span className="text-xs font-medium">Margem líquida</span>
                    </div>
                    <p className={`text-xl font-bold ${outputs.marginPct < 0 ? 'text-destructive' : outputs.marginPct >= 20 ? 'text-green-600' : ''}`}>
                      {formatPercent(outputs.marginPct)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-muted/30">
                <CardContent className="py-3">
                  <span className="text-xs text-muted-foreground">Taxa ML</span>
                  <p className="font-semibold">{formatBRL(outputs.mlFee)}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="py-3">
                  <span className="text-xs text-muted-foreground">Frete (vendedor)</span>
                  <p className="font-semibold">{formatBRL(hasFreeShipping ? shippingCost : 0)}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="py-3">
                  <span className="text-xs text-muted-foreground">Impostos</span>
                  <p className="font-semibold">{formatBRL(outputs.taxAmount)}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="py-3">
                  <span className="text-xs text-muted-foreground">Custos extras</span>
                  <p className="font-semibold">{formatBRL(outputs.extraCosts)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Breakdown Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Detalhamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2">
                  <span>Receita bruta</span>
                  <span className="font-medium">{formatBRL(effectivePrice)}</span>
                </div>
                <Separator />
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-muted-foreground">(-) Comissão ML ({commissionPct}%)</span>
                  <span className="text-destructive">-{formatBRL(effectivePrice * (commissionPct / 100))}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-muted-foreground">(-) Tarifa fixa</span>
                  <span className="text-destructive">-{formatBRL(fixedFee)}</span>
                </div>
                {hasFreeShipping && shippingCost > 0 && (
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-muted-foreground">(-) Frete</span>
                    <span className="text-destructive">-{formatBRL(shippingCost)}</span>
                  </div>
                )}
                {outputs.taxAmount > 0 && (
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-muted-foreground">(-) Impostos</span>
                    <span className="text-destructive">-{formatBRL(outputs.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-muted-foreground">(-) Custo do produto</span>
                  <span className="text-destructive">-{formatBRL(cogs)}</span>
                </div>
                {outputs.extraCosts > 0 && (
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-muted-foreground">(-) Custos extras</span>
                    <span className="text-destructive">-{formatBRL(outputs.extraCosts)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between py-2">
                  <span className="font-semibold">= Resultado final (Lucro)</span>
                  <span className={`font-bold text-lg ${outputs.profit < 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {formatBRL(outputs.profit)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between py-2 bg-muted/30 rounded-lg px-3 -mx-3">
                  <span className="text-sm">Ponto de equilíbrio</span>
                  <span className="font-medium">{formatBRL(outputs.breakEvenPrice)}</span>
                </div>
                {mode === 'TARGET_TO_PRICE' && outputs.isValid && (
                  <div className="flex justify-between py-2 bg-primary/10 rounded-lg px-3 -mx-3">
                    <span className="text-sm font-medium text-primary">Preço sugerido</span>
                    <span className="font-bold text-primary">{formatBRL(outputs.suggestedPrice)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
