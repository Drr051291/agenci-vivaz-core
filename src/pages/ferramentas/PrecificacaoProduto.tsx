import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/ui/currency-input";
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Package, 
  Truck,
  Target,
  PieChart,
  Info,
  ArrowRight
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Presets de tributação
const TAX_PRESETS = [
  { id: 'mei', name: 'MEI', rate: 0 },
  { id: 'simples_1', name: 'Simples Nacional - Faixa 1', rate: 4 },
  { id: 'simples_2', name: 'Simples Nacional - Faixa 2', rate: 7.3 },
  { id: 'simples_3', name: 'Simples Nacional - Faixa 3', rate: 9.5 },
  { id: 'simples_4', name: 'Simples Nacional - Faixa 4', rate: 10.7 },
  { id: 'simples_5', name: 'Simples Nacional - Faixa 5', rate: 14.3 },
  { id: 'simples_6', name: 'Simples Nacional - Faixa 6', rate: 19 },
  { id: 'lucro_presumido', name: 'Lucro Presumido', rate: 11.33 },
  { id: 'lucro_real', name: 'Lucro Real', rate: 15 },
  { id: 'custom', name: 'Personalizado', rate: 0 },
];

// Tooltip helper component
function TooltipHelper({ content }: { content: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// KPI Card component
function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  variant = 'default',
  tooltip
}: { 
  title: string; 
  value: string; 
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  tooltip?: string;
}) {
  const variants = {
    default: 'border-border',
    success: 'border-green-500/50 bg-green-500/5',
    warning: 'border-yellow-500/50 bg-yellow-500/5',
    danger: 'border-red-500/50 bg-red-500/5',
  };

  const iconVariants = {
    default: 'text-primary',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500',
  };

  return (
    <Card className={`${variants[variant]} transition-all`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{title}</p>
              {tooltip && <TooltipHelper content={tooltip} />}
            </div>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`p-2 rounded-lg bg-primary/10 ${iconVariants[variant]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Cost breakdown item
function CostItem({ 
  label, 
  value, 
  percentage 
}: { 
  label: string; 
  value: number; 
  percentage: number;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <Badge variant="outline" className="text-xs min-w-[50px] justify-center">
          {percentage.toFixed(1)}%
        </Badge>
      </div>
    </div>
  );
}

export default function PrecificacaoProduto() {
  usePageMeta({
    title: "Calculadora de Precificação - Ferramentas",
    description: "Calcule margens e custos de seus produtos"
  });

  // Estados dos inputs
  const [productName, setProductName] = useState('');
  const [costPrice, setCostPrice] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [taxPreset, setTaxPreset] = useState('simples_2');
  const [customTaxRate, setCustomTaxRate] = useState(8);
  const [includeShipping, setIncludeShipping] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [commissionRate, setCommissionRate] = useState(0);
  const [adsPercentage, setAdsPercentage] = useState([0]); // Slider value
  const [paymentFeeRate, setPaymentFeeRate] = useState(3.99); // Taxa de cartão/gateway
  const [otherCosts, setOtherCosts] = useState(0);

  // Calcula a taxa de imposto baseada no preset
  const taxRate = useMemo(() => {
    if (taxPreset === 'custom') {
      return customTaxRate;
    }
    return TAX_PRESETS.find(t => t.id === taxPreset)?.rate || 0;
  }, [taxPreset, customTaxRate]);

  // Cálculos
  const calculations = useMemo(() => {
    if (salePrice <= 0) {
      return {
        taxAmount: 0,
        commissionAmount: 0,
        shippingAmount: 0,
        adsAmount: 0,
        paymentFee: 0,
        totalCosts: 0,
        contributionMargin: 0,
        contributionMarginPercent: 0,
        breakEvenPrice: 0,
        markup: 0,
      };
    }

    // Custos em R$
    const taxAmount = (salePrice * taxRate) / 100;
    const commissionAmount = (salePrice * commissionRate) / 100;
    const shippingAmount = includeShipping ? shippingCost : 0;
    const adsAmount = (salePrice * adsPercentage[0]) / 100;
    const paymentFee = (salePrice * paymentFeeRate) / 100;
    
    // Total de custos variáveis
    const totalVariableCosts = taxAmount + commissionAmount + shippingAmount + adsAmount + paymentFee + otherCosts;
    
    // Total de custos (CMV + custos variáveis)
    const totalCosts = costPrice + totalVariableCosts;
    
    // Margem de contribuição
    const contributionMargin = salePrice - totalCosts;
    const contributionMarginPercent = salePrice > 0 ? (contributionMargin / salePrice) * 100 : 0;
    
    // Preço de equilíbrio (para ter margem 0)
    const variableCostPercent = (taxRate + commissionRate + adsPercentage[0] + paymentFeeRate) / 100;
    const breakEvenPrice = variableCostPercent < 1 
      ? (costPrice + shippingAmount + otherCosts) / (1 - variableCostPercent)
      : 0;
    
    // Markup
    const markup = costPrice > 0 ? ((salePrice - costPrice) / costPrice) * 100 : 0;

    return {
      taxAmount,
      commissionAmount,
      shippingAmount,
      adsAmount,
      paymentFee,
      totalCosts,
      contributionMargin,
      contributionMarginPercent,
      breakEvenPrice,
      markup,
    };
  }, [salePrice, costPrice, taxRate, commissionRate, includeShipping, shippingCost, adsPercentage, paymentFeeRate, otherCosts]);

  // Determina a variante do KPI baseado na margem
  const marginVariant = useMemo(() => {
    if (calculations.contributionMarginPercent >= 30) return 'success';
    if (calculations.contributionMarginPercent >= 15) return 'warning';
    return 'danger';
  }, [calculations.contributionMarginPercent]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calculator className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Calculadora de Precificação</h1>
              <p className="text-muted-foreground">
                Calcule a margem de contribuição dos seus produtos
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inputs */}
          <div className="space-y-6">
            {/* Dados do Produto */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Dados do Produto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="productName">Nome do Produto (opcional)</Label>
                  <Input
                    id="productName"
                    placeholder="Ex: Camiseta Básica"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="costPrice">Custo do Produto</Label>
                    <CurrencyInput
                      id="costPrice"
                      value={costPrice}
                      onChange={setCostPrice}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salePrice">Preço de Venda</Label>
                    <CurrencyInput
                      id="salePrice"
                      value={salePrice}
                      onChange={setSalePrice}
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tributação */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Tributação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Regime Tributário</Label>
                  <Select value={taxPreset} onValueChange={setTaxPreset}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o regime" />
                    </SelectTrigger>
                    <SelectContent>
                      {TAX_PRESETS.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.name} {preset.rate > 0 && `(${preset.rate}%)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {taxPreset === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="customTax">Alíquota Personalizada (%)</Label>
                    <Input
                      id="customTax"
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={customTaxRate}
                      onChange={(e) => setCustomTaxRate(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                )}

                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Alíquota aplicada</span>
                    <Badge variant="secondary" className="text-base font-semibold">
                      {taxRate.toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Custos Adicionais */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Custos Adicionais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Frete */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="includeShipping" className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Incluir Frete
                    </Label>
                    <Switch
                      id="includeShipping"
                      checked={includeShipping}
                      onCheckedChange={setIncludeShipping}
                    />
                  </div>
                  {includeShipping && (
                    <div className="space-y-2 pl-6">
                      <Label htmlFor="shippingCost">Custo do Frete</Label>
                      <CurrencyInput
                        id="shippingCost"
                        value={shippingCost}
                        onChange={setShippingCost}
                        placeholder="0,00"
                      />
                    </div>
                  )}
                </div>

                {/* Taxa de Cartão/Gateway */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="paymentFee">Taxa Cartão/Gateway (%)</Label>
                    <TooltipHelper content="Taxa cobrada pelo gateway de pagamento ou maquininha de cartão" />
                  </div>
                  <Input
                    id="paymentFee"
                    type="number"
                    min={0}
                    max={20}
                    step={0.01}
                    value={paymentFeeRate}
                    onChange={(e) => setPaymentFeeRate(parseFloat(e.target.value) || 0)}
                  />
                </div>

                {/* Comissão */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="commission">Comissão Vendedor (%)</Label>
                    <TooltipHelper content="Comissão paga ao vendedor ou afiliado" />
                  </div>
                  <Input
                    id="commission"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                  />
                </div>

                {/* Outros Custos */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="otherCosts">Outros Custos (R$)</Label>
                    <TooltipHelper content="Embalagem, etiquetas, materiais extras, etc." />
                  </div>
                  <CurrencyInput
                    id="otherCosts"
                    value={otherCosts}
                    onChange={setOtherCosts}
                    placeholder="0,00"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Investimento em ADS */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Investimento em ADS (CAC)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Percentual do Preço de Venda</Label>
                    <Badge 
                      variant={adsPercentage[0] > 30 ? "destructive" : adsPercentage[0] > 15 ? "secondary" : "default"}
                      className="text-base font-semibold min-w-[60px] justify-center"
                    >
                      {adsPercentage[0]}%
                    </Badge>
                  </div>
                  <Slider
                    value={adsPercentage}
                    onValueChange={setAdsPercentage}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>

                {salePrice > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Custo de ADS por venda</span>
                      <span className="font-semibold">
                        R$ {calculations.adsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  O CAC (Custo de Aquisição de Cliente) representa quanto você gasta em marketing para cada venda realizada.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Resultados */}
          <div className="space-y-6">
            {/* KPIs Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KPICard
                title="Margem de Contribuição"
                value={`R$ ${calculations.contributionMargin.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subtitle={`${calculations.contributionMarginPercent.toFixed(2)}% do preço de venda`}
                icon={TrendingUp}
                variant={marginVariant}
                tooltip="Valor líquido que sobra por venda. Contribui para cobrir custos fixos."
              />
              <KPICard
                title="Preço de Equilíbrio"
                value={`R$ ${calculations.breakEvenPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subtitle="Preço mínimo sem prejuízo"
                icon={Target}
                tooltip="Preço mínimo para não ter prejuízo (margem = 0)"
              />
              <KPICard
                title="Custo Total"
                value={`R$ ${calculations.totalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subtitle={`${salePrice > 0 ? ((calculations.totalCosts / salePrice) * 100).toFixed(2) : 0}% do preço de venda`}
                icon={DollarSign}
              />
              <KPICard
                title="Markup"
                value={`${calculations.markup.toFixed(2)}%`}
                subtitle="Margem sobre o custo"
                icon={PieChart}
                tooltip="Percentual de acréscimo sobre o custo do produto"
              />
            </div>

            {/* Detalhamento de Custos */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Detalhamento de Custos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <CostItem
                    label="Custo do Produto (CMV)"
                    value={costPrice}
                    percentage={salePrice > 0 ? (costPrice / salePrice) * 100 : 0}
                  />
                  <CostItem
                    label="Impostos"
                    value={calculations.taxAmount}
                    percentage={taxRate}
                  />
                  <CostItem
                    label="Taxa Cartão/Gateway"
                    value={calculations.paymentFee}
                    percentage={paymentFeeRate}
                  />
                  {commissionRate > 0 && (
                    <CostItem
                      label="Comissão"
                      value={calculations.commissionAmount}
                      percentage={commissionRate}
                    />
                  )}
                  {includeShipping && (
                    <CostItem
                      label="Frete"
                      value={calculations.shippingAmount}
                      percentage={salePrice > 0 ? (calculations.shippingAmount / salePrice) * 100 : 0}
                    />
                  )}
                  {adsPercentage[0] > 0 && (
                    <CostItem
                      label="Investimento ADS"
                      value={calculations.adsAmount}
                      percentage={adsPercentage[0]}
                    />
                  )}
                  {otherCosts > 0 && (
                    <CostItem
                      label="Outros Custos"
                      value={otherCosts}
                      percentage={salePrice > 0 ? (otherCosts / salePrice) * 100 : 0}
                    />
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total de Custos</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg">
                        R$ {calculations.totalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <Badge variant="outline" className="min-w-[60px] justify-center">
                        {salePrice > 0 ? ((calculations.totalCosts / salePrice) * 100).toFixed(1) : 0}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resumo Visual */}
            <Card className={`border-2 ${
              marginVariant === 'success' ? 'border-green-500/50' :
              marginVariant === 'warning' ? 'border-yellow-500/50' :
              'border-red-500/50'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Resumo da Operação</p>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Preço de Venda</p>
                        <p className="text-xl font-bold">
                          R$ {salePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Margem Líquida</p>
                        <p className={`text-xl font-bold ${
                          marginVariant === 'success' ? 'text-green-500' :
                          marginVariant === 'warning' ? 'text-yellow-500' :
                          'text-red-500'
                        }`}>
                          R$ {calculations.contributionMargin.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className={`text-right p-4 rounded-lg ${
                    marginVariant === 'success' ? 'bg-green-500/10' :
                    marginVariant === 'warning' ? 'bg-yellow-500/10' :
                    'bg-red-500/10'
                  }`}>
                    <p className="text-xs text-muted-foreground">Margem %</p>
                    <p className={`text-3xl font-bold ${
                      marginVariant === 'success' ? 'text-green-500' :
                      marginVariant === 'warning' ? 'text-yellow-500' :
                      'text-red-500'
                    }`}>
                      {calculations.contributionMarginPercent.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {marginVariant === 'success' && "✅ Margem saudável! Você tem uma boa margem para cobrir custos fixos e gerar lucro."}
                    {marginVariant === 'warning' && "⚠️ Margem moderada. Considere revisar seus custos ou aumentar o preço de venda."}
                    {marginVariant === 'danger' && "❌ Margem baixa ou negativa. Revise urgentemente sua precificação."}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Info Box */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Sobre a Margem de Contribuição</p>
                  <p className="text-xs text-muted-foreground">
                    A margem de contribuição é o valor líquido que sobra por venda após deduzir todos os custos variáveis. 
                    Essa margem não é o seu lucro final — ela contribui para cobrir os custos fixos do negócio (aluguel, salários, etc.). 
                    O que sobrar após cobrir os custos fixos é o seu EBITDA.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
