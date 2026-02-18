import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MetaInsightRow } from "./useMetaAdsByService";

type Metric = 'spend' | 'leads' | 'clicks' | 'link_clicks' | 'landing_page_views' | 'impressions';

const METRICS: { key: Metric; label: string; color: string; format: (v: number) => string }[] = [
  { key: 'spend', label: 'Investimento', color: 'hsl(var(--primary))', format: v => `R$ ${v.toFixed(2)}` },
  { key: 'leads', label: 'Leads', color: '#22c55e', format: v => String(Math.round(v)) },
  { key: 'clicks', label: 'Cliques', color: '#f59e0b', format: v => String(Math.round(v)) },
  { key: 'link_clicks', label: 'Cliques Link', color: '#ec4899', format: v => String(Math.round(v)) },
  { key: 'landing_page_views', label: 'Views LP', color: '#8b5cf6', format: v => String(Math.round(v)) },
  { key: 'impressions', label: 'Impressões', color: '#6366f1', format: v => v.toLocaleString('pt-BR') },
];

interface Props {
  rows: MetaInsightRow[];
  loading: boolean;
}

export function MetaServiceTrendChart({ rows, loading }: Props) {
  const [activeMetric, setActiveMetric] = useState<Metric>('spend');
  const metric = METRICS.find(m => m.key === activeMetric)!;

  const chartData = rows.map(r => ({
    date: r.date,
    value: r[activeMetric] ?? 0,
    label: format(parseISO(r.date), 'dd/MM', { locale: ptBR }),
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Evolução Diária</CardTitle>
          <div className="flex gap-1 flex-wrap">
            {METRICS.map(m => (
              <Button
                key={m.key}
                variant={activeMetric === m.key ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setActiveMetric(m.key)}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : rows.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            Sem dados no período — sincronize para carregar os dados
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false} axisLine={false} width={60}
                tickFormatter={v => metric.format(v)}
              />
              <Tooltip
                formatter={(v: number) => [metric.format(v), metric.label]}
                labelFormatter={l => `Data: ${l}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone" dataKey="value"
                stroke={metric.color} strokeWidth={2}
                dot={{ r: 3, fill: metric.color }} activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
