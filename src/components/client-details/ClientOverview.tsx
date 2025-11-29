import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckSquare, FileText, BarChart3, User, Phone, Mail, Calendar, DollarSign } from "lucide-react";
import { PipedriveMetrics } from "./PipedriveMetrics";

interface Client {
  id: string;
  company_name: string;
  cnpj?: string;
  status: string;
  segment: string;
  contract_start?: string;
  monthly_fee?: number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
}

interface ClientOverviewProps {
  clientId: string;
  client: Client;
}

export function ClientOverview({ clientId, client }: ClientOverviewProps) {
  const [stats, setStats] = useState({
    projects: 0,
    tasks: 0,
    meetings: 0,
    dashboards: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [clientId]);

  const fetchStats = async () => {
    try {
      const [tasksCount, pendingTasksCount, meetingsCount, dashboardsCount] =
        await Promise.all([
          supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("client_id", clientId),
          supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("client_id", clientId)
            .eq("status", "pending"),
          supabase
            .from("meeting_minutes")
            .select("*", { count: "exact", head: true })
            .eq("client_id", clientId),
          supabase
            .from("client_dashboards")
            .select("*", { count: "exact", head: true })
            .eq("client_id", clientId)
            .eq("is_active", true),
        ]);

      setStats({
        projects: pendingTasksCount.count || 0,
        tasks: tasksCount.count || 0,
        meetings: meetingsCount.count || 0,
        dashboards: dashboardsCount.count || 0,
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Atividades Pendentes",
      value: stats.projects,
      icon: AlertCircle,
      color: "text-orange-500",
    },
    {
      title: "Total de Atividades",
      value: stats.tasks,
      icon: CheckSquare,
      color: "text-green-500",
    },
    {
      title: "Atas de Reunião",
      value: stats.meetings,
      icon: FileText,
      color: "text-purple-500",
    },
    {
      title: "Dashboards Ativos",
      value: stats.dashboards,
      icon: BarChart3,
      color: "text-blue-500",
    },
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-green-500/10 text-green-500 border-green-500/20",
      inactive: "bg-red-500/10 text-red-500 border-red-500/20",
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      active: "Ativo",
      inactive: "Inativo",
      pending: "Pendente",
      prospecting: "Prospecção",
    };
    return labels[status as keyof typeof labels] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Informações do Cliente */}
      <Card className="border-muted">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Informações do Cliente</CardTitle>
            <Badge className={getStatusColor(client.status)}>
              {getStatusLabel(client.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
            {client.cnpj && (
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">CNPJ</p>
                  <p className="font-medium truncate">{client.cnpj}</p>
                </div>
              </div>
            )}
            {client.contact_name && (
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Contato</p>
                  <p className="font-medium truncate">{client.contact_name}</p>
                </div>
              </div>
            )}
            {client.contact_phone && (
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="font-medium truncate">{client.contact_phone}</p>
                </div>
              </div>
            )}
            {client.contact_email && (
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium truncate">{client.contact_email}</p>
                </div>
              </div>
            )}
            {client.contract_start && (
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Início</p>
                  <p className="font-medium">
                    {new Date(client.contract_start).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            )}
            {client.monthly_fee && (
              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Mensalidade</p>
                  <p className="font-semibold text-primary">
                    R$ {client.monthly_fee.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Métricas do Pipedrive */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Métricas do Pipedrive</h3>
        <PipedriveMetrics clientId={clientId} />
      </div>

      {/* Estatísticas Gerais */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Estatísticas Gerais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
