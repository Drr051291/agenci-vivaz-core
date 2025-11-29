import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, BarChart3, TrendingUp, Users, Building2, Activity } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface PipedriveDashboardBuilderProps {
  clientId: string;
  onSave?: () => void;
}

interface MetricConfig {
  id: string;
  label: string;
  description: string;
  icon: any;
  endpoint: string;
}

const AVAILABLE_METRICS: MetricConfig[] = [
  {
    id: "deals",
    label: "Negócios (Deals)",
    description: "Total de negócios, valor do pipeline, taxa de conversão",
    icon: TrendingUp,
    endpoint: "deals",
  },
  {
    id: "pipelines",
    label: "Funis de Vendas",
    description: "Análise de funis, estágios e progressão",
    icon: BarChart3,
    endpoint: "pipelines",
  },
  {
    id: "activities",
    label: "Atividades",
    description: "Tarefas, reuniões, ligações e emails",
    icon: Activity,
    endpoint: "activities",
  },
  {
    id: "persons",
    label: "Pessoas",
    description: "Contatos e leads cadastrados",
    icon: Users,
    endpoint: "persons",
  },
  {
    id: "organizations",
    label: "Organizações",
    description: "Empresas e contas cadastradas",
    icon: Building2,
    endpoint: "organizations",
  },
];

export function PipedriveDashboardBuilder({ clientId, onSave }: PipedriveDashboardBuilderProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["deals"]);
  const [loading, setLoading] = useState(false);
  const [dashboardId, setDashboardId] = useState<string | null>(null);

  useEffect(() => {
    loadExistingConfig();
  }, [clientId]);

  const loadExistingConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("client_dashboards")
        .select("*")
        .eq("client_id", clientId)
        .eq("dashboard_type", "pipedrive")
        .eq("is_active", true)
        .maybeSingle();

      if (data && !error) {
        setDashboardId(data.id);
        const config = data.config as any;
        // Garantir que selected_metrics é sempre um array
        if (config?.selected_metrics && Array.isArray(config.selected_metrics)) {
          setSelectedMetrics(config.selected_metrics);
        } else {
          // Se não for array, usar valor padrão
          setSelectedMetrics(["deals"]);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configuração:", error);
      setSelectedMetrics(["deals"]);
    }
  };

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricId)
        ? prev.filter((id) => id !== metricId)
        : [...prev, metricId]
    );
  };

  const handleSave = async () => {
    if (selectedMetrics.length === 0) {
      toast.error("Selecione pelo menos uma métrica");
      return;
    }

    setLoading(true);
    try {
      const config = {
        selected_metrics: selectedMetrics,
        updated_at: new Date().toISOString(),
      };

      if (dashboardId) {
        // Atualizar dashboard existente
        const { error } = await supabase
          .from("client_dashboards")
          .update({
            config,
            updated_at: new Date().toISOString(),
          })
          .eq("id", dashboardId);

        if (error) throw error;
      } else {
        // Criar novo dashboard
        const { data, error } = await supabase
          .from("client_dashboards")
          .insert({
            client_id: clientId,
            name: "Dashboard Pipedrive - Personalizado",
            dashboard_type: "pipedrive",
            is_active: true,
            config,
          })
          .select()
          .single();

        if (error) throw error;
        setDashboardId(data.id);
      }

      toast.success("Configuração do dashboard salva com sucesso!");
      onSave?.();
    } catch (error) {
      console.error("Erro ao salvar configuração:", error);
      toast.error("Erro ao salvar configuração do dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Construtor de Dashboard Pipedrive
        </CardTitle>
        <CardDescription>
          Selecione as métricas e dados que deseja visualizar no seu dashboard personalizado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label className="text-base font-semibold">Métricas Disponíveis</Label>
          <p className="text-sm text-muted-foreground">
            Escolha quais informações você deseja acompanhar do Pipedrive
          </p>
          
          <Separator />

          <div className="space-y-4">
            {AVAILABLE_METRICS.map((metric) => {
              const Icon = metric.icon;
              const isSelected = selectedMetrics.includes(metric.id);
              
              return (
                <div
                  key={metric.id}
                  className={`flex items-start space-x-3 p-4 rounded-lg border transition-all cursor-pointer hover:border-primary/50 ${
                    isSelected ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  onClick={() => toggleMetric(metric.id)}
                >
                  <Checkbox
                    id={metric.id}
                    checked={isSelected}
                    onCheckedChange={() => toggleMetric(metric.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <Label
                        htmlFor={metric.id}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {metric.label}
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {metric.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {selectedMetrics.length} métrica(s) selecionada(s)
          </p>
          <Button onClick={handleSave} disabled={loading || selectedMetrics.length === 0}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Configuração
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
