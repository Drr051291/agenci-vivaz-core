import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Target, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CampaignTrackingData, StageInfo, TrackingLevel, ViewMode } from './types';

interface CampaignTrackingChartProps {
  data?: CampaignTrackingData | null;
  snapshotData?: CampaignTrackingData | null;
  allStages?: StageInfo[];
  loading?: boolean;
  snapshotLoading?: boolean;
  viewMode?: ViewMode;
  pipelineId?: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--muted-foreground))',
];

const LEVEL_LABELS: Record<TrackingLevel, string> = {
  campaign: 'Campanha',
  adset: 'Conjunto',
  creative: 'Criativo',
};

interface ChartDataItem {
  name: string;
  fullName: string;
  count: number;
  percentage: number;
  fill: string;
}

function TrackingBarChart({ data, height = 200 }: { data: ChartDataItem[]; height?: number }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        Sem dados para este filtro
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart 
        data={data} 
        layout="vertical" 
        margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis 
          type="number" 
          tick={{ fontSize: 10 }} 
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          type="category" 
          dataKey="name" 
          tick={{ fontSize: 10 }} 
          width={140}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip 
          cursor={{ fill: 'hsl(var(--muted))' }}
          contentStyle={{ 
            backgroundColor: 'hsl(var(--popover))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            fontSize: '12px'
          }}
          formatter={(value: number, _name: string, props: { payload?: { fullName?: string; percentage?: number } }) => [
            `${value} negócio${value !== 1 ? 's' : ''} (${props.payload?.percentage?.toFixed(1) || 0}%)`,
            props.payload?.fullName || 'Item'
          ]}
        />
        <Bar 
          dataKey="count" 
          radius={[0, 4, 4, 0]}
          maxBarSize={24}
          label={({ x, y, width, height, value, index }) => {
            const item = data[index];
            return (
              <text
                x={x + width + 4}
                y={y + height / 2}
                fill="hsl(var(--foreground))"
                fontSize={10}
                dominantBaseline="middle"
              >
                {value} ({item.percentage.toFixed(0)}%)
              </text>
            );
          }}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CampaignTrackingChart({ 
  data, 
  snapshotData,
  allStages, 
  loading, 
  snapshotLoading,
  viewMode = 'period',
  pipelineId,
}: CampaignTrackingChartProps) {
  const [activeLevel, setActiveLevel] = useState<TrackingLevel>('campaign');
  const [activeStage, setActiveStage] = useState<string>('total');

  // Select the appropriate data source based on view mode
  const activeData = viewMode === 'snapshot' ? snapshotData : data;
  const isLoading = viewMode === 'snapshot' ? snapshotLoading : loading;

  const getDataForLevel = (level: TrackingLevel) => {
    if (!activeData) return {};
    switch (level) {
      case 'campaign': return activeData.by_campaign || {};
      case 'adset': return activeData.by_adset || {};
      case 'creative': return activeData.by_creative || {};
    }
  };

  const chartData = useMemo(() => {
    const levelData = getDataForLevel(activeLevel);
    if (!levelData) return [];

    const entries = Object.entries(levelData);
    if (entries.length === 0) return [];

    // Filter by stage if needed
    let filteredEntries: Array<[string, { total: number; by_stage: Record<number, number> }]>;
    
    if (activeStage === 'total') {
      filteredEntries = entries;
    } else {
      const stageId = Number(activeStage);
      filteredEntries = entries
        .map(([name, data]) => [name, { 
          ...data, 
          total: data.by_stage[stageId] || 0 
        }] as [string, { total: number; by_stage: Record<number, number> }])
        .filter(([, data]) => data.total > 0);
    }

    // Sort by total and take top 10
    const sorted = filteredEntries
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    const totalCount = sorted.reduce((sum, [, data]) => sum + data.total, 0);

    return sorted.map(([name, itemData], index) => ({
      name: name.length > 30 ? name.substring(0, 30) + '...' : name,
      fullName: name,
      count: itemData.total,
      percentage: totalCount > 0 ? (itemData.total / totalCount) * 100 : 0,
      fill: COLORS[index % COLORS.length]
    }));
  }, [activeData, activeLevel, activeStage]);

  const totalDeals = useMemo(() => {
    const levelData = getDataForLevel(activeLevel);
    if (!levelData) return 0;
    return Object.values(levelData).reduce((sum, item) => sum + item.total, 0);
  }, [activeData, activeLevel]);

  const stagesWithData = useMemo(() => {
    if (!allStages) return [];
    const levelData = getDataForLevel(activeLevel);
    if (!levelData) return [];

    // Find which stages have data
    const stagesSet = new Set<number>();
    Object.values(levelData).forEach(item => {
      Object.keys(item.by_stage).forEach(stageId => {
        if (item.by_stage[Number(stageId)] > 0) {
          stagesSet.add(Number(stageId));
        }
      });
    });

    return allStages.filter(stage => stagesSet.has(stage.id));
  }, [allStages, activeData, activeLevel]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!activeData || !activeData.field_key) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Campo "Origem - Campanha / Conjunto / Criativo" não encontrado no Pipedrive.
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
        <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Rastreamento de Campanhas
            <span className="text-xs text-muted-foreground font-normal">
              ({viewMode === 'snapshot' ? 'Cenário Atual' : 'Fluxo do Período'})
            </span>
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {totalDeals} negócio{totalDeals !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Level tabs (Campanha / Conjunto / Criativo) */}
        <Tabs value={activeLevel} onValueChange={(v) => setActiveLevel(v as TrackingLevel)} className="mb-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="campaign" className="text-xs">
              Campanha
            </TabsTrigger>
            <TabsTrigger value="adset" className="text-xs">
              Conjunto
            </TabsTrigger>
            <TabsTrigger value="creative" className="text-xs">
              Criativo
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Stage filter tabs */}
        <Tabs value={activeStage} onValueChange={setActiveStage}>
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

          <TabsContent value={activeStage} className="mt-0">
            <TrackingBarChart data={chartData} height={Math.max(200, chartData.length * 32)} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
