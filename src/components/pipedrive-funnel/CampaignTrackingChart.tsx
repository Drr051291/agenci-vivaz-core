import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Target, AlertCircle, Megaphone, Layers, Film } from 'lucide-react';
import { CampaignTrackingData, CampaignTrackingItem, StageInfo, ViewMode, LeadSource } from './types';
import { cn } from '@/lib/utils';

interface CampaignTrackingChartProps {
  data?: CampaignTrackingData | null;
  snapshotData?: CampaignTrackingData | null;
  allStages?: StageInfo[];
  loading?: boolean;
  snapshotLoading?: boolean;
  viewMode?: ViewMode;
  pipelineId?: number;
}

interface TrackingItem {
  name: string;
  count: number;
  percentage: number;
  by_source?: Record<string, number>;
}

const SOURCE_COLORS: Record<string, string> = {
  'Landing Page': 'bg-blue-500',
  'Base Sétima': 'bg-purple-500',
  'Lead Nativo': 'bg-emerald-500',
};

const SOURCE_DOT_COLORS: Record<string, string> = {
  'Landing Page': 'bg-blue-400',
  'Base Sétima': 'bg-purple-400',
  'Lead Nativo': 'bg-emerald-400',
};

const SOURCE_ORDER: LeadSource[] = ['Lead Nativo', 'Landing Page', 'Base Sétima'];

interface TrackingSectionProps {
  title: string;
  icon: React.ReactNode;
  data: TrackingItem[];
  colorClass: string;
  bgClass: string;
}

function SourceSegmentBar({ by_source, total }: { by_source?: Record<string, number>; total: number }) {
  if (!by_source || total === 0) return null;
  
  return (
    <div className="h-2 rounded-full overflow-hidden flex bg-muted/40">
      {SOURCE_ORDER.map(source => {
        const count = by_source[source] || 0;
        if (count === 0) return null;
        const pct = (count / total) * 100;
        return (
          <div
            key={source}
            className={cn("h-full transition-all duration-500", SOURCE_COLORS[source])}
            style={{ width: `${Math.max(pct, 2)}%` }}
            title={`${source}: ${count} (${pct.toFixed(0)}%)`}
          />
        );
      })}
    </div>
  );
}

function SourceBadges({ by_source, total }: { by_source?: Record<string, number>; total: number }) {
  if (!by_source || total === 0) return null;
  
  return (
    <div className="flex items-center gap-2 flex-wrap mt-0.5">
      {SOURCE_ORDER.map(source => {
        const count = by_source[source] || 0;
        if (count === 0) return null;
        const pct = (count / total) * 100;
        return (
          <span key={source} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className={cn("inline-block h-2 w-2 rounded-full", SOURCE_DOT_COLORS[source])} />
            {count} ({pct.toFixed(0)}%)
          </span>
        );
      })}
    </div>
  );
}

