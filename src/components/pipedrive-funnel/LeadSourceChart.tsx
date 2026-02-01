import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { LeadSourceData, LeadSource, StageInfo } from './types';

interface LeadSourceChartProps {
  data?: LeadSourceData | null;
  allStages?: StageInfo[];
  loading?: boolean;
}

// Fixed colors for each source type
const SOURCE_COLORS: Record<LeadSource, string> = {
  'Landing Page': 'hsl(217 91% 60%)',      // Blue - Marketing Digital
  'Base Sétima': 'hsl(271 91% 65%)',        // Purple - Relacionamento
  'Lead Nativo': 'hsl(142 71% 45%)',        // Green - Campanhas Nativas
};

const SOURCE_ORDER: LeadSource[] = ['Lead Nativo', 'Landing Page', 'Base Sétima'];

interface ChartDataItem {
  source: LeadSource;
  count: number;
  percentage: number;
  fill: string;
}

function SourceBarChart({ data, height = 150 }: { data: ChartDataItem[]; height?: number }) {
  if (data.length === 0 || data.every(d => d.count === 0)) {
    return (
      <div className="flex items-center justify-center h-[150px] text-muted-foreground text-sm">
        Sem dados nesta etapa
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart 
        data={data} 
        layout="vertical" 
        margin={{ top: 0, right: 70, left: 0, bottom: 0 }}
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
          dataKey="source" 
          tick={{ fontSize: 11, fontWeight: 500 }} 
          width={100}
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
          formatter={(value: number, _name: string, props: { payload?: ChartDataItem }) => [
            `${value} lead${value !== 1 ? 's' : ''} (${props.payload?.percentage?.toFixed(1) || 0}%)`,
            props.payload?.source || 'Origem'
          ]}
        />
        <Bar 
          dataKey="count" 
          radius={[0, 4, 4, 0]}
          maxBarSize={28}
          label={({ x, y, width, height, value, index }) => {
            const item = data[index];
            return (
              <text
                x={x + width + 4}
                y={y + height / 2}
                fill="hsl(var(--foreground))"
                fontSize={11}
                fontWeight={500}
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

export function LeadSourceChart({ data, allStages, loading }: LeadSourceChartProps) {
  const [activeTab, setActiveTab] = useState<string>('total');

  const totalChartData = useMemo(() => {
    if (!data?.by_source) return [];
    
    const totalCount = Object.values(data.by_source).reduce((sum, s) => sum + s.total, 0);
    
    return SOURCE_ORDER.map(source => ({
      source,
      count: data.by_source[source]?.total || 0,
      percentage: totalCount > 0 ? ((data.by_source[source]?.total || 0) / totalCount) * 100 : 0,
      fill: SOURCE_COLORS[source]
    })).filter(item => item.count > 0);
  }, [data]);

  const stageChartData = useMemo(() => {
    if (!data?.by_source || !allStages) return {};
    
    const result: Record<number, ChartDataItem[]> = {};
    
    allStages.forEach(stage => {
      const stageTotal = SOURCE_ORDER.reduce((sum, source) => {
        return sum + (data.by_source[source]?.by_stage[stage.id] || 0);
      }, 0);
      
      if (stageTotal > 0) {
        result[stage.id] = SOURCE_ORDER.map(source => ({
          source,
          count: data.by_source[source]?.by_stage[stage.id] || 0,
          percentage: stageTotal > 0 ? ((data.by_source[source]?.by_stage[stage.id] || 0) / stageTotal) * 100 : 0,
          fill: SOURCE_COLORS[source]
        })).filter(item => item.count > 0);
      }
    });
    
    return result;
  }, [data, allStages]);

  const totalLeads = useMemo(() => {
    if (!data?.by_source) return 0;
    return Object.values(data.by_source).reduce((sum, s) => sum + s.total, 0);
  }, [data]);

  const stagesWithData = useMemo(() => {
    if (!allStages || !data?.by_source) return [];
    return allStages.filter(stage => {
      const stageTotal = SOURCE_ORDER.reduce((sum, source) => {
        return sum + (data.by_source[source]?.by_stage[stage.id] || 0);
      }, 0);
      return stageTotal > 0;
    });
  }, [allStages, data]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[150px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || totalLeads === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
          <Users className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Sem dados de origem no período.
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
            <Users className="h-4 w-4 text-primary" />
            Origem dos Leads
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {totalLeads} lead{totalLeads !== 1 ? 's' : ''} no período
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
            <SourceBarChart data={totalChartData} />
          </TabsContent>

          {stagesWithData.map(stage => (
            <TabsContent key={stage.id} value={String(stage.id)} className="mt-0">
              <SourceBarChart data={stageChartData[stage.id] || []} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
