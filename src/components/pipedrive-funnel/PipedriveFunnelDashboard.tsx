import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, ExternalLink, AlertCircle, BarChart3, TrendingUp, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { usePipedriveFunnel } from './usePipedriveFunnel';
import { FunnelStepper } from './FunnelStepper';
import { FunnelPeriodFilter } from './FunnelPeriodFilter';
import { FunnelDetailsTable } from './FunnelDetailsTable';
import { FunnelComingSoon } from './FunnelComingSoon';
import { LostReasonsChart } from './LostReasonsChart';
import { DateRange, PIPELINE_ID, PIPEDRIVE_DOMAIN, ViewMode } from './types';

interface PipedriveFunnelDashboardProps {
  clientId: string;
}

export function PipedriveFunnelDashboard({ clientId }: PipedriveFunnelDashboardProps) {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });
  const [viewMode, setViewMode] = useState<ViewMode>('period');

  const { data, loading, error, lastUpdated, refetch } = usePipedriveFunnel(dateRange);

  const handleRefresh = async () => {
    await refetch(true);
  };

  const pipedriveUrl = `https://${PIPEDRIVE_DOMAIN}.pipedrive.com/pipeline/${PIPELINE_ID}`;

  // Error state
  if (error && !loading && !data) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div className="text-center">
            <p className="font-medium text-destructive">Erro ao carregar dados do Pipedrive</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Get conversion values
  const conversions = data?.conversions || {};
  const stageCounts = data?.stage_counts || {};
  const stageArrivals = data?.stage_arrivals || {};
  const leadsCount = data?.leads_count || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Funil de Vendas (Pipedrive)</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pipeline: serviços_b2b (ID {PIPELINE_ID})
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <FunnelPeriodFilter 
            dateRange={dateRange} 
            onDateRangeChange={setDateRange} 
          />
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={loading}
              className="h-7"
            >
              <RefreshCw className={cn('h-3 w-3 mr-1', loading && 'animate-spin')} />
              Atualizar
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-7"
            >
              <a href={pipedriveUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                Pipedrive
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Last updated */}
      {lastUpdated && (
        <p className="text-[10px] text-muted-foreground">
          Atualizado às {format(lastUpdated, "HH:mm", { locale: ptBR })}
        </p>
      )}

      {/* View Mode Toggle */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="period" className="gap-2">
            <TrendingUp className="h-3.5 w-3.5" />
            Fluxo do Período
          </TabsTrigger>
          <TabsTrigger value="snapshot" className="gap-2">
            <Users className="h-3.5 w-3.5" />
            Snapshot Atual
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Funnel Visualization */}
      <Card>
        <CardContent className="pt-6">
          <FunnelStepper 
            conversions={conversions} 
            stageCounts={stageCounts}
            stageArrivals={stageArrivals}
            allStages={data?.all_stages}
            leadsCount={leadsCount}
            viewMode={viewMode}
            loading={loading} 
          />
        </CardContent>
      </Card>


      {/* Lost Reasons Chart */}
      {/* Lost Reasons Chart */}
      <LostReasonsChart 
        lostReasons={data?.lost_reasons} 
        allStages={data?.all_stages}
        loading={loading} 
      />

      {/* Empty state when no data */}

      {/* Empty state when no data */}
      {!loading && data && leadsCount === 0 && Object.values(conversions).every(v => v === 0) && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              Sem dados para o período selecionado.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
