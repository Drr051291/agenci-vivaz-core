import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, ExternalLink, AlertCircle, BarChart3, TrendingUp, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { usePipedriveFunnel } from './usePipedriveFunnel';
import { useCampaignTracking } from './useCampaignTracking';
import { useLeadSourceTracking } from './useLeadSourceTracking';
import { useSectorTracking } from './useSectorTracking';
import { FunnelStepper } from './FunnelStepper';
import { FunnelPeriodFilter } from './FunnelPeriodFilter';
import { ComparisonPeriodSelector } from './ComparisonPeriodSelector';
import { LostReasonsChart } from './LostReasonsChart';
import { CampaignTrackingChart } from './CampaignTrackingChart';
import { LeadSourceChart } from './LeadSourceChart';
import { SectorDistributionChart } from './SectorDistributionChart';
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
    snapshotData: trackingSnapshotData,
    loading: trackingLoading,
    snapshotLoading: trackingSnapshotLoading,
    refetch: refetchTracking 
  } = useCampaignTracking(dateRange, { pipelineId });
  
  const { 
    data: leadSourceData, 
    snapshotData: leadSourceSnapshotData,
    loading: leadSourceLoading, 
    snapshotLoading: leadSourceSnapshotLoading,
    refetch: refetchLeadSource 
  } = useLeadSourceTracking(dateRange, { pipelineId });

  const { 
    data: sectorData, 
    snapshotData: sectorSnapshotData,
    loading: sectorLoading, 
    snapshotLoading: sectorSnapshotLoading,
    refetch: refetchSector 
  } = useSectorTracking(dateRange, { pipelineId });

  const handleRefresh = async () => {
    await Promise.all([refetch(true), refetchTracking(true), refetchLeadSource(true), refetchSector(true)]);
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
    <div className="space-y-4">
      {/* Compact Header Bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <BarChart3 className="h-4 w-4 text-primary shrink-0" />
            <h2 className="text-base font-semibold truncate">{pipelineName}</h2>
            <Badge variant="outline" className="text-[10px] shrink-0 hidden sm:inline-flex">
              {pipelineSubtitle}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <FunnelPeriodFilter 
            dateRange={dateRange} 
            onDateRangeChange={handleDateRangeChange}
            onPresetChange={setPeriodPreset}
          />
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh}
            disabled={loading}
            className="h-8 w-8"
            title="Atualizar"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-8 w-8"
            title="Abrir no Pipedrive"
          >
            <a href={pipedriveUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      {/* Controls Row - Compact */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {/* View Mode Toggle - Inline */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="period" className="h-7 px-3 text-xs gap-1.5">
                <TrendingUp className="h-3 w-3" />
                Fluxo do Período
              </TabsTrigger>
              <TabsTrigger value="snapshot" className="h-7 px-3 text-xs gap-1.5">
                <Users className="h-3 w-3" />
                Cenário Atual
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <ComparisonPeriodSelector
            config={comparisonConfig}
            onConfigChange={setComparisonConfig}
            periodPreset={periodPreset}
          />
        </div>
        
        {lastUpdated && (
          <span className="text-[10px] text-muted-foreground">
            {format(lastUpdated, "HH:mm", { locale: ptBR })}
          </span>
        )}
      </div>

      {/* Funnel Visualization - Direct, no card wrapper for cleaner look */}
      <div className="border rounded-lg p-4 bg-card">
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
      </div>

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

      {/* Sector Distribution Chart - For 3D and Brandspot pipelines */}
      <SectorDistributionChart 
        data={sectorData}
        snapshotData={sectorSnapshotData}
        allStages={data?.all_stages}
        loading={sectorLoading} 
        snapshotLoading={sectorSnapshotLoading}
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
        snapshotData={trackingSnapshotData}
        allStages={data?.all_stages}
        loading={trackingLoading}
        snapshotLoading={trackingSnapshotLoading}
        viewMode={viewMode}
        pipelineId={pipelineId}
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
