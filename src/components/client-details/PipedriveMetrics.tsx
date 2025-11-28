import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, DollarSign, Target, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PipedriveMetricsProps {
  clientId: string;
}

interface PipedriveStats {
  totalDeals: number;
  wonDeals: number;
  pipelineValue: number;
  conversionRate: number;
}

export const PipedriveMetrics = ({ clientId }: PipedriveMetricsProps) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PipedriveStats | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPipedriveData = async () => {
      try {
        setLoading(true);

        // Verificar se tem integração do Pipedrive configurada
        const { data: integration } = await supabase
          .from("crm_integrations")
          .select("*")
          .eq("client_id", clientId)
          .eq("crm_type", "pipedrive")
          .eq("is_active", true)
          .single();

        if (!integration) {
          setLoading(false);
          return;
        }

        // Buscar dados de deals do Pipedrive
        const { data, error } = await supabase.functions.invoke("pipedrive-data", {
          body: {
            client_id: clientId,
            endpoint: "deals",
          },
        });

        if (error) throw error;

        // Processar dados
        const deals = data?.data || [];
        const totalDeals = deals.length;
        const wonDeals = deals.filter((deal: any) => deal.status === "won").length;
        const pipelineValue = deals.reduce((sum: number, deal: any) => sum + (deal.value || 0), 0);
        const conversionRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;

        setStats({
          totalDeals,
          wonDeals,
          pipelineValue,
          conversionRate,
        });
      } catch (error) {
        console.error("Erro ao buscar dados do Pipedrive:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as métricas do Pipedrive.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPipedriveData();
  }, [clientId, toast]);

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

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Target className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Integração do Pipedrive não configurada para este cliente.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Deals</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalDeals}</div>
          <p className="text-xs text-muted-foreground">Negociações no pipeline</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Deals Ganhos</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.wonDeals}</div>
          <p className="text-xs text-muted-foreground">Negociações fechadas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor do Pipeline</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(stats.pipelineValue)}
          </div>
          <p className="text-xs text-muted-foreground">Valor total em negociação</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">Deals ganhos / total</p>
        </CardContent>
      </Card>
    </div>
  );
};
