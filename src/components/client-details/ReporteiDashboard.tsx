import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, Eye, Heart, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ReporteiDashboardProps {
  companyId?: string;
  reportId?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: string;
  icon: React.ReactNode;
}

const MetricCard = ({ title, value, trend, icon }: MetricCardProps) => (
  <Card className="border-primary/20">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="text-primary">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {trend && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
          <TrendingUp className="h-3 w-3 text-green-500" />
          {trend}
        </p>
      )}
    </CardContent>
  </Card>
);

export function ReporteiDashboard({ companyId, reportId }: ReporteiDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");
  const [metrics, setMetrics] = useState({
    followers: 0,
    reach: 0,
    engagement: 0,
    likes: 0,
    comments: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchReportData();
  }, [reportId, period]);

  const fetchReportData = async () => {
    if (!reportId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reportei-data', {
        body: { 
          action: 'getReportData',
          reportId: reportId 
        }
      });

      if (error) throw error;

      // Processar dados da API do Reportei
      // Isso é um exemplo - ajuste conforme a estrutura real da resposta
      setMetrics({
        followers: data?.metrics?.followers || 0,
        reach: data?.metrics?.reach || 0,
        engagement: data?.metrics?.engagement || 0,
        likes: data?.metrics?.likes || 0,
        comments: data?.metrics?.comments || 0,
      });

      // Dados de exemplo para o gráfico
      setChartData([
        { name: 'Seg', seguidores: 4200, engajamento: 240 },
        { name: 'Ter', seguidores: 4350, engajamento: 300 },
        { name: 'Qua', seguidores: 4500, engajamento: 280 },
        { name: 'Qui', seguidores: 4680, engajamento: 320 },
        { name: 'Sex', seguidores: 4820, engajamento: 350 },
        { name: 'Sáb', seguidores: 5000, engajamento: 290 },
        { name: 'Dom', seguidores: 5100, engajamento: 270 },
      ]);
    } catch (error) {
      console.error('Erro ao buscar dados do Reportei:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro de Período */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Dashboard de Métricas</h3>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Seguidores"
          value={metrics.followers.toLocaleString()}
          trend="+12.5% este mês"
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Alcance"
          value={metrics.reach.toLocaleString()}
          trend="+8.2% este mês"
          icon={<Eye className="h-4 w-4" />}
        />
        <MetricCard
          title="Engajamento"
          value={`${metrics.engagement}%`}
          trend="+3.1% este mês"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricCard
          title="Curtidas"
          value={metrics.likes.toLocaleString()}
          trend="+15.3% este mês"
          icon={<Heart className="h-4 w-4" />}
        />
        <MetricCard
          title="Comentários"
          value={metrics.comments.toLocaleString()}
          trend="+5.7% este mês"
          icon={<MessageCircle className="h-4 w-4" />}
        />
      </div>

      {/* Gráfico de Evolução */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>Evolução de Seguidores e Engajamento</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" />
              <YAxis yAxisId="right" orientation="right" className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="seguidores" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Seguidores"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="engajamento" 
                stroke="hsl(var(--accent))" 
                strokeWidth={2}
                name="Engajamento"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Barras - Métricas por Canal */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>Desempenho por Canal</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { canal: 'Instagram', alcance: 12500, engajamento: 850 },
              { canal: 'Facebook', alcance: 8200, engajamento: 420 },
              { canal: 'LinkedIn', alcance: 5600, engajamento: 320 },
              { canal: 'Google Ads', alcance: 15000, engajamento: 1200 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="canal" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="alcance" fill="hsl(var(--primary))" name="Alcance" />
              <Bar dataKey="engajamento" fill="hsl(var(--accent))" name="Engajamento" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
