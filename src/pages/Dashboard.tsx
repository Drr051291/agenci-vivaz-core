import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Calendar,
  CheckSquare,
  Bell,
  Clock,
  ShieldCheck,
  Circle,
  CheckCircle2,
} from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { motion } from "framer-motion";
import { format, isToday, isTomorrow, parseISO, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DashboardStats {
  clients: number;
  activeClients: number;
  pendingTasks: number;
  upcomingMeetings: number;
}

interface RecentTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  client_name: string;
}

interface UpcomingMeeting {
  id: string;
  title: string;
  meeting_date: string;
  client_id: string;
  client_name: string;
  meeting_link?: string | null;
  duration_min?: number | null;
}

interface RecentClient {
  id: string;
  company_name: string;
  segment: string;
  status: string;
  updated_at: string;
  slug?: string | null;
}

interface PortfolioHealth {
  healthy: number;
  attention: number;
  risk: number;
  total: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [stats, setStats] = useState<DashboardStats>({
    clients: 0,
    activeClients: 0,
    pendingTasks: 0,
    upcomingMeetings: 0,
  });
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>([]);
  const [recentClients, setRecentClients] = useState<RecentClient[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [health, setHealth] = useState<PortfolioHealth>({
    healthy: 0,
    attention: 0,
    risk: 0,
    total: 0,
  });

  usePageMeta({
    title: "Dashboard",
    description: "Visão geral do HUB Vivaz com estatísticas de clientes, tarefas e reuniões",
    keywords: "dashboard, estatísticas, clientes, vivaz",
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate("/auth");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setUserName(profile.full_name.split(" ")[0]);
        }

        const today = new Date().toISOString();

        const [
          clientsRes,
          activeClientsRes,
          pendingTasksRes,
          upcomingMeetingsCountRes,
          recentTasksRes,
          meetingsRes,
          recentClientsRes,
          allClientsStatusRes,
          unreadNotifRes,
        ] = await Promise.all([
          supabase.from("clients").select("*", { count: "exact", head: true }),
          supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("tasks").select("*", { count: "exact", head: true }).neq("status", "done"),
          supabase.from("meeting_minutes").select("*", { count: "exact", head: true }).gte("meeting_date", today),
          supabase
            .from("tasks")
            .select(`id, title, status, priority, due_date, clients!inner(company_name)`)
            .neq("status", "done")
            .order("due_date", { ascending: true, nullsFirst: false })
            .limit(4),
          supabase
            .from("meeting_minutes")
            .select(`id, title, meeting_date, client_id, meeting_link, duration_min, clients!inner(company_name)`)
            .gte("meeting_date", today)
            .order("meeting_date", { ascending: true })
            .limit(4),
          supabase
            .from("clients")
            .select("id, company_name, segment, status, updated_at, slug")
            .order("updated_at", { ascending: false })
            .limit(4),
          supabase.from("clients").select("status"),
          supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.user.id)
            .eq("is_read", false),
        ]);

        setStats({
          clients: clientsRes.count || 0,
          activeClients: activeClientsRes.count || 0,
          pendingTasks: pendingTasksRes.count || 0,
          upcomingMeetings: upcomingMeetingsCountRes.count || 0,
        });

        setUnreadNotifications(unreadNotifRes.count || 0);

        if (recentTasksRes.data) {
          setRecentTasks(
            recentTasksRes.data.map((t: any) => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              due_date: t.due_date,
              client_name: t.clients?.company_name || "Sem cliente",
            }))
          );
        }

        if (meetingsRes.data) {
          setUpcomingMeetings(
            meetingsRes.data.map((m: any) => ({
              id: m.id,
              title: m.title,
              meeting_date: m.meeting_date,
              client_id: m.client_id,
              client_name: m.clients?.company_name || "Sem cliente",
              meeting_link: m.meeting_link,
              duration_min: m.duration_min,
            }))
          );
        }

        if (recentClientsRes.data) {
          setRecentClients(recentClientsRes.data);
        }

        // Compute portfolio health from client statuses
        if (allClientsStatusRes.data) {
          const total = allClientsStatusRes.data.length;
          const healthy = allClientsStatusRes.data.filter((c: any) => c.status === "active").length;
          const risk = allClientsStatusRes.data.filter(
            (c: any) => c.status === "inactive" || c.status === "churned" || c.status === "cancelled"
          ).length;
          const attention = Math.max(total - healthy - risk, 0);
          setHealth({ healthy, attention, risk, total });
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatDueLabel = (dateStr: string | null) => {
    if (!dateStr) return "Sem prazo";
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) return "Vence hoje";
      if (isTomorrow(d)) return "Vence amanhã";
      if (isPast(d)) return `Atrasada • ${format(d, "dd/MM", { locale: ptBR })}`;
      return `Vence em ${format(d, "dd/MM", { locale: ptBR })}`;
    } catch {
      return "Sem prazo";
    }
  };

  const priorityLabel = (p: string) => {
    const map: Record<string, string> = { high: "Prioridade Alta", medium: "Prioridade Média", low: "Prioridade Baixa" };
    return map[p] || "Prioridade";
  };

  const formatMeetingDay = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) return "HOJE";
      if (isTomorrow(d)) return "AMANHÃ";
      return format(d, "dd/MM", { locale: ptBR }).toUpperCase();
    } catch {
      return "";
    }
  };

  const formatMeetingTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "HH:mm");
    } catch {
      return "";
    }
  };

  const meetingChannelLabel = (m: UpcomingMeeting) => {
    if (m.meeting_link) {
      if (/meet\.google/i.test(m.meeting_link)) return "Google Meet";
      if (/zoom/i.test(m.meeting_link)) return "Zoom";
      if (/teams/i.test(m.meeting_link)) return "Microsoft Teams";
      return "Online";
    }
    return "Presencial";
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    {
      title: "CLIENTES ATIVOS",
      value: stats.activeClients,
      icon: Users,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      onClick: () => navigate("/clientes"),
    },
    {
      title: "TAREFAS PENDENTES",
      value: stats.pendingTasks,
      icon: CheckSquare,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600 dark:text-amber-400",
      onClick: () => navigate("/atividades"),
    },
    {
      title: "PRÓXIMAS REUNIÕES",
      value: stats.upcomingMeetings,
      icon: Calendar,
      iconBg: "bg-sky-500/10",
      iconColor: "text-sky-600 dark:text-sky-400",
      onClick: () => navigate("/reunioes"),
    },
    {
      title: "NOTIFICAÇÕES",
      value: String(unreadNotifications).padStart(2, "0"),
      icon: Bell,
      iconBg: "bg-rose-500/10",
      iconColor: "text-rose-600 dark:text-rose-400",
      onClick: () => navigate("/notificacoes"),
    },
  ];

  // Health bars heights (relative to max)
  const maxHealth = Math.max(health.healthy, health.attention, health.risk, 1);
  const pct = (n: number) => Math.round((n / Math.max(health.total, 1)) * 100);
  const barHeight = (n: number) => `${Math.max((n / maxHealth) * 100, 6)}%`;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            {getGreeting()}, {userName || "Vivaz"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Aqui está o que está acontecendo com seus projetos hoje.
          </p>
        </motion.div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s, i) => (
            <motion.button
              key={s.title}
              type="button"
              onClick={s.onClick}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              whileHover={{ y: -2 }}
              className="group text-left"
            >
              <Card className="h-full border-border/60 hover:border-primary/40 transition-colors">
                <CardContent className="p-5 flex items-center gap-4">
                  <div
                    className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                      s.iconBg
                    )}
                  >
                    <s.icon className={cn("h-6 w-6", s.iconColor)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-wider text-muted-foreground">
                      {s.title}
                    </p>
                    <p className="text-3xl font-bold text-foreground leading-tight mt-0.5">
                      {s.value}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.button>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tarefas Pendentes */}
            <Card className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  Tarefas Pendentes
                </CardTitle>
                <Button
                  variant="link"
                  size="sm"
                  className="text-primary px-0 h-auto"
                  onClick={() => navigate("/atividades")}
                >
                  Ver todas
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentTasks.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Nenhuma tarefa pendente
                  </div>
                ) : (
                  recentTasks.map((task) => {
                    const overdue =
                      task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => navigate("/atividades")}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-muted/40 transition-colors text-left"
                      >
                        {task.status === "done" ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-1">
                            {task.title}
                            {task.client_name && (
                              <span className="text-muted-foreground font-normal"> — {task.client_name}</span>
                            )}
                          </p>
                          <p
                            className={cn(
                              "text-xs mt-0.5 flex items-center gap-1.5",
                              overdue ? "text-rose-500" : "text-muted-foreground"
                            )}
                          >
                            <Clock className="h-3 w-3" />
                            {formatDueLabel(task.due_date)}
                            <span className="text-muted-foreground/60">•</span>
                            <span>{priorityLabel(task.priority)}</span>
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Clientes Recentes */}
            <Card className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Clientes Recentes
                </CardTitle>
                <Button
                  variant="link"
                  size="sm"
                  className="text-primary px-0 h-auto"
                  onClick={() => navigate("/clientes")}
                >
                  Ver todos
                </Button>
              </CardHeader>
              <CardContent>
                {recentClients.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Nenhum cliente cadastrado
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {recentClients.map((client) => {
                      const daysAgo = Math.max(
                        1,
                        Math.floor(
                          (Date.now() - new Date(client.updated_at).getTime()) / (1000 * 60 * 60 * 24)
                        )
                      );
                      const label =
                        daysAgo === 1
                          ? "Adicionado há 1 dia"
                          : daysAgo < 7
                          ? `Adicionado há ${daysAgo} dias`
                          : daysAgo < 14
                          ? "Adicionado há 1 semana"
                          : `Adicionado há ${Math.floor(daysAgo / 7)} semanas`;
                      return (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => navigate(`/clientes/${client.slug || client.id}`)}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-muted/40 transition-colors text-left"
                        >
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-muted-foreground">
                              {getInitials(client.company_name)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground line-clamp-1">
                              {client.company_name}
                            </p>
                            <p className="text-xs text-muted-foreground">{label}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT column */}
          <div className="space-y-6">
            {/* Saúde da Carteira */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Saúde da Carteira
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Bar chart */}
                <div className="flex items-end justify-around gap-3 h-40 px-2">
                  {[
                    { key: "healthy", value: health.healthy, color: "bg-emerald-500", soft: "bg-emerald-500/15" },
                    { key: "attention", value: health.attention, color: "bg-amber-400", soft: "bg-amber-400/20" },
                    { key: "risk", value: health.risk, color: "bg-rose-400", soft: "bg-rose-400/20" },
                  ].map((b) => (
                    <div key={b.key} className="flex flex-col items-center gap-2 flex-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {pct(b.value)}%
                      </span>
                      <div className={cn("relative w-full max-w-[64px] rounded-t-md flex-1 overflow-hidden", b.soft)}>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: barHeight(b.value) }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={cn("absolute bottom-0 left-0 right-0 rounded-t-md", b.color)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="mt-5 space-y-2.5">
                  {[
                    { dot: "bg-emerald-500", label: "Saudáveis", value: health.healthy },
                    { dot: "bg-amber-400", label: "Em Atenção", value: health.attention },
                    { dot: "bg-rose-400", label: "Risco Crítico", value: health.risk },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", row.dot)} />
                        <span className="text-foreground">{row.label}</span>
                      </div>
                      <span className="font-semibold text-foreground">
                        {row.value} {row.value === 1 ? "cliente" : "clientes"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Próximas Reuniões */}
            <Card className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Próximas Reuniões
                </CardTitle>
                <Button
                  variant="link"
                  size="sm"
                  className="text-primary px-0 h-auto"
                  onClick={() => navigate("/reunioes")}
                >
                  Ver todas
                </Button>
              </CardHeader>
              <CardContent>
                {upcomingMeetings.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Nenhuma reunião agendada
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingMeetings.slice(0, 3).map((meeting) => (
                      <button
                        key={meeting.id}
                        type="button"
                        onClick={() => navigate(`/clientes/${meeting.client_id}?tab=reunioes`)}
                        className="w-full flex items-start gap-4 text-left group"
                      >
                        <div className="flex flex-col items-center justify-center shrink-0 w-14">
                          <span className="text-[10px] font-bold tracking-wider text-muted-foreground">
                            {formatMeetingDay(meeting.meeting_date)}
                          </span>
                          <span className="text-xl font-bold text-foreground tabular-nums">
                            {formatMeetingTime(meeting.meeting_date)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 border-l border-border/60 pl-4">
                          <p className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                            {meeting.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {meetingChannelLabel(meeting)}
                            {meeting.duration_min ? ` • ${meeting.duration_min} min` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{meeting.client_name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
