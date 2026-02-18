import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  getBenchmarkForSetor, 
  StageBenchmark, 
  StageStatus, 
  getStageStatus 
} from '@/lib/performanceMatrixPro/benchmarks';
import { StageInfo, ViewMode } from './types';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Benchmark for "Serviços Complexos" (consultoria)
const BENCHMARK = getBenchmarkForSetor('consultoria');

interface StageMetric {
  key: string;
  label: string;
  shortLabel: string;
  fromStage: string;
  toStage: string;
  actual: number | null;
  target: StageBenchmark;
  status: StageStatus;
}

interface TargetVsActualPanelProps {
  conversions: Record<string, number>;
  stageCounts?: Record<number, number>;
  stageArrivals?: Record<number, number>;
  allStages?: StageInfo[];
  leadsCount: number;
  viewMode: ViewMode;
  loading?: boolean;
}

// Map stage names to normalized keys
function normalizeStageKey(name: string): string {
  const normalized = name.toLowerCase().trim();
  if (normalized === 'lead' || normalized === 'leads') return 'lead';
  if (normalized === 'mql') return 'mql';
  if (normalized.startsWith('sql') || normalized.includes('sql (')) return 'sql';
  if (normalized.includes('oportunidade') || normalized === 'opportunity') return 'oportunidade';
  if (normalized.includes('contrato') || normalized === 'contract') return 'contrato';
  return normalized;
}

// Find stage ID by normalized key
function findStageId(stages: StageInfo[] | undefined, key: string): number | null {
  if (!stages) return null;
  const stage = stages.find(s => normalizeStageKey(s.name) === key);
  return stage?.id ?? null;
}

export function TargetVsActualPanel({
  conversions,
  stageCounts = {},
  stageArrivals = {},
  allStages,
  leadsCount,
  viewMode,
  loading,
}: TargetVsActualPanelProps) {
  // Get stage IDs
  const leadStageId = findStageId(allStages, 'lead');
  const mqlStageId = findStageId(allStages, 'mql');
  const sqlStageId = findStageId(allStages, 'sql');
  const oppStageId = findStageId(allStages, 'oportunidade');

  // Calculate conversion rates based on view mode
  const getStageValue = (stageId: number | null): number => {
    if (stageId === null) return 0;
    if (viewMode === 'snapshot') {
      return stageCounts[stageId] || 0;
    }
    return stageArrivals[stageId] || 0;
  };

  // Get counts for each stage
  const leadValue = viewMode === 'snapshot' 
    ? (leadStageId ? stageCounts[leadStageId] || 0 : 0) 
    : leadsCount;
  const mqlValue = getStageValue(mqlStageId);
  const sqlValue = getStageValue(sqlStageId);
  const oppValue = getStageValue(oppStageId);

  // Calculate conversion rates
  const calculateRate = (from: number, to: number): number | null => {
    if (from === 0) return null;
    return (to / from) * 100;
  };

  const leadToMql = calculateRate(leadValue, mqlValue);
  const mqlToSql = calculateRate(mqlValue, sqlValue);
  const sqlToOpp = calculateRate(sqlValue, oppValue);

  // Build metrics array
  const metrics: StageMetric[] = [
    {
      key: 'lead_to_mql',
      label: 'Lead → MQL',
      shortLabel: 'L→MQL',
      fromStage: 'Lead',
      toStage: 'MQL',
      actual: leadToMql,
      target: BENCHMARK.stages.lead_to_mql,
      status: getStageStatus(leadToMql, BENCHMARK.stages.lead_to_mql),
    },
    {
      key: 'mql_to_sql',
      label: 'MQL → SQL',
      shortLabel: 'MQL→SQL',
      fromStage: 'MQL',
      toStage: 'SQL',
      actual: mqlToSql,
      target: BENCHMARK.stages.mql_to_sql,
      status: getStageStatus(mqlToSql, BENCHMARK.stages.mql_to_sql),
    },
    {
      key: 'sql_to_opp',
      label: 'SQL → Oportunidade',
      shortLabel: 'SQL→Opp',
      fromStage: 'SQL',
      toStage: 'Oportunidade',
      actual: sqlToOpp,
      target: BENCHMARK.stages.sql_to_opp,
      status: getStageStatus(sqlToOpp, BENCHMARK.stages.sql_to_opp),
    },
  ];

  // Status styling
  const getStatusStyles = (status: StageStatus) => {
    switch (status) {
      case 'ok':
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          text: 'text-emerald-600',
          icon: TrendingUp,
          label: 'Acima da meta',
        };
      case 'warning':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          text: 'text-amber-600',
          icon: Minus,
          label: 'Na faixa aceitável',
        };
      case 'critical':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          text: 'text-red-600',
          icon: TrendingDown,
          label: 'Abaixo da meta',
        };
      default:
        return {
          bg: 'bg-muted/50',
          border: 'border-muted',
          text: 'text-muted-foreground',
          icon: AlertCircle,
          label: 'Sem dados',
        };
    }
  };

  const formatPercent = (value: number | null): string => {
    if (value === null) return '—';
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <Skeleton className="h-5 w-40" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-primary" />
            <CardTitle className="text-sm font-medium">Meta vs Realizado</CardTitle>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-[9px] cursor-help font-normal">
                  Benchmark: Serviços Complexos
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-xs">
                  Metas baseadas no benchmark de "Serviços Complexos (Consultoria High-End)" 
                  do estudo de taxas de conversão Meta Ads por segmento Brasil 2025.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-2">
        <div className="grid grid-cols-3 gap-3">
          {metrics.map((metric) => {
            const styles = getStatusStyles(metric.status);
            const StatusIcon = styles.icon;
            const diff = metric.actual !== null 
              ? metric.actual - metric.target.avg 
              : null;

            return (
              <div
                key={metric.key}
                className={cn(
                  'rounded-md border p-3 transition-colors',
                  styles.bg,
                  styles.border
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">{metric.shortLabel}</span>
                  <StatusIcon className={cn('h-3.5 w-3.5', styles.text)} />
                </div>
                
                <div className="space-y-1">
                  {/* Actual value */}
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] text-muted-foreground">Real</span>
                    <span className={cn('text-lg font-bold', styles.text)}>
                      {formatPercent(metric.actual)}
                    </span>
                  </div>
                  
                  {/* Target range */}
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] text-muted-foreground">Meta</span>
                    <span className="text-xs font-medium">
                      {metric.target.min}–{metric.target.max}%
                    </span>
                  </div>
                  
                  {/* Difference badge */}
                  {diff !== null && (
                    <div className="pt-0.5 flex justify-end">
                      <span className={cn(
                        'text-[9px] font-medium',
                        diff >= 0 ? 'text-emerald-600' : 'text-red-600'
                      )}>
                        {diff >= 0 ? '+' : ''}{diff.toFixed(1)}pp
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Volume indicator - more compact */}
        <div className="mt-3 pt-2 border-t flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{viewMode === 'snapshot' ? 'Cenário Atual' : 'Fluxo do Período'}</span>
          <div className="flex gap-3">
            <span>L: <strong className="text-foreground">{leadValue}</strong></span>
            <span>MQL: <strong className="text-foreground">{mqlValue}</strong></span>
            <span>SQL: <strong className="text-foreground">{sqlValue}</strong></span>
            <span>Opp: <strong className="text-foreground">{oppValue}</strong></span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
