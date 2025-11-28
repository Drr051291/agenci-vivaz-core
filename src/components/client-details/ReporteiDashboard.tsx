import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, TrendingUp, Heart, MessageCircle, Eye, DollarSign, MousePointer, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ReporteiMetricCard } from "./ReporteiMetricCard";
import { ReporteiChannelTabs } from "./ReporteiChannelTabs";
import { toast } from "sonner";

interface ReporteiDashboardProps {
  dashboardId: string;
  config?: any;
  onConfigure: () => void;
}

export const ReporteiDashboard = ({ dashboardId, config, onConfigure }: ReporteiDashboardProps) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState("30");
  const [channels, setChannels] = useState<any[]>([]);
  const [metricsData, setMetricsData] = useState<any>({});
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (config?.reportei_client_id && config?.selected_channel && config?.selected_metrics?.length > 0) {
      fetchDashboardData();
    }
  }, [config, period]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Buscar todas as métricas do canal selecionado
      const { data: widgetsData, error } = await supabase.functions.invoke('reportei-data', {
        body: { 
          action: 'getWidgets',
          integrationId: config.selected_channel
        }
      });

      if (error) throw error;

      // Filtrar apenas as métricas selecionadas
      const allWidgets = widgetsData?.data || [];
      const selectedWidgets = allWidgets.filter((widget: any) => 
        config.selected_metrics.includes(String(widget.id))
      );

      setChannels([config.channel_info]);
      setMetricsData({ [config.selected_channel]: selectedWidgets });

      // Dados de exemplo para gráficos (será substituído por dados reais)
      setChartData([
        { name: "Sem 1", valor: 120000, engajamento: 7800 },
        { name: "Sem 2", valor: 122000, engajamento: 8200 },
        { name: "Sem 3", valor: 123500, engajamento: 8500 },
        { name: "Sem 4", valor: 125400, engajamento: 8900 }
      ]);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      if (error?.message?.includes('429') || error?.message?.includes('Too many requests')) {
        toast.error('Limite de requisições atingido. Aguarde alguns segundos e tente novamente.');
      } else {
        toast.error('Erro ao carregar dados do dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast.success('Dados atualizados!');
  };

  if (!config?.reportei_client_id || !config?.selected_channel || !config?.selected_metrics?.length) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-semibold mb-2">Dashboard não configurado</h3>
        <p className="text-muted-foreground mb-4">
          Configure o dashboard para começar a visualizar suas métricas do Reportei
        </p>
        <Button onClick={onConfigure}>Configurar Dashboard</Button>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const getMetricIcon = (metricType?: string) => {
    if (!metricType) return TrendingUp;
    
    const normalizedType = metricType.toLowerCase();
    switch (normalizedType) {
      case 'followers':
      case 'seguidores':
        return Users;
      case 'impressions':
      case 'impressões':
        return Eye;
      case 'engagement':
      case 'engajamento':
        return TrendingUp;
      case 'likes':
      case 'curtidas':
        return Heart;
      case 'comments':
      case 'comentários':
        return MessageCircle;
      case 'clicks':
      case 'cliques':
        return MousePointer;
      case 'spend':
      case 'investimento':
        return DollarSign;
      default:
        return TrendingUp;
    }
  };

  const renderChannelMetrics = (channel: any) => {
    const channelMetrics = metricsData[config.selected_channel] || [];

    if (channelMetrics.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma métrica disponível
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {channelMetrics.map((metric: any, index: number) => {
            const Icon = getMetricIcon(metric?.references?.title || metric?.reference_key);
            return (
              <ReporteiMetricCard
                key={metric?.id || index}
                title={metric?.references?.title || metric?.reference_key || "Métrica"}
                value={metric?.value || "0"}
                trend={Math.random() * 20 - 5}
                icon={Icon}
              />
            );
          })}
        </div>

        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4">Evolução - {config.channel_info?.name}</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-muted-foreground" />
              <YAxis className="text-muted-foreground" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2} name="Métrica Principal" />
              <Line type="monotone" dataKey="engajamento" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Engajamento" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Dashboard Reportei</h3>
          <p className="text-sm text-muted-foreground">
            {config.channel_info?.name} - {config.channel_info?.account}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" onClick={onConfigure}>
            Reconfigurar
          </Button>
        </div>
      </div>

      <ReporteiChannelTabs channels={channels}>
        {(channel) => renderChannelMetrics(channel)}
      </ReporteiChannelTabs>
    </div>
  );
};
