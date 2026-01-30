import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface LostReasonsChartProps {
  lostReasons?: Record<string, number>;
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

export function LostReasonsChart({ lostReasons, loading }: LostReasonsChartProps) {
  const chartData = useMemo(() => {
    if (!lostReasons) return [];
    
    return Object.entries(lostReasons)
      .slice(0, 6) // Show top 6 reasons
      .map(([reason, count], index) => ({
        reason: reason.length > 25 ? reason.substring(0, 25) + '...' : reason,
        fullReason: reason,
        count,
        fill: COLORS[index % COLORS.length]
      }));
  }, [lostReasons]);

  const totalLost = useMemo(() => {
    if (!lostReasons) return 0;
    return Object.values(lostReasons).reduce((a, b) => a + b, 0);
  }, [lostReasons]);

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
        <ResponsiveContainer width="100%" height={200}>
          <BarChart 
            data={chartData} 
            layout="vertical" 
            margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
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
              formatter={(value: number, _name: string, props: { payload?: { fullReason?: string } }) => [
                `${value} deal${value !== 1 ? 's' : ''}`,
                props.payload?.fullReason || 'Motivo'
              ]}
            />
            <Bar 
              dataKey="count" 
              radius={[0, 4, 4, 0]}
              maxBarSize={24}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
