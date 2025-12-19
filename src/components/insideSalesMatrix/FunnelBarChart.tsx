import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StageImpact } from "@/lib/insideSalesMatrix/impact";

interface FunnelBarChartProps {
  impacts: StageImpact[];
}

const statusColors = {
  ok: "#22c55e",
  atencao: "#eab308",
  critico: "#ef4444",
  sem_dados: "#94a3b8",
  baixa_amostra: "#a855f7",
};

export function FunnelBarChart({ impacts }: FunnelBarChartProps) {
  const data = useMemo(() => {
    return impacts.map(impact => ({
      name: impact.stageName.replace(' → ', '\n→ '),
      shortName: impact.stageName.split(' → ')[1] || impact.stageName,
      atual: impact.current.rate ?? 0,
      meta: impact.target.rate,
      status: impact.status,
      gap: impact.gapPp,
    }));
  }, [impacts]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Metas do Funil</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              barGap={2}
              barCategoryGap="20%"
            >
              <XAxis 
                type="number" 
                domain={[0, 'auto']}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                dataKey="shortName" 
                type="category" 
                width={80}
                tick={{ fontSize: 11 }}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(1)}%`]}
                labelFormatter={(label) => `Etapa: ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
              />
              <Bar 
                dataKey="atual" 
                name="Atual" 
                radius={[0, 4, 4, 0]}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`atual-${index}`} 
                    fill={statusColors[entry.status]} 
                  />
                ))}
              </Bar>
              <Bar 
                dataKey="meta" 
                name="Meta" 
                fill="hsl(var(--muted-foreground))"
                opacity={0.3}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend for status colors */}
        <div className="flex flex-wrap gap-3 mt-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-muted-foreground">OK</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="text-muted-foreground">Atenção</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Crítico</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-muted-foreground">Baixa amostra</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
