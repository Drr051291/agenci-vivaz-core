import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, AlertCircle, Megaphone, Layers, Film } from 'lucide-react';
import { CampaignTrackingData, CampaignTrackingItem, StageInfo, ViewMode } from './types';
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

interface RankedItem {
  name: string;
  count: number;
  percentage: number;
}

const DIMENSION_CONFIG = [
  { key: 'by_campaign' as const, label: 'Campanha', icon: Megaphone, color: 'bg-primary' },
  { key: 'by_adset' as const, label: 'Conjunto', icon: Layers, color: 'bg-purple-500' },
  { key: 'by_creative' as const, label: 'Anúncio', icon: Film, color: 'bg-emerald-500' },
];

function RankedList({ items, color }: { items: RankedItem[]; color: string }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-muted-foreground text-xs bg-muted/30 rounded-lg">
        Sem dados
      </div>
    );
  }

  const maxCount = items[0]?.count || 1;

  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="truncate font-medium max-w-[60%]" title={item.name}>
              {item.name}
            </span>
            <span className="text-muted-foreground shrink-0 ml-2">
              {item.count} ({item.percentage.toFixed(0)}%)
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-muted/40">
            <div
              className={cn('h-full rounded-full transition-all duration-500', color)}
              style={{ width: `${Math.max((item.count / maxCount) * 100, 3)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DimensionColumn({
  label,
  icon: Icon,
  items,
  color,
}: {
  label: string;
  icon: React.ElementType;
  items: RankedItem[];
  color: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <RankedList items={items} color={color} />
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

  const rankDimension = (
    raw: Record<string, CampaignTrackingItem> | undefined
  ): RankedItem[] => {
    if (!raw) return [];

    let entries: Array<{ name: string; count: number }>;

    if (activeStage === 'total') {
      entries = Object.entries(raw).map(([name, d]) => ({ name, count: d.total }));
    } else {
      const sid = Number(activeStage);
      entries = Object.entries(raw)
        .map(([name, d]) => ({ name, count: d.by_stage[sid] || 0 }))
        .filter(e => e.count > 0);
    }

    // Sort: "Não informado" last, then by count desc
    entries.sort((a, b) => {
      const aEmpty = !a.name || a.name === 'Não informado';
      const bEmpty = !b.name || b.name === 'Não informado';
      if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
      return b.count - a.count;
    });

    const top = entries.slice(0, 10);
    const total = top.reduce((s, e) => s + e.count, 0);

    return top.map(e => ({
      name: e.name || 'Não informado',
      count: e.count,
      percentage: total > 0 ? (e.count / total) * 100 : 0,
    }));
  };

  const ranked = useMemo(
    () => DIMENSION_CONFIG.map(d => ({ ...d, items: rankDimension(activeData?.[d.key]) })),
    [activeData, activeStage]
  );

  const totalDeals = useMemo(() => {
    if (!activeData?.by_campaign) return 0;
    return Object.values(activeData.by_campaign).reduce((s, i) => s + i.total, 0);
  }, [activeData]);

  const stagesWithData = useMemo(() => {
    if (!allStages || !activeData) return [];
    const ids = new Set<number>();
    for (const dim of DIMENSION_CONFIG) {
      const obj = activeData[dim.key];
      if (!obj) continue;
      for (const item of Object.values(obj)) {
        for (const [sid, cnt] of Object.entries(item.by_stage)) {
          if (cnt > 0) ids.add(Number(sid));
        }
      }
    }
    return allStages.filter(s => ids.has(s.id));
  }, [allStages, activeData]);

  const hasFields = activeData?.field_keys?.campaign || activeData?.field_keys?.adset || activeData?.field_keys?.creative;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2"><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full mb-4" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-[200px]" />
            <Skeleton className="h-[200px]" />
            <Skeleton className="h-[200px]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activeData || !hasFields) {
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
          <span className="text-xs text-muted-foreground">
            {totalDeals} negócio{totalDeals !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeStage} onValueChange={setActiveStage} className="mb-4">
          <TabsList className="w-full flex-wrap h-auto gap-1">
            <TabsTrigger value="total" className="text-xs">Todas</TabsTrigger>
            {stagesWithData.map(s => (
              <TabsTrigger key={s.id} value={String(s.id)} className="text-xs">
                {s.name.split(' ')[0].split('(')[0]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid gap-6 md:grid-cols-3">
          {ranked.map(d => (
            <DimensionColumn
              key={d.key}
              label={d.label}
              icon={d.icon}
              items={d.items}
              color={d.color}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
