import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Zap,
  Target,
  Users,
  Clock,
  DollarSign,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { usePageMeta } from "@/hooks/usePageMeta";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { cn } from "@/lib/utils";

import { 
  SetorAtuacao, 
  SETORES_LIST, 
  getBenchmarkForSetor,
  AVERAGE_BRAZIL_CONVERSION,
} from "@/lib/performanceMatrixPro/benchmarks";
import { 
  FunnelInputs, 
  calculateFunnel, 
  formatPercent, 
  formatCurrency,
  formatNumber,
  identifyBottleneck,
} from "@/lib/performanceMatrixPro/calc";
import { 
  generateInsights, 
  generateHighTicketInsights,
  Insight,
} from "@/lib/performanceMatrixPro/insights";

// Funnel stage colors
const STAGE_COLORS = [
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-fuchsia-500',
];

export default function MatrizPerformancePro() {
  usePageMeta({ title: "Matriz de Performance Pro | Ferramentas" });
  const navigate = useNavigate();

  // State
  const [setor, setSetor] = useState<SetorAtuacao>('geral_b2b');
  const [inputs, setInputs] = useState<FunnelInputs>({
    leads: 0,
    mqls: 0,
    sqls: 0,
    oportunidades: 0,
    contratos: 0,
    cicloVendas: undefined,
    ticketMedio: undefined,
  });

  // Calculations
  const benchmark = useMemo(() => getBenchmarkForSetor(setor), [setor]);
  const outputs = useMemo(() => calculateFunnel(inputs), [inputs]);
  const bottleneck = useMemo(() => identifyBottleneck(outputs.stages), [outputs.stages]);
  const insights = useMemo(() => {
    const mainInsights = generateInsights(outputs, setor);
    const ticketInsights = generateHighTicketInsights(inputs.ticketMedio);
    return [...mainInsights, ...ticketInsights];
  }, [outputs, setor, inputs.ticketMedio]);

  // Helpers
  const updateInput = (key: keyof FunnelInputs, value: string) => {
    const parsed = value === '' ? 0 : parseFloat(value);
    setInputs(prev => ({ ...prev, [key]: isNaN(parsed) ? 0 : parsed }));
  };

  const updateOptionalInput = (key: 'cicloVendas' | 'ticketMedio', value: string) => {
    const parsed = value === '' ? undefined : parseFloat(value);
    setInputs(prev => ({ ...prev, [key]: parsed }));
  };

  // Get comparison badge
  const getComparisonBadge = (rate: number | null, eligible: boolean) => {
    if (!eligible || rate === null) {
      return <Badge variant="secondary" className="text-xs">Amostra baixa</Badge>;
    }
    
    // Compare stage rate against global benchmark as a proxy
    const isHealthy = rate >= 20; // General threshold for stage health
    
    if (isHealthy) {
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
          <CheckCircle className="h-3 w-3 mr-1" />
          Saudável
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="text-xs">
        <TrendingDown className="h-3 w-3 mr-1" />
        Abaixo da Média
      </Badge>
    );
  };

  // Get global comparison badge
  const getGlobalBadge = () => {
    if (outputs.globalConversion === null) return null;
    
    if (outputs.globalConversion >= benchmark.conversionRate) {
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          <CheckCircle className="h-3 w-3 mr-1" />
          Saudável
        </Badge>
      );
    }
    if (outputs.globalConversion >= AVERAGE_BRAZIL_CONVERSION * 0.7) {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Atenção
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <TrendingDown className="h-3 w-3 mr-1" />
        Abaixo da Média
      </Badge>
    );
  };

  // Get insight icon
  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/ferramentas')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Matriz de Performance Pro</h1>
                <p className="text-muted-foreground text-sm">
                  Análise de funil com benchmarks Brasil 2025
                </p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit">
              Benchmark: {benchmark.label}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Inputs (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Sector Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Setor de Atuação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={setor} onValueChange={(v) => setSetor(v as SetorAtuacao)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SETORES_LIST.map(s => (
                        <SelectItem key={s.value} value={s.value}>
                          <div>
                            <p className="font-medium">{s.label}</p>
                            <p className="text-xs text-muted-foreground">{s.description}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Benchmark: {formatPercent(benchmark.conversionRate)} conversão geral
                  </p>
                </CardContent>
              </Card>

              {/* Funnel Inputs */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Dados do Funil
                  </CardTitle>
                  <CardDescription>
                    Insira as quantidades de cada etapa
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-1">
                      Número de Leads
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Total de leads captados no período</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input 
                      type="number" 
                      value={inputs.leads || ''} 
                      onChange={e => updateInput('leads', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-1">
                      MQLs
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Marketing Qualified Leads - leads qualificados por marketing</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input 
                      type="number" 
                      value={inputs.mqls || ''} 
                      onChange={e => updateInput('mqls', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-1">
                      SQLs
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Sales Qualified Leads - leads qualificados por vendas</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input 
                      type="number" 
                      value={inputs.sqls || ''} 
                      onChange={e => updateInput('sqls', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-1">
                      Oportunidades
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Oportunidades qualificadas em negociação</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input 
                      type="number" 
                      value={inputs.oportunidades || ''} 
                      onChange={e => updateInput('oportunidades', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm flex items-center gap-1">
                      Contratos Fechados
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Vendas concluídas no período</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input 
                      type="number" 
                      value={inputs.contratos || ''} 
                      onChange={e => updateInput('contratos', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <Separator className="my-3" />

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Ciclo (dias)
                      </Label>
                      <Input 
                        type="number" 
                        value={inputs.cicloVendas ?? ''} 
                        onChange={e => updateOptionalInput('cicloVendas', e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Ticket Médio
                      </Label>
                      <Input 
                        type="number" 
                        value={inputs.ticketMedio ?? ''} 
                        onChange={e => updateOptionalInput('ticketMedio', e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Middle Column - Funnel Visualization (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Global KPI */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Conversão Geral (Lead → Venda)</p>
                      <p className="text-3xl font-bold">
                        {formatPercent(outputs.globalConversion)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Benchmark {benchmark.label}: {formatPercent(benchmark.conversionRate)}
                      </p>
                    </div>
                    {getGlobalBadge()}
                  </div>
                </CardContent>
              </Card>

              {/* Funnel Visual */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Funil de Vendas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* Funnel Bars */}
                  <div className="space-y-1">
                    {[
                      { label: 'Leads', value: inputs.leads },
                      { label: 'MQL', value: inputs.mqls },
                      { label: 'SQL', value: inputs.sqls },
                      { label: 'Oportunidades', value: inputs.oportunidades },
                      { label: 'Contratos', value: inputs.contratos },
                    ].map((stage, idx, arr) => {
                      const maxValue = Math.max(...arr.map(s => s.value), 1);
                      const width = stage.value > 0 ? (stage.value / maxValue) * 100 : 5;
                      
                      return (
                        <div key={stage.label} className="flex items-center gap-3">
                          <div className="w-24 text-sm text-right text-muted-foreground">
                            {stage.label}
                          </div>
                          <div className="flex-1 h-8 bg-muted/30 rounded overflow-hidden relative">
                            <div 
                              className={cn(
                                "h-full transition-all duration-300 rounded flex items-center justify-end pr-2",
                                STAGE_COLORS[idx]
                              )}
                              style={{ width: `${width}%` }}
                            >
                              {stage.value > 0 && (
                                <span className="text-white text-sm font-medium">
                                  {formatNumber(stage.value)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Separator className="my-4" />

                  {/* Stage Conversions */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Taxas de Conversão</p>
                    {outputs.stages.map((stage, idx) => (
                      <div 
                        key={stage.key}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg",
                          bottleneck?.key === stage.key && "bg-red-50 border border-red-200"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", STAGE_COLORS[idx])} />
                          <span className="text-sm">{stage.label}</span>
                          {bottleneck?.key === stage.key && (
                            <Badge variant="destructive" className="text-xs">
                              Gargalo
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {formatPercent(stage.rate)}
                          </span>
                          {getComparisonBadge(stage.rate, stage.eligible)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sales Velocity */}
                  {outputs.salesVelocity !== null && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-amber-500" />
                          <span className="text-sm font-medium">Velocidade de Vendas</span>
                        </div>
                        <span className="font-bold text-lg">
                          {formatCurrency(outputs.salesVelocity)}/dia
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Insights (3 cols) */}
            <div className="lg:col-span-3 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Diagnóstico & Ações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {insights.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Preencha os dados do funil para receber insights.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {insights.map(insight => (
                        <div 
                          key={insight.id}
                          className={cn(
                            "p-3 rounded-lg border",
                            insight.type === 'success' && "bg-green-50 border-green-200",
                            insight.type === 'warning' && "bg-yellow-50 border-yellow-200",
                            insight.type === 'critical' && "bg-red-50 border-red-200",
                            insight.type === 'info' && "bg-blue-50 border-blue-200"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {getInsightIcon(insight.type)}
                            <div className="flex-1 min-w-0">
                              {insight.stage && (
                                <Badge variant="outline" className="text-xs mb-1">
                                  {insight.stage}
                                </Badge>
                              )}
                              <p className="text-sm font-medium">{insight.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {insight.description}
                              </p>
                              {insight.action && (
                                <p className="text-xs font-medium mt-2 text-primary">
                                  → {insight.action}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Benchmark Reference */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Referência do Benchmark</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p>
                    <strong>Fonte:</strong> Benchmark Inside Sales B2B e B2C Brasil 2025
                  </p>
                  <div>
                    <p className="font-medium text-foreground mb-1">Conversão Geral por Setor:</p>
                    <ul className="space-y-0.5">
                      <li>• B2B Geral: 2,50%</li>
                      <li>• B2C Geral: 3,28%</li>
                      <li>• Consultoria: 1,55%</li>
                      <li>• SaaS/Tech: 2,06%</li>
                      <li>• Indústria: 3,81%</li>
                      <li>• Jurídico: 4,45% - 7,4%</li>
                    </ul>
                  </div>
                  <p className="text-[10px] pt-2 border-t">
                    Média Brasil: {AVERAGE_BRAZIL_CONVERSION}%
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
