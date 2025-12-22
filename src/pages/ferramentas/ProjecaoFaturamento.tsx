import { useState, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { CurrencyInput } from "@/components/ui/currency-input";
import { NumberInput } from "@/components/ui/number-input";
import { 
  Calculator, 
  HelpCircle, 
  Save, 
  Copy, 
  Trash2, 
  Eye,
  ArrowLeft,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Target,
  Percent,
  Lightbulb
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  calculateProjection,
  generateInsights,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatInteger,
  getChannelLabels,
  BENCHMARKS,
  type Channel,
  type Mode,
  type ProjectionInputs,
  type ProjectionOutputs,
} from "@/lib/projections/calc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Types
interface Projection {
  id: string;
  client_id: string | null;
  channel: Channel;
  mode: Mode;
  period_label: string | null;
  inputs: ProjectionInputs;
  outputs: ProjectionOutputs;
  created_at: string;
}

// Tooltip helper component
function TooltipHelper({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm">{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// KPI Card component
interface KPICardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'green' | 'blue' | 'purple' | 'orange' | 'red';
  secondary?: boolean;
}

function KPICard({ title, value, icon: Icon, color, secondary }: KPICardProps) {
  const colorClasses = {
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    red: 'bg-red-500/10 text-red-600 dark:text-red-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={secondary ? 'opacity-80' : ''}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{title}</p>
              <p className="text-lg font-bold">{value}</p>
            </div>
            <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
              <Icon className="h-4 w-4" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ProjecaoFaturamento() {
  usePageMeta({
    title: "Projeção de Faturamento | HUB Vivaz",
    description: "Calculadora de projeção de faturamento para E-commerce e WhatsApp.",
  });

  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [channel, setChannel] = useState<Channel>('ecommerce');
  const [mode, setMode] = useState<Mode>('target_to_budget');
  const [clientName, setClientName] = useState('');
  
  // Form inputs - raw data for calculations
  const [visitantes, setVisitantes] = useState<number>(10000);
  const [pedidos, setPedidos] = useState<number>(120);
  const [faturamento, setFaturamento] = useState<number>(51600);
  const [investimento, setInvestimento] = useState<number>(3500);
  
  // Mode-specific
  const [metaReceitaFaturada, setMetaReceitaFaturada] = useState<number>(100000);
  const [investimentoMeta, setInvestimentoMeta] = useState<number>(10000);
  
  // Manual overrides
  const [aprovacao, setAprovacao] = useState<number>(90);

  // Derived values - automatically calculated
  const derivedValues = useMemo(() => {
    const safeVisitantes = visitantes || 1;
    const safePedidos = pedidos || 1;
    const safeFaturamento = faturamento || 1;
    const safeInvestimento = investimento || 1;

    // Taxa de conversão = pedidos / visitantes
    const taxaConversao = (pedidos / safeVisitantes) * 100;
    
    // Ticket médio = faturamento / pedidos
    const ticketMedio = faturamento / safePedidos;
    
    // CPS = investimento / visitantes
    const cps = investimento / safeVisitantes;

    return {
      taxaConversao: isFinite(taxaConversao) ? taxaConversao : 0,
      ticketMedio: isFinite(ticketMedio) ? ticketMedio : 0,
      cps: isFinite(cps) ? cps : 0,
    };
  }, [visitantes, pedidos, faturamento, investimento]);

  // Fetch clients for select
  const { data: clients } = useQuery({
    queryKey: ['clients-for-projection'],
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

  // Fetch recent projections
  const { data: projections, isLoading: loadingProjections } = useQuery({
    queryKey: ['projections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projections')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        channel: item.channel as Channel,
        mode: item.mode as Mode,
        inputs: item.inputs as unknown as ProjectionInputs,
        outputs: item.outputs as unknown as ProjectionOutputs,
      })) as Projection[];
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Não autenticado');

      const inputsData: ProjectionInputs = {
        ticketMedio: derivedValues.ticketMedio,
        aprovacao: aprovacao / 100,
        taxaConversao: derivedValues.taxaConversao / 100,
        custoUnitario: derivedValues.cps,
        ...(mode === 'target_to_budget' ? { metaReceitaFaturada } : { investimento: investimentoMeta }),
      };

      const outputsData = calculateProjection(inputsData, mode);

      const { error } = await supabase.from('projections').insert([{
        channel,
        mode,
        period_label: null,
        inputs: inputsData as unknown as Json,
        outputs: outputsData as unknown as Json,
        created_by: user.user.id,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projections'] });
      toast({
        title: 'Projeção salva',
        description: 'A projeção foi salva com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projections').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projections'] });
      toast({
        title: 'Projeção excluída',
        description: 'A projeção foi removida.',
      });
    },
  });

  // Load saved projection
  const loadProjection = (projection: Projection) => {
    setChannel(projection.channel);
    setMode(projection.mode);
    setAprovacao(projection.inputs.aprovacao * 100);
    
    // Recalculate base values from saved data
    const ticketMedio = projection.inputs.ticketMedio;
    const taxaConversao = projection.inputs.taxaConversao;
    const cps = projection.inputs.custoUnitario;
    
    // Set derived values backwards
    // If we have metaReceitaFaturada, calculate visitantes from it
    if (projection.inputs.metaReceitaFaturada) {
      setMetaReceitaFaturada(projection.inputs.metaReceitaFaturada);
    }
    if (projection.inputs.investimento) {
      setInvestimentoMeta(projection.inputs.investimento);
    }
    
    toast({
      title: 'Projeção carregada',
      description: 'Os valores foram restaurados.',
    });
  };

  // Calculate outputs
  const outputs = useMemo(() => {
    const inputs: ProjectionInputs = {
      ticketMedio: derivedValues.ticketMedio,
      aprovacao: aprovacao / 100,
      taxaConversao: derivedValues.taxaConversao / 100,
      custoUnitario: derivedValues.cps,
      ...(mode === 'target_to_budget' ? { metaReceitaFaturada } : { investimento: investimentoMeta }),
    };
    return calculateProjection(inputs, mode);
  }, [derivedValues, aprovacao, metaReceitaFaturada, investimentoMeta, mode]);

  const insights = useMemo(() => generateInsights(outputs, channel, derivedValues.ticketMedio), [outputs, channel, derivedValues.ticketMedio]);
  const labels = getChannelLabels(channel);

  // Update defaults when channel changes
  useEffect(() => {
    const benchmark = BENCHMARKS[channel];
    if (channel === 'ecommerce') {
      setVisitantes(10000);
      setPedidos(120);
      setFaturamento(51600);
      setInvestimento(3500);
    } else {
      setVisitantes(1000);
      setPedidos(40);
      setFaturamento(17200);
      setInvestimento(2500);
    }
    setAprovacao(benchmark.aprovacao * 100);
  }, [channel]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/ferramentas')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Projeção de Faturamento</h1>
            <p className="text-muted-foreground mt-1">
              Calcule projeções de receita e investimento para E-commerce e WhatsApp.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Inputs */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Parâmetros</CardTitle>
              </div>
              <CardDescription>
                Informe os dados do período para calcular taxa de conversão, ticket médio e CPS automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Channel Tabs */}
              <div className="space-y-2">
                <Label>Canal</Label>
                <Tabs value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="ecommerce">E-commerce</TabsTrigger>
                    <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Mode Tabs */}
              <div className="space-y-2">
                <Label>Modo de cálculo</Label>
                <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="target_to_budget" className="text-xs sm:text-sm">
                      Meta → Orçamento
                    </TabsTrigger>
                    <TabsTrigger value="budget_to_projection" className="text-xs sm:text-sm">
                      Orçamento → Projeção
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <Separator />

              {/* Historical Data Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm">Dados do Período Referência</h3>
                  <TooltipHelper text="Informe os dados reais de um período passado. O sistema calculará automaticamente a taxa de conversão, ticket médio e CPS." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="visitantes">{labels.volumeLabel}</Label>
                      <TooltipHelper text={`Número de ${labels.volumeLabel.toLowerCase()} no período`} />
                    </div>
                    <NumberInput
                      id="visitantes"
                      value={visitantes}
                      onChange={setVisitantes}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="pedidos">Pedidos</Label>
                      <TooltipHelper text="Número de pedidos realizados no período" />
                    </div>
                    <NumberInput
                      id="pedidos"
                      value={pedidos}
                      onChange={setPedidos}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="faturamento">Faturamento</Label>
                      <TooltipHelper text="Receita total faturada no período" />
                    </div>
                    <CurrencyInput
                      id="faturamento"
                      value={faturamento}
                      onChange={setFaturamento}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="investimento">Investimento</Label>
                      <TooltipHelper text="Valor investido em mídia no período" />
                    </div>
                    <CurrencyInput
                      id="investimento"
                      value={investimento}
                      onChange={setInvestimento}
                    />
                  </div>
                </div>

                {/* Derived Values Display */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Métricas Calculadas</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Taxa de Conversão</span>
                      <p className="text-sm font-semibold">{formatNumber(derivedValues.taxaConversao, 2)}%</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Ticket Médio</span>
                      <p className="text-sm font-semibold">{formatCurrency(derivedValues.ticketMedio)}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">{channel === 'ecommerce' ? 'CPS' : 'CPCv'}</span>
                      <p className="text-sm font-semibold">{formatCurrency(derivedValues.cps)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Approval Rate */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="aprovacao">% Aprovação de Pagamento</Label>
                  <TooltipHelper text="Taxa de aprovação de pagamento (pedidos faturados / pedidos captados)" />
                </div>
                <NumberInput
                  id="aprovacao"
                  value={aprovacao}
                  onChange={setAprovacao}
                  suffix="%"
                  allowDecimals
                  decimalPlaces={1}
                />
              </div>

              <Separator />

              {/* Mode-specific input */}
              {mode === 'target_to_budget' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="meta">Meta de Faturamento</Label>
                    <TooltipHelper text="Receita faturada desejada no período" />
                  </div>
                  <CurrencyInput
                    id="meta"
                    value={metaReceitaFaturada}
                    onChange={setMetaReceitaFaturada}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="investimentoMeta">Investimento em Mídia</Label>
                    <TooltipHelper text="Verba total disponível para investimento em mídia" />
                  </div>
                  <CurrencyInput
                    id="investimentoMeta"
                    value={investimentoMeta}
                    onChange={setInvestimentoMeta}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={() => saveMutation.mutate()} 
                  disabled={saveMutation.isPending}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar projeção
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Right: Results */}
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              <KPICard
                title="Receita Faturada"
                value={formatCurrency(outputs.receitaFaturada)}
                icon={DollarSign}
                color="green"
              />
              <KPICard
                title="Receita Captada"
                value={formatCurrency(outputs.receitaCaptada)}
                icon={TrendingUp}
                color="blue"
              />
              <KPICard
                title="Pedidos Faturados"
                value={formatInteger(outputs.pedidosFaturados)}
                icon={ShoppingCart}
                color="purple"
              />
              <KPICard
                title="Pedidos Captados"
                value={formatInteger(outputs.pedidosCaptados)}
                icon={ShoppingCart}
                color="purple"
                secondary
              />
              <KPICard
                title={labels.volumeLabel}
                value={formatInteger(outputs.volumeTopoFunil)}
                icon={Users}
                color="orange"
              />
              <KPICard
                title="Investimento"
                value={formatCurrency(outputs.investimento)}
                icon={Target}
                color="red"
              />
            </div>

            {/* Secondary KPIs */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  KPIs Derivados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-muted-foreground">ROAS Pago</span>
                    <p className="font-semibold">{formatNumber(outputs.roasPago)}x</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">ROAS Captado</span>
                    <p className="font-semibold">{formatNumber(outputs.roasCaptado)}x</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">CPA Pago</span>
                    <p className="font-semibold">{formatCurrency(outputs.cpaPago)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">CPA Captado</span>
                    <p className="font-semibold">{formatCurrency(outputs.cpaCaptado)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">% Mídia (Pago)</span>
                    <p className="font-semibold">{formatPercent(outputs.percentMidiaPago)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">% Mídia (Captado)</span>
                    <p className="font-semibold">{formatPercent(outputs.percentMidiaCaptado)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Insights */}
            {insights.length > 0 && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {insights.map((insight, index) => (
                    <p key={index} className="text-sm text-muted-foreground">
                      {insight}
                    </p>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Recent Projections */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Projeções Recentes</CardTitle>
            <CardDescription>
              Histórico das últimas projeções salvas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingProjections ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : !projections?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma projeção salva ainda.
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {projections.map((projection) => (
                    <motion.div
                      key={projection.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={projection.channel === 'ecommerce' ? 'default' : 'secondary'}>
                          {projection.channel === 'ecommerce' ? 'E-commerce' : 'WhatsApp'}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium">
                            {projection.mode === 'target_to_budget' 
                              ? `Meta: ${formatCurrency(projection.inputs.metaReceitaFaturada || 0)}`
                              : `Investimento: ${formatCurrency(projection.inputs.investimento || 0)}`
                            }
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(projection.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => loadProjection(projection)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => {
                            loadProjection(projection);
                            toast({
                              title: 'Projeção duplicada',
                              description: 'Edite e salve como nova.',
                            });
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(projection.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
