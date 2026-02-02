import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown,
  Minus,
  RefreshCw,
  Info,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BENCHMARK_DATA, 
  SETORES_LIST, 
  SetorAtuacao,
  getStageStatus,
  StageStatus,
} from '@/lib/performanceMatrixPro/benchmarks';

interface FunnelInputs {
  leads: number;
  mql: number;
  sql: number;
  oportunidades: number;
  contratos: number;
}

const DEFAULT_INPUTS: FunnelInputs = {
  leads: 100,
  mql: 25,
  sql: 8,
  oportunidades: 5,
  contratos: 1,
};

function getStatusIcon(status: StageStatus) {
  switch (status) {
    case 'ok':
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'warning':
      return <Minus className="h-4 w-4 text-yellow-500" />;
    case 'critical':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStatusBadge(status: StageStatus) {
  switch (status) {
    case 'ok':
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">OK</Badge>;
    case 'warning':
      return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Atenção</Badge>;
    case 'critical':
      return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Crítico</Badge>;
    default:
      return <Badge variant="secondary">-</Badge>;
  }
}

export function EmbeddedPerformanceMatrix() {
  const [setor, setSetor] = useState<SetorAtuacao>('consultoria');
  const [inputs, setInputs] = useState<FunnelInputs>(DEFAULT_INPUTS);

  const benchmark = BENCHMARK_DATA[setor];

  const calculations = useMemo(() => {
    const leadToMql = inputs.leads > 0 ? (inputs.mql / inputs.leads) * 100 : 0;
    const mqlToSql = inputs.mql > 0 ? (inputs.sql / inputs.mql) * 100 : 0;
    const sqlToOpp = inputs.sql > 0 ? (inputs.oportunidades / inputs.sql) * 100 : 0;
    const oppToSale = inputs.oportunidades > 0 ? (inputs.contratos / inputs.oportunidades) * 100 : 0;
    const leadToSale = inputs.leads > 0 ? (inputs.contratos / inputs.leads) * 100 : 0;

    return {
      leadToMql: { rate: leadToMql, status: getStageStatus(leadToMql, benchmark.stages.lead_to_mql) },
      mqlToSql: { rate: mqlToSql, status: getStageStatus(mqlToSql, benchmark.stages.mql_to_sql) },
      sqlToOpp: { rate: sqlToOpp, status: getStageStatus(sqlToOpp, benchmark.stages.sql_to_opp) },
      oppToSale: { rate: oppToSale, status: getStageStatus(oppToSale, benchmark.stages.opp_to_sale) },
      leadToSale,
    };
  }, [inputs, benchmark]);

  const handleInputChange = (field: keyof FunnelInputs, value: string) => {
    const num = parseInt(value) || 0;
    setInputs(prev => ({ ...prev, [field]: Math.max(0, num) }));
  };

  const handleReset = () => {
    setInputs(DEFAULT_INPUTS);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Simulador de Funil
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Resetar
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Simule suas métricas e compare com benchmarks do mercado
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sector Selector */}
        <div className="flex items-center gap-4">
          <Label className="text-sm whitespace-nowrap">Setor:</Label>
          <Select value={setor} onValueChange={(v) => setSetor(v as SetorAtuacao)}>
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SETORES_LIST.map(s => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="font-medium">{benchmark.label}</p>
                <p className="text-xs text-muted-foreground">{benchmark.description}</p>
                <p className="text-xs mt-1">
                  Taxa geral: {benchmark.conversionRange.min}% - {benchmark.conversionRange.max}%
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-5 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Leads</Label>
            <Input
              type="number"
              value={inputs.leads}
              onChange={(e) => handleInputChange('leads', e.target.value)}
              className="text-center font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">MQLs</Label>
            <Input
              type="number"
              value={inputs.mql}
              onChange={(e) => handleInputChange('mql', e.target.value)}
              className="text-center font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">SQLs</Label>
            <Input
              type="number"
              value={inputs.sql}
              onChange={(e) => handleInputChange('sql', e.target.value)}
              className="text-center font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Oportunidades</Label>
            <Input
              type="number"
              value={inputs.oportunidades}
              onChange={(e) => handleInputChange('oportunidades', e.target.value)}
              className="text-center font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Contratos</Label>
            <Input
              type="number"
              value={inputs.contratos}
              onChange={(e) => handleInputChange('contratos', e.target.value)}
              className="text-center font-medium"
            />
          </div>
        </div>

        {/* Results */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Taxas de Conversão vs Benchmark
          </h4>
          
          <div className="grid gap-2">
            {[
              { label: 'Lead → MQL', data: calculations.leadToMql, benchmark: benchmark.stages.lead_to_mql },
              { label: 'MQL → SQL', data: calculations.mqlToSql, benchmark: benchmark.stages.mql_to_sql },
              { label: 'SQL → Oportunidade', data: calculations.sqlToOpp, benchmark: benchmark.stages.sql_to_opp },
              { label: 'Oportunidade → Contrato', data: calculations.oppToSale, benchmark: benchmark.stages.opp_to_sale },
            ].map((item, idx) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  item.data.status === 'ok' && "bg-green-500/5 border-green-500/20",
                  item.data.status === 'warning' && "bg-yellow-500/5 border-yellow-500/20",
                  item.data.status === 'critical' && "bg-red-500/5 border-red-500/20",
                  item.data.status === 'no_data' && "bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(item.data.status)}
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-bold">
                      {item.data.rate.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Meta: {item.benchmark.min}-{item.benchmark.max}%
                    </div>
                  </div>
                  {getStatusBadge(item.data.status)}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Overall Conversion */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Taxa Geral Lead → Contrato</span>
              <div className="text-right">
                <span className="text-lg font-bold text-primary">
                  {calculations.leadToSale.toFixed(2)}%
                </span>
                <div className="text-[10px] text-muted-foreground">
                  Benchmark: {benchmark.conversionRange.min}% - {benchmark.conversionRange.max}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
