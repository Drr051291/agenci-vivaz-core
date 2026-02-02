import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, ExternalLink, AlertCircle, BarChart3, TrendingUp, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { usePipedriveFunnel } from './usePipedriveFunnel';
import { useCampaignTracking } from './useCampaignTracking';
import { useLeadSourceTracking } from './useLeadSourceTracking';
import { FunnelStepper } from './FunnelStepper';
import { FunnelPeriodFilter } from './FunnelPeriodFilter';
import { ComparisonPeriodSelector } from './ComparisonPeriodSelector';
import { LostReasonsChart } from './LostReasonsChart';
import { CampaignTrackingChart } from './CampaignTrackingChart';
import { LeadSourceChart } from './LeadSourceChart';
import { TargetVsActualPanel } from './TargetVsActualPanel';
import { 
  DateRange, 
  PIPELINE_ID, 
  PIPEDRIVE_DOMAIN, 
  ViewMode, 
  ComparisonConfig,
  PeriodPreset,
  PIPELINES,
} from './types';
import { getComparisonLabel, getComparisonRange } from './comparisonUtils';

interface PipedriveFunnelDashboardProps {
  clientId: string;
  pipelineId?: number;
  pipelineName?: string;
  pipelineSubtitle?: string;
}

export function PipedriveFunnelDashboard({ 
  clientId, 
  pipelineId = PIPELINE_ID,
  pipelineName = PIPELINES.brandspot.name,
  pipelineSubtitle = PIPELINES.brandspot.subtitle,
}: PipedriveFunnelDashboardProps) {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });
  const [viewMode, setViewMode] = useState<ViewMode>('period');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('thisMonth');
  const [comparisonConfig, setComparisonConfig] = useState<ComparisonConfig>({
    enabled: true,
    preset: 'auto',
  });

  const { 
    data, 
    comparisonData,
    loading, 
    comparisonLoading,
    error, 
    lastUpdated, 
    refetch 
  } = usePipedriveFunnel(dateRange, { comparisonConfig, periodPreset, pipelineId });
  
  const { 
    data: trackingData, 
    loading: trackingLoading, 
    refetch: refetchTracking 
  } = useCampaignTracking(dateRange, { pipelineId });
  
  const { 
    data: leadSourceData, 
    snapshotData: leadSourceSnapshotData,
    loading: leadSourceLoading, 
    snapshotLoading: leadSourceSnapshotLoading,
    refetch: refetchLeadSource 
  } = useLeadSourceTracking(dateRange, { pipelineId });

  const handleRefresh = async () => {
    await Promise.all([refetch(true), refetchTracking(true), refetchLeadSource(true)]);
  };

  const handleDateRangeChange = (range: DateRange, preset?: PeriodPreset) => {
    setDateRange(range);
    if (preset) {
      setPeriodPreset(preset);
    }
  };

  const pipedriveUrl = `https://${PIPEDRIVE_DOMAIN}.pipedrive.com/pipeline/${pipelineId}`;

  // Calculate comparison label
  const comparisonRange = getComparisonRange(dateRange, periodPreset, comparisonConfig);
  const comparisonLabel = getComparisonLabel(periodPreset, comparisonConfig.preset, comparisonRange);

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
            <h2 className="text-lg font-semibold">Funil de Vendas — {pipelineName}</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pipeline: {pipelineSubtitle} (ID {pipelineId})
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <FunnelPeriodFilter 
            dateRange={dateRange} 
            onDateRangeChange={handleDateRangeChange}
            onPresetChange={setPeriodPreset}
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

      {/* Comparison Selector + Last Updated */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <ComparisonPeriodSelector
          config={comparisonConfig}
          onConfigChange={setComparisonConfig}
          periodPreset={periodPreset}
        />
        
        {lastUpdated && (
          <p className="text-[10px] text-muted-foreground">
            Atualizado às {format(lastUpdated, "HH:mm", { locale: ptBR })}
          </p>
        )}
      </div>

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
            comparisonData={comparisonConfig.enabled ? comparisonData : null}
            comparisonLoading={comparisonLoading}
            comparisonLabel={comparisonLabel}
            pipelineId={pipelineId}
            dateRange={dateRange}
          />
        </CardContent>
      </Card>

      {/* Target vs Actual Panel */}
      <TargetVsActualPanel
        conversions={conversions}
        stageCounts={stageCounts}
        stageArrivals={stageArrivals}
        allStages={data?.all_stages}
        leadsCount={leadsCount}
        viewMode={viewMode}
        loading={loading}
      />

      {/* Lead Source Chart */}
      <LeadSourceChart 
        data={leadSourceData}
        snapshotData={leadSourceSnapshotData}
        allStages={data?.all_stages}
        loading={leadSourceLoading} 
        snapshotLoading={leadSourceSnapshotLoading}
        viewMode={viewMode}
      />

      {/* Lost Reasons Chart */}
      <LostReasonsChart 
        lostReasons={data?.lost_reasons} 
        allStages={data?.all_stages}
        loading={loading} 
      />

      {/* Campaign Tracking Chart */}
      <CampaignTrackingChart 
        data={trackingData}
        allStages={data?.all_stages}
        loading={trackingLoading} 
      />

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
