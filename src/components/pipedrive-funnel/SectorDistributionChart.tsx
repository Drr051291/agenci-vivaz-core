import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Building2, TrendingUp, Camera } from 'lucide-react';
import { SectorDistributionData, StageInfo, ViewMode } from './types';

interface SectorDistributionChartProps {
  data?: SectorDistributionData | null;
  snapshotData?: SectorDistributionData | null;
  allStages?: StageInfo[];
  loading?: boolean;
  snapshotLoading?: boolean;
  viewMode?: ViewMode;
}

// Color palette for sectors
const SECTOR_COLORS = [
  'hsl(217 91% 60%)',   // Blue
  'hsl(271 91% 65%)',   // Purple
  'hsl(142 71% 45%)',   // Green
  'hsl(38 92% 50%)',    // Orange
  'hsl(340 82% 52%)',   // Pink
  'hsl(174 72% 40%)',   // Teal
  'hsl(45 93% 47%)',    // Yellow
  'hsl(0 72% 51%)',     // Red
];

interface SectorDataItem {
  sector: string;
  count: number;
  percentage: number;
  color: string;
}

function SectorBarList({ data }: { data: SectorDataItem[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
        Sem dados nesta etapa
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.sector} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium truncate max-w-[200px]" title={item.sector}>
              {item.sector}
            </span>
            <span className="text-muted-foreground shrink-0 ml-2">
              {item.count} ({item.percentage.toFixed(0)}%)
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div 
              className="h-full transition-all"
              style={{ 
                width: `${Math.min(item.percentage, 100)}%`,
                backgroundColor: item.color 
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function buildChartData(sectorData: SectorDistributionData | null | undefined): SectorDataItem[] {
  if (!sectorData?.by_sector) return [];
  
  const entries = Object.entries(sectorData.by_sector);
  const totalCount = entries.reduce((sum, [, data]) => sum + data.total, 0);
  
  return entries
    .map(([sector, data], idx) => ({
      sector,
      count: data.total,
      percentage: totalCount > 0 ? (data.total / totalCount) * 100 : 0,
      color: SECTOR_COLORS[idx % SECTOR_COLORS.length]
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);
}

function buildStageChartData(
  sectorData: SectorDistributionData | null | undefined, 
  allStages: StageInfo[] | undefined
): Record<number, SectorDataItem[]> {
  if (!sectorData?.by_sector || !allStages) return {};
  
  const sectors = Object.keys(sectorData.by_sector);
  const result: Record<number, SectorDataItem[]> = {};
  
  allStages.forEach(stage => {
    const stageTotal = sectors.reduce((sum, sector) => {
      return sum + (sectorData.by_sector[sector]?.by_stage[stage.id] || 0);
    }, 0);
    
    if (stageTotal > 0) {
      result[stage.id] = sectors
        .map((sector, idx) => ({
          sector,
          count: sectorData.by_sector[sector]?.by_stage[stage.id] || 0,
          percentage: stageTotal > 0 ? ((sectorData.by_sector[sector]?.by_stage[stage.id] || 0) / stageTotal) * 100 : 0,
          color: SECTOR_COLORS[idx % SECTOR_COLORS.length]
        }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count);
    }
  });
  
  return result;
}

function getStagesWithData(
  sectorData: SectorDistributionData | null | undefined, 
  allStages: StageInfo[] | undefined
): StageInfo[] {
  if (!allStages || !sectorData?.by_sector) return [];
  
  const sectors = Object.keys(sectorData.by_sector);
  
  return allStages.filter(stage => {
    const stageTotal = sectors.reduce((sum, sector) => {
      return sum + (sectorData.by_sector[sector]?.by_stage[stage.id] || 0);
    }, 0);
    return stageTotal > 0;
  });
}

function getTotalDeals(sectorData: SectorDistributionData | null | undefined): number {
  if (!sectorData?.by_sector) return 0;
  return Object.values(sectorData.by_sector).reduce((sum, s) => sum + s.total, 0);
}

export function SectorDistributionChart({ 
  data, 
  snapshotData, 
  allStages, 
  loading, 
  snapshotLoading,
  viewMode = 'period' 
}: SectorDistributionChartProps) {
  const [activeTab, setActiveTab] = useState<string>('total');

  // Use period or snapshot data based on viewMode
  const activeData = viewMode === 'snapshot' ? snapshotData : data;
  const isLoading = viewMode === 'snapshot' ? snapshotLoading : loading;

  const totalChartData = useMemo(() => buildChartData(activeData), [activeData]);
  const stageChartData = useMemo(() => buildStageChartData(activeData, allStages), [activeData, allStages]);
  const stagesWithData = useMemo(() => getStagesWithData(activeData, allStages), [activeData, allStages]);
  const totalDeals = useMemo(() => getTotalDeals(activeData), [activeData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[120px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!activeData || totalDeals === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
          <Building2 className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            {viewMode === 'snapshot' 
              ? 'Sem dados de setor nos negócios abertos.'
              : 'Sem dados de setor no período.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Distribuição por Setor
            {viewMode === 'snapshot' ? (
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex items-center gap-1">
                <Camera className="h-3 w-3" />
                Snapshot
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Período
              </span>
            )}
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {totalDeals} {viewMode === 'snapshot' ? 'negócio' : 'lead'}{totalDeals !== 1 ? 's' : ''} 
            {viewMode === 'snapshot' ? ' abertos' : ' no período'}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 w-full flex-wrap h-auto gap-1">
            <TabsTrigger value="total" className="text-xs">
              Total
            </TabsTrigger>
            {stagesWithData.map(stage => (
              <TabsTrigger key={stage.id} value={String(stage.id)} className="text-xs">
                {stage.name.split(' ')[0].split('(')[0]}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="total" className="mt-0">
            <SectorBarList data={totalChartData} />
          </TabsContent>

          {stagesWithData.map(stage => (
            <TabsContent key={stage.id} value={String(stage.id)} className="mt-0">
              <SectorBarList data={stageChartData[stage.id] || []} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
