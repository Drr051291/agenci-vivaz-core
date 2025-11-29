import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  BarChart3, 
  Users, 
  Building2, 
  Activity,
  RefreshCw
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface PipedriveDashboardViewProps {
  clientId: string;
}

interface MetricData {
  id: string;
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  color?: string;
}

export function PipedriveDashboardView({ clientId }: PipedriveDashboardViewProps) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardConfig();
  }, [clientId]);

  useEffect(() => {
    if (selectedMetrics.length > 0) {
      fetchMetricsData();
    }
  }, [selectedMetrics, clientId]);

  const loadDashboardConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("client_dashboards")
        .select("config")
        .eq("client_id", clientId)
        .eq("dashboard_type", "pipedrive")
        .eq("is_active", true)
        .maybeSingle();

      if (data && !error) {
        const config = data.config as any;
        setSelectedMetrics(config?.selected_metrics || ["deals"]);
      } else {
        setSelectedMetrics(["deals"]);
      }
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
      setSelectedMetrics(["deals"]);
    }
  };

  const fetchMetricsData = async () => {
    try {
      setLoading(true);
      const metricsData: MetricData[] = [];

      // Verificar se tem integração ativa
      const { data: integration } = await supabase
        .from("crm_integrations")
        .select("*")
        .eq("client_id", clientId)
        .eq("crm_type", "pipedrive")
        .eq("is_active", true)
        .maybeSingle();

      if (!integration) {
        setMetrics([]);
        setLoading(false);
        return;
      }

      // Buscar dados para cada métrica selecionada
      for (const metricType of selectedMetrics) {
        try {
          const { data, error } = await supabase.functions.invoke("pipedrive-data", {
            body: {
              client_id: clientId,
              endpoint: metricType,
            },
          });

          if (error) throw error;

          const processedMetrics = processMetricData(metricType, data?.data || []);
          metricsData.push(...processedMetrics);
        } catch (error) {
          console.error(`Erro ao buscar ${metricType}:`, error);
        }
      }

      setMetrics(metricsData);
    } catch (error) {
      console.error("Erro ao buscar métricas:", error);
      toast.error("Erro ao carregar métricas do Pipedrive");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const processMetricData = (type: string, data: any[]): MetricData[] => {
    const metrics: MetricData[] = [];

    switch (type) {
      case "deals":
        const totalDeals = data.length;
        const wonDeals = data.filter((d: any) => d.status === "won").length;
        const pipelineValue = data.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
        const conversionRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;

        metrics.push(
          {
            id: "deals-total",
            title: "Total de Negócios",
            value: totalDeals,
            subtitle: "Deals no pipeline",
            icon: Target,
          },
          {
            id: "deals-won",
            title: "Negócios Ganhos",
            value: wonDeals,
            subtitle: "Deals fechados",
            icon: TrendingUp,
            color: "text-green-600",
          },
          {
            id: "deals-value",
            title: "Valor do Pipeline",
            value: new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(pipelineValue),
            subtitle: "Valor total em negociação",
            icon: DollarSign,
          },
          {
            id: "deals-conversion",
            title: "Taxa de Conversão",
            value: `${conversionRate.toFixed(1)}%`,
            subtitle: "Deals ganhos / total",
            icon: BarChart3,
          }
        );
        break;

      case "pipelines":
        metrics.push({
          id: "pipelines-total",
          title: "Funis de Vendas",
          value: data.length,
          subtitle: "Pipelines configurados",
          icon: BarChart3,
        });
        break;

      case "activities":
        metrics.push({
          id: "activities-total",
          title: "Atividades",
          value: data.length,
          subtitle: "Total de atividades",
          icon: Activity,
        });
        break;

      case "persons":
        metrics.push({
          id: "persons-total",
          title: "Pessoas",
          value: data.length,
          subtitle: "Contatos cadastrados",
          icon: Users,
        });
        break;

      case "organizations":
        metrics.push({
          id: "organizations-total",
          title: "Organizações",
          value: data.length,
          subtitle: "Empresas cadastradas",
          icon: Building2,
        });
        break;
    }

    return metrics;
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMetricsData();
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Target className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center mb-4">
            Nenhuma métrica configurada ou integração do Pipedrive não ativa.
          </p>
          <p className="text-sm text-muted-foreground text-center">
            Configure as métricas na seção "Construtor de Dashboard" abaixo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Métricas do Pipedrive</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                <Icon className={`h-4 w-4 ${metric.color || "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${metric.color || ""}`}>
                  {metric.value}
                </div>
                <p className="text-xs text-muted-foreground">{metric.subtitle}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