function TrackingSection({ title, icon, data }: TrackingSectionProps) {
  if (data.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {icon}
          <span>{title}</span>
        </div>
        <div className="flex items-center justify-center h-24 text-muted-foreground text-xs bg-muted/30 rounded-lg">
          Sem dados
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span 
                className="truncate font-medium" 
                title={item.name}
                style={{ maxWidth: '60%' }}
              >
                {item.name}
              </span>
              <span className="text-muted-foreground shrink-0 ml-2">
                {item.count} ({item.percentage.toFixed(0)}%)
              </span>
            </div>
            <SourceSegmentBar by_source={item.by_source} total={item.count} />
            <SourceBadges by_source={item.by_source} total={item.count} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CampaignTrackingChart({ 
  data, 
  snapshotData,
  allStages, 
  loading, 
  snapshotLoading,
  viewMode = 'period',
}: CampaignTrackingChartProps) {
  const [activeStage, setActiveStage] = useState<string>('total');

  const activeData = viewMode === 'snapshot' ? snapshotData : data;
  const isLoading = viewMode === 'snapshot' ? snapshotLoading : loading;

  const processData = (
    rawData: Record<string, CampaignTrackingItem> | undefined
  ): TrackingItem[] => {
    if (!rawData) return [];

    const entries = Object.entries(rawData);
    if (entries.length === 0) return [];

    let filteredEntries: Array<[string, CampaignTrackingItem]>;
    
    if (activeStage === 'total') {
      filteredEntries = entries;
    } else {
      const stageId = Number(activeStage);
      filteredEntries = entries
        .map(([name, data]) => [name, { 
          ...data, 
          total: data.by_stage[stageId] || 0 
        }] as [string, CampaignTrackingItem])
        .filter(([, data]) => data.total > 0);
    }

    const sorted = filteredEntries
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 8);

    const totalCount = sorted.reduce((sum, [, data]) => sum + data.total, 0);

    return sorted.map(([name, itemData]) => ({
      name: name || 'Não informado',
      count: itemData.total,
      percentage: totalCount > 0 ? (itemData.total / totalCount) * 100 : 0,
      by_source: itemData.by_source,
    }));
  };

  const campaignData = useMemo(() => processData(activeData?.by_campaign), [activeData, activeStage]);
  const adsetData = useMemo(() => processData(activeData?.by_adset), [activeData, activeStage]);
  const creativeData = useMemo(() => processData(activeData?.by_creative), [activeData, activeStage]);

  const totalDeals = useMemo(() => {
    if (!activeData?.by_campaign) return 0;
    return Object.values(activeData.by_campaign).reduce((sum, item) => sum + item.total, 0);
  }, [activeData]);

  const stagesWithData = useMemo(() => {
    if (!allStages || !activeData?.by_campaign) return [];

    const stagesSet = new Set<number>();
    
    const addStagesFromData = (dataObj: Record<string, CampaignTrackingItem> | undefined) => {
      if (!dataObj) return;
      Object.values(dataObj).forEach(item => {
        Object.keys(item.by_stage).forEach(stageId => {
          if (item.by_stage[Number(stageId)] > 0) {
            stagesSet.add(Number(stageId));
          }
        });
      });
    };

    addStagesFromData(activeData.by_campaign);
    addStagesFromData(activeData.by_adset);
    addStagesFromData(activeData.by_creative);

    return allStages.filter(stage => stagesSet.has(stage.id));
  }, [allStages, activeData]);

  const hasFieldsConfigured = activeData?.field_keys?.campaign || activeData?.field_keys?.adset || activeData?.field_keys?.creative;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full mb-4" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activeData || !hasFieldsConfigured) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Campos de rastreamento (Campanha, Conjunto, Anuncio) não encontrados no Pipedrive.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (totalDeals === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
          <Target className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            {viewMode === 'period' 
              ? 'Sem dados de rastreamento para o período selecionado.'
              : 'Sem dados de rastreamento no cenário atual.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Rastreamento de Campanhas
            <span className="text-xs text-muted-foreground font-normal">
              ({viewMode === 'snapshot' ? 'Cenário Atual' : 'Fluxo do Período'})
            </span>
          </CardTitle>
          <div className="flex items-center gap-3">
            {/* Source legend */}
            <div className="flex items-center gap-2">
              {SOURCE_ORDER.map(source => (
                <span key={source} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className={cn("inline-block h-2 w-2 rounded-full", SOURCE_DOT_COLORS[source])} />
                  {source}
                </span>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {totalDeals} negócio{totalDeals !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stage filter tabs */}
        <Tabs value={activeStage} onValueChange={setActiveStage} className="mb-4">
          <TabsList className="w-full flex-wrap h-auto gap-1">
            <TabsTrigger value="total" className="text-xs">
              Total
            </TabsTrigger>
            {stagesWithData.map(stage => (
              <TabsTrigger key={stage.id} value={String(stage.id)} className="text-xs">
                {stage.name.split(' ')[0].split('(')[0]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Three-column layout for dimensions */}
        <div className="grid gap-6 md:grid-cols-3">
          <TrackingSection 
            title="Campanha" 
            icon={<Megaphone className="h-3.5 w-3.5" />}
            data={campaignData} 
            colorClass="bg-primary"
            bgClass="bg-primary/20"
          />
          <TrackingSection 
            title="Conjunto de Anúncios" 
            icon={<Layers className="h-3.5 w-3.5" />}
            data={adsetData} 
            colorClass="bg-purple-500"
            bgClass="bg-purple-500/20"
          />
          <TrackingSection 
            title="Anúncio" 
            icon={<Film className="h-3.5 w-3.5" />}
            data={creativeData} 
            colorClass="bg-emerald-500"
            bgClass="bg-emerald-500/20"
          />
        </div>
      </CardContent>
    </Card>
  );
}
