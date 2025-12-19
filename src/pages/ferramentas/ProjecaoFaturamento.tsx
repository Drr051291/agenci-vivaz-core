import { useState, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
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
  Lightbulb,
  RotateCcw
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
  const [periodLabel, setPeriodLabel] = useState('');
  
  // Form inputs
  const [ticketMedio, setTicketMedio] = useState<number>(430);
  const [aprovacao, setAprovacao] = useState<number>(90); // Display as percentage
  const [taxaConversao, setTaxaConversao] = useState<number>(1.2); // Display as percentage
  const [custoUnitario, setCustoUnitario] = useState<number>(0.35);
  const [metaReceitaFaturada, setMetaReceitaFaturada] = useState<number>(100000);
  const [investimento, setInvestimento] = useState<number>(10000);

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
        ticketMedio,
        aprovacao: aprovacao / 100,
        taxaConversao: taxaConversao / 100,
        custoUnitario,
        ...(mode === 'target_to_budget' ? { metaReceitaFaturada } : { investimento }),
      };

      const outputsData = calculateProjection(inputsData, mode);

      const { error } = await supabase.from('projections').insert([{
        channel,
        mode,
        period_label: periodLabel || null,
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

  // Load benchmark
  const loadBenchmark = () => {
    const benchmark = BENCHMARKS[channel];
    setTicketMedio(benchmark.ticketMedio);
    setAprovacao(benchmark.aprovacao * 100);
    setTaxaConversao(benchmark.taxaConversao * 100);
    setCustoUnitario(benchmark.custoUnitario);
    toast({
      title: 'Benchmark carregado',
      description: 'Os valores de benchmark foram aplicados. Ajuste conforme o histórico do cliente.',
    });
  };

  // Load saved projection
  const loadProjection = (projection: Projection) => {
    setChannel(projection.channel);
    setMode(projection.mode);
    setPeriodLabel(projection.period_label || '');
    setTicketMedio(projection.inputs.ticketMedio);
    setAprovacao(projection.inputs.aprovacao * 100);
    setTaxaConversao(projection.inputs.taxaConversao * 100);
    setCustoUnitario(projection.inputs.custoUnitario);
    if (projection.inputs.metaReceitaFaturada) {
      setMetaReceitaFaturada(projection.inputs.metaReceitaFaturada);
    }
    if (projection.inputs.investimento) {
      setInvestimento(projection.inputs.investimento);
    }
    toast({
      title: 'Projeção carregada',
      description: 'Os valores foram restaurados.',
    });
  };

  // Calculate outputs
  const outputs = useMemo(() => {
    const inputs: ProjectionInputs = {
      ticketMedio,
      aprovacao: aprovacao / 100,
      taxaConversao: taxaConversao / 100,
      custoUnitario,
      ...(mode === 'target_to_budget' ? { metaReceitaFaturada } : { investimento }),
    };
    return calculateProjection(inputs, mode);
  }, [ticketMedio, aprovacao, taxaConversao, custoUnitario, metaReceitaFaturada, investimento, mode]);

  const insights = useMemo(() => generateInsights(outputs, channel), [outputs, channel]);
  const labels = getChannelLabels(channel);

  // Update defaults when channel changes
  useEffect(() => {
    const benchmark = BENCHMARKS[channel];
    setTaxaConversao(benchmark.taxaConversao * 100);
    setCustoUnitario(benchmark.custoUnitario);
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Parâmetros</CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={loadBenchmark}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Carregar benchmark
                </Button>
              </div>
              <CardDescription>
                Benchmarks são estimativas — ajuste conforme o histórico do cliente.
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

              {/* Period */}
              <div className="space-y-2">
                <Label htmlFor="period">Período (opcional)</Label>
                <Input
                  id="period"
                  placeholder="Ex: Janeiro 2025"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                />
              </div>

              {/* Mode-specific input */}
              {mode === 'target_to_budget' ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="meta">Meta de faturamento (R$)</Label>
                    <TooltipHelper text="Receita faturada desejada no período" />
                  </div>
                  <Input
                    id="meta"
                    type="number"
                    min={0}
                    value={metaReceitaFaturada}
                    onChange={(e) => setMetaReceitaFaturada(Number(e.target.value))}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="investimento">Investimento em mídia (R$)</Label>
                    <TooltipHelper text="Verba total disponível para investimento em mídia" />
                  </div>
                  <Input
                    id="investimento"
                    type="number"
                    min={0}
                    value={investimento}
                    onChange={(e) => setInvestimento(Number(e.target.value))}
                  />
                </div>
              )}

              <Separator />

              {/* Common inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="ticket">Ticket médio (R$)</Label>
                    <TooltipHelper text="Valor médio por pedido" />
                  </div>
                  <Input
                    id="ticket"
                    type="number"
                    min={0}
                    step={0.01}
                    value={ticketMedio}
                    onChange={(e) => setTicketMedio(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="aprovacao">% Aprovação</Label>
                    <TooltipHelper text="Taxa de aprovação de pagamento (pedidos faturados / pedidos captados)" />
                  </div>
                  <Input
                    id="aprovacao"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={aprovacao}
                    onChange={(e) => setAprovacao(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="conversao">{labels.taxaConversaoLabel.split(' (')[0]} (%)</Label>
                    <TooltipHelper text={labels.taxaConversaoLabel} />
                  </div>
                  <Input
                    id="conversao"
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={taxaConversao}
                    onChange={(e) => setTaxaConversao(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="custo">{labels.custoUnitarioLabel.split(' (')[0]} (R$)</Label>
                    <TooltipHelper text={labels.custoUnitarioTooltip} />
                  </div>
                  <Input
                    id="custo"
                    type="number"
                    min={0}
                    step={0.01}
                    value={custoUnitario}
                    onChange={(e) => setCustoUnitario(Number(e.target.value))}
                  />
                </div>
              </div>

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
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {insights.map((insight, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        {insight}
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de Projeções</CardTitle>
            <CardDescription>Últimas 10 projeções salvas</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingProjections ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : projections && projections.length > 0 ? (
              <div className="space-y-2">
                {projections.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {p.channel === 'ecommerce' ? 'E-commerce' : 'WhatsApp'}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {p.mode === 'target_to_budget' ? 'Meta → Orç.' : 'Orç. → Proj.'}
                          </Badge>
                          {p.period_label && (
                            <span className="text-xs text-muted-foreground">{p.period_label}</span>
                          )}
                        </div>
                        <div className="text-sm mt-1">
                          <span className="font-medium">{formatCurrency(p.outputs.receitaFaturada)}</span>
                          <span className="text-muted-foreground"> · Inv: {formatCurrency(p.outputs.investimento)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(p.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => loadProjection(p)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          loadProjection(p);
                          toast({ title: 'Projeção duplicada', description: 'Faça alterações e salve.' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma projeção salva ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

// Helper Components
function TooltipHelper({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <p className="text-xs">{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'green' | 'blue' | 'purple' | 'orange' | 'red';
  secondary?: boolean;
}

function KPICard({ title, value, icon: Icon, color, secondary }: KPICardProps) {
  const colorClasses = {
    green: 'bg-green-500/10 text-green-600',
    blue: 'bg-blue-500/10 text-blue-600',
    purple: 'bg-purple-500/10 text-purple-600',
    orange: 'bg-orange-500/10 text-orange-600',
    red: 'bg-red-500/10 text-red-600',
  };

  return (
    <Card className={secondary ? 'opacity-80' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-lg font-semibold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
