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
import { ArrowLeft, Save, Copy, Download, Sparkles, Info, AlertTriangle, TrendingUp, DollarSign, Percent, Package, Tag, Truck, Receipt, Calculator } from "lucide-react";
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
import {
  ML_CATEGORIES,
  TAX_PRESETS,
  SHIPPING_PRESETS,
  getFixedFee,
  getCommission,
  getFreeShippingRule,
  type FreeShippingStatus,
} from "@/lib/mlPricing/categories";

type ListingType = 'CLASSICO' | 'PREMIUM';
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
  
  // Category and listing type
  const [categoryId, setCategoryId] = useState("moda");
  const [listingType, setListingType] = useState<ListingType>("CLASSICO");
  // hasFreeShipping is now only relevant for products < R$ 19 (optional)
  const [offerFreeShippingOptional, setOfferFreeShippingOptional] = useState(false);
  const [mode, setMode] = useState<CalculationMode>("PRICE_TO_RESULT");
  const [targetType, setTargetType] = useState<TargetType>("MARGIN");
  
  // Prices and values
  const [salePrice, setSalePrice] = useState(0);
  const [targetValue, setTargetValue] = useState(20); // Default 20% margin
  const [cogs, setCogs] = useState(0);
  
  // Tax preset
  const [taxPresetId, setTaxPresetId] = useState("mei");
  const [customTaxPct, setCustomTaxPct] = useState(0);
  
  // Shipping preset
  const [shippingPresetId, setShippingPresetId] = useState("sem_frete");
  const [customShippingCost, setCustomShippingCost] = useState(0);
  
  // ACOS (Advertising Cost of Sale)
  const [acosPct, setAcosPct] = useState(0);
  
  // Advanced costs
  const [packagingCost, setPackagingCost] = useState(0);
  const [platformCost, setPlatformCost] = useState(0);
  const [otherCost, setOtherCost] = useState(0);

  const [currentSimulationId, setCurrentSimulationId] = useState<string | null>(null);

  // Computed values based on selections
  const commissionPct = useMemo(() => {
    return getCommission(categoryId, listingType);
  }, [categoryId, listingType]);

  const effectivePrice = mode === 'PRICE_TO_RESULT' ? salePrice : 0;

  const fixedFee = useMemo(() => {
    const price = mode === 'PRICE_TO_RESULT' ? salePrice : 100; // Use estimate for target mode
    return getFixedFee(price, categoryId);
  }, [mode, salePrice, categoryId]);

  const taxPct = useMemo(() => {
    const preset = TAX_PRESETS.find(p => p.id === taxPresetId);
    if (!preset || preset.rate === -1) return customTaxPct;
    return preset.rate;
  }, [taxPresetId, customTaxPct]);

  // Free shipping rule based on sale price (automatic from ML rules)
  const freeShippingRule = useMemo(() => {
    const price = mode === 'PRICE_TO_RESULT' ? salePrice : 100;
    return getFreeShippingRule(price);
  }, [mode, salePrice]);

  // Determine if seller pays shipping and the actual cost
  const sellerPaysShipping = useMemo(() => {
    // ML_PAYS: Seller doesn't pay (R$19-78.99)
    if (freeShippingRule.status === 'MANDATORY_ML_PAYS') return false;
    // MANDATORY: Seller always pays (>= R$79)
    if (freeShippingRule.status === 'MANDATORY_SELLER_PAYS') return true;
    // OPTIONAL: Only pays if user chose to offer free shipping
    return offerFreeShippingOptional;
  }, [freeShippingRule.status, offerFreeShippingOptional]);

  const shippingCost = useMemo(() => {
    if (!sellerPaysShipping) return 0;
    const preset = SHIPPING_PRESETS.find(p => p.id === shippingPresetId);
    if (!preset || preset.cost === -1) return customShippingCost;
    return preset.cost;
  }, [sellerPaysShipping, shippingPresetId, customShippingCost]);

  // Ads cost based on ACOS
  const adsCostFromAcos = useMemo(() => {
    if (acosPct <= 0) return 0;
    const price = mode === 'PRICE_TO_RESULT' ? salePrice : 100;
    return (price * acosPct) / 100;
  }, [acosPct, mode, salePrice]);

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
  const { data: recentSimulations } = useQuery({
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
  const extraCosts = packagingCost + platformCost + adsCostFromAcos + otherCost;

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
      
      // Now recalculate fixed fee with suggested price
      const actualFixedFee = getFixedFee(result.suggestedPrice, categoryId);
      
      // Now calculate all outputs using suggested price
      const computed = calculateFromPrice({
        salePrice: result.suggestedPrice,
        cogs,
        commissionPct,
        fixedFee: actualFixedFee,
        taxPct,
        shippingCost,
        packagingCost,
        platformCost,
        adsCost: adsCostFromAcos,
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
        adsCost: adsCostFromAcos,
        otherCost,
      });
      
      return {
        ...computed,
        suggestedPrice: 0,
        isValid: true,
      };
    }
  }, [mode, targetType, targetValue, salePrice, cogs, commissionPct, fixedFee, taxPct, shippingCost, packagingCost, platformCost, adsCostFromAcos, otherCost, extraCosts, categoryId]);

  const displayPrice = mode === 'TARGET_TO_PRICE' ? outputs.suggestedPrice : salePrice;

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
        product_condition: 'NOVO',
        has_free_shipping: sellerPaysShipping,
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
        ads_cost: adsCostFromAcos,
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
          product_condition: 'NOVO',
          has_free_shipping: sellerPaysShipping,
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
          ads_cost: adsCostFromAcos,
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
    setOfferFreeShippingOptional(data.has_free_shipping);
    setMode(data.mode as CalculationMode);
    setTargetType((data.target_type as TargetType) || "MARGIN");
    setTargetValue(data.target_value || 0);
    setSalePrice(data.sale_price || 0);
    setCogs(data.cogs);
    setPackagingCost(data.packaging_cost);
    setPlatformCost(data.platform_cost);
    setOtherCost(data.other_cost);
    
    // Set custom values for presets
    if (data.tax_pct > 0) {
      setTaxPresetId('personalizado');
      setCustomTaxPct(data.tax_pct);
    }
    if (data.shipping_cost > 0) {
      setShippingPresetId('personalizado');
      setCustomShippingCost(data.shipping_cost);
    }
    
    toast.success("Simulação carregada");
  };

  // CSV Export
  const exportCSV = () => {
    const headers = [
      'Nome', 'SKU', 'Categoria', 'Tipo Anúncio', 'Modo', 'Preço Venda', 'Custo Produto',
      'Comissão %', 'Tarifa Fixa', 'Impostos %', 'ACOS %', 'Frete', 'Embalagem',
      'Plataforma', 'Outros', 'Taxa ML', 'Impostos R$', 'Custos Extras',
      'Líquido Recebido', 'Lucro', 'Margem %', 'Ponto Equilíbrio'
    ];
    
    const categoryLabel = ML_CATEGORIES.find(c => c.id === categoryId)?.label || categoryId;
    
    const values = [
      simulationName,
      sku,
      categoryLabel,
      listingType,
      mode,
      displayPrice,
      cogs,
      commissionPct,
      fixedFee,
      taxPct,
      acosPct,
      shippingCost,
      packagingCost,
      platformCost,
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
    const categoryLabel = ML_CATEGORIES.find(c => c.id === categoryId)?.label || categoryId;
    const warnings: string[] = [];
    
    if (outputs.profit < 0) warnings.push("⚠️ Lucro negativo! Você está vendendo no prejuízo.");
    if (outputs.marginPct < 10 && outputs.marginPct >= 0) warnings.push("⚠️ Margem abaixo de 10% — considere ajustar o preço.");
    if (outputs.marginPct >= 10 && outputs.marginPct < 15) warnings.push("💡 Margem entre 10-15% — aceitável, mas pode melhorar.");
    if (acosPct > 15) warnings.push("⚠️ ACOS alto. Considere otimizar suas campanhas de Ads.");
    
    const summary = `
📊 Resumo da Simulação: ${simulationName}

📦 Categoria: ${categoryLabel}
🏷️ Tipo: Anúncio ${listingType === 'CLASSICO' ? 'Clássico' : 'Premium'}

💰 Preço de Venda: ${formatBRL(displayPrice)}
📦 Custo do Produto: ${formatBRL(cogs)}
📉 Taxa Mercado Livre: ${formatBRL(outputs.mlFee)} (${commissionPct}% + ${formatBRL(fixedFee)})
${sellerPaysShipping ? `🚚 Frete (vendedor): ${formatBRL(shippingCost)}` : freeShippingRule.status === 'MANDATORY_ML_PAYS' ? '🚚 Frete: pago pelo Mercado Livre' : ''}
${taxPct > 0 ? `🏛️ Impostos: ${formatBRL(outputs.taxAmount)} (${taxPct}%)` : ''}
${acosPct > 0 ? `📣 Ads (ACOS ${acosPct}%): ${formatBRL(adsCostFromAcos)}` : ''}

💵 Você Recebe (líquido): ${formatBRL(outputs.netReceipt)}
✅ Lucro Final: ${formatBRL(outputs.profit)}
📈 Margem: ${formatPercent(outputs.marginPct)}
⚖️ Ponto de Equilíbrio: ${formatBRL(outputs.breakEvenPrice)}

${warnings.length > 0 ? '\n' + warnings.join('\n') : '✅ Operação saudável!'}
    `.trim();
    
    navigator.clipboard.writeText(summary);
    toast.success("Resumo copiado para a área de transferência.");
  };

  // Get current category commission info
  const currentCategory = ML_CATEGORIES.find(c => c.id === categoryId);

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
                Selecione a categoria e veja automaticamente as taxas aplicadas.
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={generateAISummary}>
              <Sparkles className="h-4 w-4 mr-2" />
              Resumo
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
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Parâmetros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Categoria e Anúncio */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Categoria e Anúncio
                  </h4>
                  
                  <div className="space-y-2">
                    <Label>Categoria do produto</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {ML_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center justify-between w-full gap-4">
                              <span>{cat.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {cat.classico}% / {cat.premium}%
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {currentCategory && (
                      <p className="text-xs text-muted-foreground">
                        Comissão: Clássico {currentCategory.classico}% | Premium {currentCategory.premium}%
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de anúncio</Label>
                    <div className="flex rounded-lg border p-1 bg-muted/30">
                      <button
                        className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${listingType === 'CLASSICO' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                        onClick={() => setListingType('CLASSICO')}
                      >
                        <div className="text-center">
                          <div>Clássico</div>
                          <div className="text-xs text-muted-foreground">{currentCategory?.classico}%</div>
                        </div>
                      </button>
                      <button
                        className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${listingType === 'PREMIUM' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                        onClick={() => setListingType('PREMIUM')}
                      >
                        <div className="text-center">
                          <div>Premium</div>
                          <div className="text-xs text-muted-foreground">{currentCategory?.premium}%</div>
                        </div>
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {listingType === 'PREMIUM' ? '✨ Parcelamento em até 12x sem juros' : 'Sem parcelamento para o comprador'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Modo de cálculo */}
                <div className="space-y-4">
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

                {/* Preços */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Preços
                  </h4>

                  <div className="space-y-2">
                    <Label>Custo do produto (CMV)</Label>
                    <CurrencyInput value={cogs} onChange={setCogs} />
                    <p className="text-xs text-muted-foreground">Quanto você paga pelo produto</p>
                  </div>

                  {mode === 'PRICE_TO_RESULT' ? (
                    <div className="space-y-2">
                      <Label>Preço de venda desejado</Label>
                      <CurrencyInput value={salePrice} onChange={setSalePrice} />
                      {salePrice > 0 && salePrice < 79 && (
                        <p className="text-xs text-amber-600">
                          ⚠️ Taxa fixa de {formatBRL(fixedFee)} será aplicada (produto abaixo de R$ 79)
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Tipo de meta</Label>
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
                        <Label>{targetType === 'MARGIN' ? 'Meta de margem' : 'Meta de lucro'}</Label>
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

                {/* Impostos */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Impostos
                  </h4>

                  <div className="space-y-2">
                    <Label>Regime tributário</Label>
                    <Select value={taxPresetId} onValueChange={setTaxPresetId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TAX_PRESETS.map((preset) => (
                          <SelectItem key={preset.id} value={preset.id}>
                            <div className="flex items-center justify-between w-full gap-4">
                              <span>{preset.label}</span>
                              {preset.rate >= 0 && (
                                <span className="text-xs text-muted-foreground">{preset.rate}%</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {taxPresetId !== 'personalizado' && (
                      <p className="text-xs text-muted-foreground">
                        {TAX_PRESETS.find(p => p.id === taxPresetId)?.description}
                      </p>
                    )}
                  </div>

                  {taxPresetId === 'personalizado' && (
                    <div className="space-y-2">
                      <Label>Alíquota personalizada (%)</Label>
                      <NumberInput value={customTaxPct} onChange={setCustomTaxPct} suffix="%" />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Frete - Auto based on price */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Frete Grátis
                  </h4>

                  {/* Show automatic rule based on price */}
                  <div className={`p-3 rounded-lg border ${
                    freeShippingRule.status === 'MANDATORY_ML_PAYS' 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : freeShippingRule.status === 'MANDATORY_SELLER_PAYS'
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-muted/30 border-muted'
                  }`}>
                    <div className="flex items-start gap-2">
                      {freeShippingRule.status === 'MANDATORY_ML_PAYS' && (
                        <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-400">
                          ML paga o frete
                        </Badge>
                      )}
                      {freeShippingRule.status === 'MANDATORY_SELLER_PAYS' && (
                        <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-400">
                          Você paga o frete
                        </Badge>
                      )}
                      {freeShippingRule.status === 'OPTIONAL_SELLER_PAYS' && (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          Opcional
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {freeShippingRule.description}
                    </p>
                  </div>

                  {/* Optional toggle only for < R$ 19 */}
                  {freeShippingRule.status === 'OPTIONAL_SELLER_PAYS' && (
                    <div className="space-y-2">
                      <Label>Oferecer frete grátis?</Label>
                      <div className="flex rounded-lg border p-1 bg-muted/30">
                        <button
                          className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${!offerFreeShippingOptional ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                          onClick={() => setOfferFreeShippingOptional(false)}
                        >
                          Não
                        </button>
                        <button
                          className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${offerFreeShippingOptional ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}
                          onClick={() => setOfferFreeShippingOptional(true)}
                        >
                          Sim
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Shipping cost selector only when seller pays */}
                  {sellerPaysShipping && (
                    <>
                      <div className="space-y-2">
                        <Label>Custo de envio (por unidade)</Label>
                        <Select value={shippingPresetId} onValueChange={setShippingPresetId}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SHIPPING_PRESETS.map((preset) => (
                              <SelectItem key={preset.id} value={preset.id}>
                                <div className="flex items-center justify-between w-full gap-4">
                                  <span>{preset.label}</span>
                                  {preset.cost >= 0 && (
                                    <span className="text-xs text-muted-foreground">{formatBRL(preset.cost)}</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {SHIPPING_PRESETS.find(p => p.id === shippingPresetId)?.description}
                        </p>
                      </div>

                      {shippingPresetId === 'personalizado' && (
                        <div className="space-y-2">
                          <Label>Custo personalizado</Label>
                          <CurrencyInput value={customShippingCost} onChange={setCustomShippingCost} />
                        </div>
                      )}
                    </>
                  )}
                </div>

                <Separator />

                {/* Ads (ACOS) */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    📣 Mercado Livre Ads
                  </h4>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>ACOS (Custo de Ads sobre Vendas)</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">ACOS = Gasto com Ads ÷ Receita. Se você gasta R$ 10 em Ads para vender R$ 100, seu ACOS é 10%.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <NumberInput value={acosPct} onChange={setAcosPct} suffix="%" />
                    <p className="text-xs text-muted-foreground">
                      {acosPct > 0 
                        ? `Custo estimado: ${formatBRL(adsCostFromAcos)} por venda`
                        : 'Deixe em 0% se não investe em Ads'}
                    </p>
                  </div>
                </div>

                {/* Avançado */}
                <Accordion type="single" collapsible>
                  <AccordionItem value="advanced" className="border-none">
                    <AccordionTrigger className="text-sm text-muted-foreground hover:no-underline py-2">
                      Custos adicionais (opcional)
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
                        <Label>Outros custos (R$)</Label>
                        <CurrencyInput value={otherCost} onChange={setOtherCost} />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Contexto (collapsed) */}
                <Accordion type="single" collapsible>
                  <AccordionItem value="context" className="border-none">
                    <AccordionTrigger className="text-sm text-muted-foreground hover:no-underline py-2">
                      Identificação (opcional)
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>Cliente</Label>
                        <Select value={clientId || "__none__"} onValueChange={(val) => setClientId(val === "__none__" ? "" : val)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Nenhum</SelectItem>
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
                        <Label>SKU / Produto</Label>
                        <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ex: SKU-12345" />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
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

            {/* Commission Info Card */}
            <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
              <CardContent className="py-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Tag className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium">{currentCategory?.label}</p>
                      <p className="text-sm text-muted-foreground">
                        Comissão {listingType === 'CLASSICO' ? 'Clássico' : 'Premium'}: {commissionPct}%
                      </p>
                    </div>
                  </div>
                  {fixedFee > 0 && (
                    <Badge variant="outline" className="bg-background">
                      + {formatBRL(fixedFee)} taxa fixa
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Main KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-xs font-medium">Preço de venda</span>
                    </div>
                    <p className="text-xl font-bold">{formatBRL(displayPrice)}</p>
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
                  <span className="text-xs text-muted-foreground">Taxa ML Total</span>
                  <p className="font-semibold">{formatBRL(outputs.mlFee)}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="py-3">
                  <span className="text-xs text-muted-foreground">
                    {freeShippingRule.status === 'MANDATORY_ML_PAYS' ? 'Frete (ML paga)' : 'Frete (vendedor)'}
                  </span>
                  <p className="font-semibold">
                    {freeShippingRule.status === 'MANDATORY_ML_PAYS' 
                      ? 'R$ 0,00' 
                      : formatBRL(shippingCost)}
                  </p>
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
                  <span className="text-xs text-muted-foreground">Ads + Extras</span>
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
                  <span className="font-medium">{formatBRL(displayPrice)}</span>
                </div>
                <Separator />
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-muted-foreground">(-) Comissão ML ({commissionPct}%)</span>
                  <span className="text-destructive">-{formatBRL(displayPrice * (commissionPct / 100))}</span>
                </div>
                {fixedFee > 0 && (
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-muted-foreground">(-) Tarifa fixa</span>
                    <span className="text-destructive">-{formatBRL(fixedFee)}</span>
                  </div>
                )}
                {shippingCost > 0 && (
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-muted-foreground">(-) Frete</span>
                    <span className="text-destructive">-{formatBRL(shippingCost)}</span>
                  </div>
                )}
                {outputs.taxAmount > 0 && (
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-muted-foreground">(-) Impostos ({taxPct}%)</span>
                    <span className="text-destructive">-{formatBRL(outputs.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-muted-foreground">(-) Custo do produto</span>
                  <span className="text-destructive">-{formatBRL(cogs)}</span>
                </div>
                {adsCostFromAcos > 0 && (
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-muted-foreground">(-) Ads (ACOS {acosPct}%)</span>
                    <span className="text-destructive">-{formatBRL(adsCostFromAcos)}</span>
                  </div>
                )}
                {(packagingCost + platformCost + otherCost) > 0 && (
                  <div className="flex justify-between py-1 text-sm">
                    <span className="text-muted-foreground">(-) Outros custos</span>
                    <span className="text-destructive">-{formatBRL(packagingCost + platformCost + otherCost)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between py-2">
                  <span className="font-semibold">= Resultado (Lucro)</span>
                  <span className={`font-bold text-lg ${outputs.profit < 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {formatBRL(outputs.profit)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-muted-foreground">Ponto de equilíbrio</span>
                  <span className="font-medium">{formatBRL(outputs.breakEvenPrice)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card className="bg-muted/20">
              <CardContent className="py-4">
                <h4 className="font-medium text-sm mb-2">💡 Dicas</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Produtos acima de R$ 79 não pagam taxa fixa adicional</li>
                  <li>• MercadoLíderes têm desconto de até 70% no frete grátis</li>
                  <li>• Anúncio Premium oferece parcelamento sem juros, aumentando conversão</li>
                  <li>• Considere criar kits para diluir custos em produtos de baixo ticket</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
