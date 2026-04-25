import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar,
  CheckSquare,
  Clock,
  ListChecks,
  Zap,
  FileText,
  MessageSquare,
  CreditCard,
  PlusCircle,
  Settings,
  CalendarOff,
  Video,
} from "lucide-react";
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
  type: "meeting" | "task" | "report" | "comment" | "payment";
  title: string;
  subtitle: string;
  date: string;
}

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>([]);
  const [myTasks, setMyTasks] = useState<MyTask[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [taskCount, setTaskCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");

  const { clientId, clientData, userId, loading: authLoading, error } = useClientUser();

  usePageMeta({
    title: "Área do Cliente",
    description: "Acompanhe suas informações, atividades e dashboards",
    keywords: "área do cliente, dashboard, vivaz",
  });

  useEffect(() => {
    if (!authLoading && clientId && userId) {
      loadDashboardData();
      loadUserName();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, clientId, userId]);

  const loadUserName = async () => {
    if (!userId) return;
    const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
    if (data?.full_name) setUserName(data.full_name.split(" ")[0]);
  };

  const loadDashboardData = async () => {
    if (!clientId || !userId) return;

    try {
      const today = new Date().toISOString();

      const [meetings, tasks, allTasksCount, recentMeetings, recentTasks] = await Promise.all([
        supabase
          .from("meeting_minutes")
          .select("id, title, meeting_date")
          .eq("client_id", clientId)
          .gte("meeting_date", today)
          .order("meeting_date", { ascending: true })
          .limit(3),
        supabase
          .from("tasks")
          .select("id, title, status, priority, due_date")
          .eq("client_id", clientId)
          .eq("assigned_to", userId)
          .neq("status", "concluido")
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(5),
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("client_id", clientId)
          .eq("assigned_to", userId)
          .neq("status", "concluido"),
        supabase
          .from("meeting_minutes")
          .select("id, title, meeting_date, updated_at")
          .eq("client_id", clientId)
          .order("updated_at", { ascending: false })
          .limit(3),
        supabase
          .from("tasks")
          .select("id, title, status, updated_at")
          .eq("client_id", clientId)
          .order("updated_at", { ascending: false })
          .limit(3),
      ]);

      setUpcomingMeetings(meetings.data || []);
      setMyTasks(tasks.data || []);
      setTaskCount(allTasksCount.count || 0);

      const activities: RecentActivity[] = [
        ...(recentMeetings.data || []).map((m: any) => ({
          id: m.id,
          type: "meeting" as const,
          title: m.title,
          subtitle: "Ata de reunião atualizada",
          date: m.updated_at || m.meeting_date,
        })),
        ...(recentTasks.data || []).map((t: any) => ({
          id: t.id,
          type: "task" as const,
          title: t.title,
          subtitle: t.status === "concluido" ? "Atividade concluída" : "Atividade atualizada",
          date: t.updated_at,
        })),
      ]
        .filter((a) => a.date)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      setRecentActivity(activities);
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
    } finally {
      setDataLoading(false);
    }
  };

  const monthsAsClient = clientData?.contract_start
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(clientData.contract_start).getTime()) /
            (1000 * 60 * 60 * 24 * 30)
        )
      )
    : 0;

  const tempoCasa =
    monthsAsClient >= 12 ? `${(monthsAsClient / 12).toFixed(1)} anos` : `${monthsAsClient} meses`;

  if (authLoading || dataLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
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

  const getPriorityClass = (priority: string) => {
    if (priority === "high") return "bg-red-100 text-red-700 border-red-200";
    if (priority === "medium") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  };

  const getPriorityLabel = (priority: string) => {
    return priority === "high" ? "Alta Prioridade" : priority === "medium" ? "Média" : "Baixa";
  };

  const getActivityIcon = (type: string) => {
    const map: Record<string, { icon: React.ElementType; color: string }> = {
      meeting: { icon: Video, color: "bg-violet-100 text-violet-600" },
      task: { icon: CheckSquare, color: "bg-emerald-100 text-emerald-600" },
      report: { icon: FileText, color: "bg-sky-100 text-sky-600" },
      comment: { icon: MessageSquare, color: "bg-amber-100 text-amber-600" },
      payment: { icon: CreditCard, color: "bg-fuchsia-100 text-fuchsia-600" },
    };
    return map[type] || map.task;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              Bem-vindo, {userName || clientData.contact_name?.split(" ")[0] || "Cliente"}!{" "}
              <span aria-hidden>👋</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Sua agência está a todo vapor hoje. Aqui está o que precisa de sua atenção.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/area-cliente/dashboards")}>
              <FileText className="h-4 w-4 mr-2" />
              Ver Relatórios
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/area-cliente/atividades")}
              className="text-muted-foreground"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurações da Conta
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Próximas Reuniões
                  </p>
                  <p className="text-3xl font-bold mt-0.5">
                    {String(upcomingMeetings.length).padStart(2, "0")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                  <ListChecks className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Minhas Tarefas
                  </p>
                  <p className="text-3xl font-bold mt-0.5">{String(taskCount).padStart(2, "0")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-fuchsia-100 text-fuchsia-600 flex items-center justify-center">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Tempo de Casa
                  </p>
                  <p className="text-3xl font-bold mt-0.5">{tempoCasa}</p>
                  {clientData.contract_start && (
                    <p className="text-[10px] uppercase tracking-wider text-primary font-bold mt-1">
                      Cliente desde{" "}
                      {safeFormatDate(clientData.contract_start, "MMM/yyyy", { locale: ptBR })}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Tarefas + Reuniões (col-span-2) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Tarefas Pendentes */}
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-semibold">Minhas Tarefas Pendentes</h3>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-primary h-auto p-0"
                    onClick={() => navigate("/area-cliente/atividades")}
                  >
                    Ver tudo
                  </Button>
                </div>

                {myTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <CheckSquare className="h-10 w-10 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente 🎉</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myTasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => navigate("/area-cliente/atividades")}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors text-left group"
                      >
                        <Checkbox className="h-5 w-5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground line-clamp-1">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {task.due_date && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {safeFormatDate(task.due_date, "dd/MM 'às' HH:mm", { locale: ptBR })}
                              </span>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase font-bold ${getPriorityClass(task.priority)}`}
                            >
                              {getPriorityLabel(task.priority)}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Próximas Reuniões */}
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-semibold">Próximas Reuniões</h3>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-primary h-auto p-0"
                    onClick={() => navigate("/area-cliente/atas")}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Agendar
                  </Button>
                </div>

                {upcomingMeetings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
                      <CalendarOff className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-base font-semibold text-foreground">
                      Nenhuma reunião para hoje
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Aproveite o dia para focar nas atividades.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingMeetings.map((meeting) => (
                      <button
                        key={meeting.id}
                        onClick={() => navigate(`/area-cliente/reunioes/${meeting.id}`)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-muted/30 transition-all text-left"
                      >
                        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold line-clamp-1">{meeting.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {safeFormatDate(meeting.meeting_date, "dd 'de' MMMM 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Atividade Recente */}
          <div className="space-y-4">
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Zap className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-semibold">Atividade Recente</h3>
                </div>

                {recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhuma atividade recente
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity, idx) => {
                      const { icon: Icon, color } = getActivityIcon(activity.type);
                      return (
                        <div key={`${activity.type}-${activity.id}`} className="flex items-start gap-3">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${color}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            {idx < recentActivity.length - 1 && (
                              <div className="w-px flex-1 bg-border mt-1" style={{ minHeight: 20 }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 pb-2">
                            <p className="text-sm font-semibold line-clamp-1">{activity.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {activity.subtitle}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mt-1">
                              {safeFormatDate(activity.date, "dd 'de' MMM 'às' HH:mm", {
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Suporte Card */}
            <Card className="overflow-hidden border-0 shadow-md relative bg-gradient-to-br from-primary via-primary to-purple-700 text-white">
              <CardContent className="p-6 relative z-10">
                <h3 className="text-lg font-bold mb-2">Suporte Prioritário</h3>
                <p className="text-sm text-white/85 mb-4">
                  Sua conta tem acesso ao nosso time sênior 24/7. Precisa de algo?
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/95 text-primary hover:bg-white font-semibold"
                  onClick={() => navigate("/area-cliente/vivaz-ai")}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Falar com a Vivaz
                </Button>
              </CardContent>
              <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClientDashboard;
