import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckSquare, FileText, BarChart3 } from "lucide-react";

interface ClientOverviewProps {
  clientId: string;
}

export function ClientOverview({ clientId }: ClientOverviewProps) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
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
  );
}
