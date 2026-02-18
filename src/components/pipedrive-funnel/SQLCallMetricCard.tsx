import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Phone, PhoneCall, PhoneMissed, CalendarClock, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { StageInfo, ViewMode } from './types';

interface SQLCallMetrics {
  agendada: number;
  sim: number;
  noshow: number;
  reagendada: number;
  total: number;
}

interface SQLCallMetricCardProps {
  pipelineId: number;
  allStages?: StageInfo[];
  viewMode: ViewMode;
}

const STATUS_CONFIG = [
  {
    key: 'agendada' as keyof Omit<SQLCallMetrics, 'total'>,
    label: 'Agendada',
    icon: CalendarClock,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    bar: 'bg-blue-500',
    description: 'Call agendada (sem resposta no campo)',
  },
  {
    key: 'sim' as keyof Omit<SQLCallMetrics, 'total'>,
    label: 'Realizada',
    icon: PhoneCall,
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950/30',
    bar: 'bg-green-500',
    description: 'Call foi realizada com sucesso',
  },
  {
    key: 'noshow' as keyof Omit<SQLCallMetrics, 'total'>,
    label: 'No Show',
    icon: PhoneMissed,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    bar: 'bg-amber-500',
    description: 'Lead não compareceu',
  },
  {
    key: 'reagendada' as keyof Omit<SQLCallMetrics, 'total'>,
    label: 'Reagendada',
    icon: RefreshCw,
    color: 'text-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    bar: 'bg-purple-500',
    description: 'Call foi reagendada',
  },
];

export function SQLCallMetricCard({ pipelineId, allStages = [], viewMode }: SQLCallMetricCardProps) {
  const [metrics, setMetrics] = useState<SQLCallMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sqlStageName, setSqlStageName] = useState<string>('SQL');

  useEffect(() => {
    fetchMetrics();
  }, [pipelineId, viewMode]);

  // Find SQL stage name from allStages for display
  useEffect(() => {
    const sqlStage = allStages.find(s => s.name.toLowerCase().includes('sql'));
    if (sqlStage) setSqlStageName(sqlStage.name);
  }, [allStages]);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('pipedrive-proxy', {
        body: {
          action: 'get_sql_call_metrics',
          pipeline_id: pipelineId,
          view_mode: viewMode,
        },
      });

      if (fnError) throw fnError;
      if (data?.success && data?.data) {
        setMetrics(data.data);
      } else {
        throw new Error(data?.error || 'Erro ao buscar métricas de call');
      }
    } catch (e) {
      console.error('Error fetching SQL call metrics:', e);
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  if (error) return null; // Silently fail if metric not available

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" />
          Status de Call — Etapa {sqlStageName}
          <span className="text-xs font-normal text-muted-foreground ml-auto">
            {viewMode === 'snapshot' ? 'Cenário Atual' : 'Período'}
          </span>
        </CardTitle>
        {!loading && metrics && (
          <p className="text-xs text-muted-foreground">
            {metrics.total} lead{metrics.total !== 1 ? 's' : ''} na etapa SQL
          </p>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        ) : !metrics || metrics.total === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <Phone className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">Sem dados de call na etapa SQL</p>
          </div>
        ) : (
          <div className="space-y-3">
            {STATUS_CONFIG.map((config) => {
              const count = metrics[config.key];
              const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
              const Icon = config.icon;

              return (
                <div key={config.key} className="flex items-center gap-3 group">
                  {/* Icon */}
                  <div className={cn('p-1.5 rounded', config.bg)}>
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>

                  {/* Bar + Label */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{config.label}</span>
                      <span className="text-xs text-muted-foreground">{count} lead{count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', config.bar)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Percentage */}
                  <span className={cn('text-sm font-bold w-10 text-right', config.color)}>
                    {pct}%
                  </span>
                </div>
              );
            })}

            {/* Summary donut-style row */}
            <div className="mt-4 pt-3 border-t flex items-center gap-1 flex-wrap">
              {STATUS_CONFIG.map((config) => {
                const count = metrics[config.key];
                const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
                if (pct === 0) return null;
                return (
                  <div
                    key={config.key}
                    className={cn('flex-1 min-w-[60px] text-center py-1 px-2 rounded text-xs', config.bg)}
                    style={{ minWidth: `${Math.max(pct, 15)}%`, flex: `${pct} 1 0` }}
                  >
                    <span className={cn('font-bold', config.color)}>{pct}%</span>
                    <br />
                    <span className="text-[10px] text-muted-foreground">{config.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
