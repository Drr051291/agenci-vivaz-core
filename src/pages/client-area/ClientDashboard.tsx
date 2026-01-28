import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, FileText, CheckSquare, Clock, ArrowRight } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useClientUser } from "@/hooks/useClientUser";
import { ptBR } from "date-fns/locale";
import { safeFormatDate } from "@/lib/dateUtils";

interface UpcomingMeeting {
  id: string;
  title: string;
  meeting_date: string;
}

interface MyTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
}

interface RecentActivity {
  id: string;
  type: 'meeting' | 'task';
  title: string;
  date: string;
  status?: string;
}

const ClientDashboard = () => {
  const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>([]);
  const [myTasks, setMyTasks] = useState<MyTask[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const navigate = useNavigate();
  
  const { clientId, clientData, userId, loading: authLoading, error } = useClientUser();

  usePageMeta({
    title: "Área do Cliente",
    description: "Acompanhe suas informações, atividades e dashboards",
    keywords: "área do cliente, dashboard, informações, vivaz",
  });

  useEffect(() => {
    if (!authLoading && clientId && userId) {
      loadDashboardData();
    }
  }, [authLoading, clientId, userId]);

  const loadDashboardData = async () => {
    if (!clientId || !userId) return;

    try {
      // Buscar próximas reuniões (próximas 3)
      const today = new Date().toISOString();
      const { data: meetings } = await supabase
        .from("meeting_minutes")
        .select("id, title, meeting_date")
        .eq("client_id", clientId)
        .gte("meeting_date", today)
        .order("meeting_date", { ascending: true })
        .limit(3);

      setUpcomingMeetings(meetings || []);

      // Buscar tarefas do usuário (assigned_to = user.id)
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_date")
        .eq("client_id", clientId)
        .eq("assigned_to", userId)
        .not("status", "eq", "done")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(5);

      setMyTasks(tasks || []);

      // Buscar atividade recente (últimas reuniões e tarefas criadas)
      const [recentMeetings, recentTasks] = await Promise.all([
        supabase
          .from("meeting_minutes")
          .select("id, title, meeting_date")
          .eq("client_id", clientId)
          .order("meeting_date", { ascending: false })
          .limit(3),
        supabase
          .from("tasks")
          .select("id, title, created_at, status")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      const activities: RecentActivity[] = [
        ...(recentMeetings.data || []).map((m) => ({
          id: m.id,
          type: 'meeting' as const,
          title: m.title,
          date: m.meeting_date || '',
        })),
        ...(recentTasks.data || []).map((t) => ({
          id: t.id,
          type: 'task' as const,
          title: t.title,
          date: t.created_at || '',
          status: t.status,
        })),
      ].filter(a => a.date).sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (isNaN(dateA) || isNaN(dateB)) return 0;
        return dateB - dateA;
      }).slice(0, 5);

      setRecentActivity(activities);
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
    } finally {
      setDataLoading(false);
    }
  };

  const getSegmentColor = (segment: string) => {
    const colors: Record<string, string> = {
      inside_sales: "bg-blue-500",
      ecommerce: "bg-green-500",
      marketplace: "bg-purple-500",
      local_business: "bg-orange-500",
    };
    return colors[segment] || "bg-gray-500";
  };

  const getSegmentLabel = (segment: string) => {
    const labels: Record<string, string> = {
      inside_sales: "Inside Sales",
      ecommerce: "E-commerce",
      marketplace: "Marketplace",
      local_business: "Negócio Local",
    };
    return labels[segment] || segment;
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      high: "bg-red-500/10 text-red-600 border-red-500/20",
      medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      low: "bg-green-500/10 text-green-600 border-green-500/20",
    };
    const labels: Record<string, string> = {
      high: "Alta",
      medium: "Média",
      low: "Baixa",
    };
    return (
      <Badge variant="outline" className={styles[priority] || ""}>
        {labels[priority] || priority}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-600",
      in_progress: "bg-blue-500/10 text-blue-600",
      done: "bg-green-500/10 text-green-600",
    };
    const labels: Record<string, string> = {
      pending: "Pendente",
      in_progress: "Em andamento",
      done: "Concluída",
    };
    return (
      <Badge variant="secondary" className={styles[status] || ""}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (authLoading || dataLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !clientData) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              {error || "Não foi possível carregar os dados do cliente."}
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Bem-vindo, {clientData.contact_name || clientData.company_name}
            </h1>
            <p className="text-muted-foreground">
              Acompanhe suas reuniões e atividades
            </p>
          </div>
          <Badge className={getSegmentColor(clientData.segment)}>
            {getSegmentLabel(clientData.segment)}
          </Badge>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próximas Reuniões</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingMeetings.length}</div>
              <p className="text-xs text-muted-foreground">agendadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Minhas Tarefas</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myTasks.length}</div>
              <p className="text-xs text-muted-foreground">pendentes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cliente desde</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {safeFormatDate(clientData.contract_start, "MMM/yy", { locale: ptBR })}
              </div>
              <p className="text-xs text-muted-foreground">{clientData.contact_name || ""}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Próximas Reuniões */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Próximas Reuniões</CardTitle>
                <CardDescription>Reuniões agendadas</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/area-cliente/atas")}>
                Ver todas <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingMeetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma reunião agendada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => navigate(`/area-cliente/reunioes/${meeting.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium line-clamp-1">{meeting.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {safeFormatDate(meeting.meeting_date, "dd 'de' MMMM", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Minhas Tarefas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Minhas Tarefas</CardTitle>
                <CardDescription>Tarefas atribuídas a você</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/area-cliente/atividades")}>
                Ver todas <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {myTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckSquare className="h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => navigate("/area-cliente/atividades")}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {task.due_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {safeFormatDate(task.due_date, "dd/MM", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(task.priority)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Atividade Recente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atividade Recente</CardTitle>
            <CardDescription>Últimas atualizações da sua conta</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma atividade recente
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={`${activity.type}-${activity.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {activity.type === 'meeting' ? (
                        <FileText className="h-4 w-4 text-blue-500" />
                      ) : (
                        <CheckSquare className="h-4 w-4 text-green-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium line-clamp-1">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {safeFormatDate(activity.date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    {activity.status && getStatusBadge(activity.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ClientDashboard;
