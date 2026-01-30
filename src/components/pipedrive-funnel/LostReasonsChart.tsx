import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { LostReasonsData, StageInfo } from './types';

interface LostReasonsChartProps {
  lostReasons?: LostReasonsData;
  allStages?: StageInfo[];
  loading?: boolean;
}

const COLORS = [
  'hsl(var(--destructive))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--muted-foreground))',
];

function ReasonBarChart({ data, height = 200 }: { data: Array<{ reason: string; fullReason: string; count: number; percentage: number; fill: string }>; height?: number }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        Sem perdas nesta etapa
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
          dataKey="reason" 
          tick={{ fontSize: 10 }} 
          width={120}
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
          formatter={(value: number, _name: string, props: { payload?: { fullReason?: string; percentage?: number } }) => [
            `${value} deal${value !== 1 ? 's' : ''} (${props.payload?.percentage?.toFixed(1) || 0}%)`,
            props.payload?.fullReason || 'Motivo'
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

export function LostReasonsChart({ lostReasons, allStages, loading }: LostReasonsChartProps) {
  const [activeTab, setActiveTab] = useState<string>('total');

  // Merge similar reasons into one
  const mergeReasons = (reasons: Record<string, number>): Record<string, number> => {
    const merged: Record<string, number> = {};
    
    // Normalize reason to check for similar patterns
    const normalizeReason = (reason: string): string => {
      const lower = reason.toLowerCase();
      if (lower.includes('fora do icp') || 
          (lower.includes('desqualificado') && lower.includes('brandspot'))) {
        return 'Fora do ICP';
      }
      if (lower.includes('sem contato')) {
        return 'Sem contato';
      }
      return reason;
    };
    
    Object.entries(reasons).forEach(([reason, count]) => {
      const normalizedReason = normalizeReason(reason);
      merged[normalizedReason] = (merged[normalizedReason] || 0) + count;
    });
    
    return merged;
  };

  const totalChartData = useMemo(() => {
    if (!lostReasons?.total) return [];
    
    const mergedReasons = mergeReasons(lostReasons.total);
    const entries = Object.entries(mergedReasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const totalCount = entries.reduce((sum, [, count]) => sum + count, 0);
    
    return entries.map(([reason, count], index) => ({
      reason: reason.length > 25 ? reason.substring(0, 25) + '...' : reason,
      fullReason: reason,
      count,
      percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
      fill: COLORS[index % COLORS.length]
    }));
  }, [lostReasons]);

  const stageChartData = useMemo(() => {
    if (!lostReasons?.by_stage || !allStages) return {};
    
    const result: Record<number, Array<{ reason: string; fullReason: string; count: number; percentage: number; fill: string }>> = {};
    
    Object.entries(lostReasons.by_stage).forEach(([stageIdStr, reasons]) => {
      const stageId = Number(stageIdStr);
      const mergedReasons = mergeReasons(reasons);
      const entries = Object.entries(mergedReasons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
      const stageTotal = entries.reduce((sum, [, count]) => sum + count, 0);
      
      result[stageId] = entries.map(([reason, count], index) => ({
        reason: reason.length > 25 ? reason.substring(0, 25) + '...' : reason,
        fullReason: reason,
        count,
        percentage: stageTotal > 0 ? (count / stageTotal) * 100 : 0,
        fill: COLORS[index % COLORS.length]
      }));
    });
    
    return result;
  }, [lostReasons, allStages]);

  const totalLost = useMemo(() => {
    if (!lostReasons?.total) return 0;
    return Object.values(lostReasons.total).reduce((a, b) => a + b, 0);
  }, [lostReasons]);

  const stagesWithLosses = useMemo(() => {
    if (!allStages || !lostReasons?.by_stage) return [];
    return allStages.filter(stage => 
      lostReasons.by_stage[stage.id] && 
      Object.keys(lostReasons.by_stage[stage.id]).length > 0
    );
  }, [allStages, lostReasons]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!lostReasons || totalLost === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Sem deals perdidos no período.
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
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Motivos de Perda
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {totalLost} deal{totalLost !== 1 ? 's' : ''} perdido{totalLost !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 w-full flex-wrap h-auto gap-1">
            <TabsTrigger value="total" className="text-xs">
              Total
            </TabsTrigger>
            {stagesWithLosses.map(stage => (
              <TabsTrigger key={stage.id} value={String(stage.id)} className="text-xs">
                {stage.name.split(' ')[0].split('(')[0]}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="total" className="mt-0">
            <ReasonBarChart data={totalChartData} />
          </TabsContent>

          {stagesWithLosses.map(stage => (
            <TabsContent key={stage.id} value={String(stage.id)} className="mt-0">
              <ReasonBarChart data={stageChartData[stage.id] || []} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
