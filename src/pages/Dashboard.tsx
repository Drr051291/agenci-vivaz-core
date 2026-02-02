import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  Calendar, 
  CheckSquare, 
  Bell, 
  ArrowRight, 
  Clock,
  FileText,
  Activity,
  Building2,
  AlertCircle
} from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { motion } from "framer-motion";
import { StaggerContainer, StaggerItem } from "@/components/ui/animated";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { safeFormatDate } from "@/lib/dateUtils";

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
}

interface RecentNotification {
  id: string;
  title: string;
  message: string;
  category: string;
  is_read: boolean;
  created_at: string;
}

interface RecentClient {
  id: string;
  company_name: string;
  segment: string;
  status: string;
  updated_at: string;
  slug?: string | null;
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
  const [recentNotifications, setRecentNotifications] = useState<RecentNotification[]>([]);
  const [recentClients, setRecentClients] = useState<RecentClient[]>([]);

  usePageMeta({
    title: "Dashboard",
    description: "Visão geral do HUB Vivaz com estatísticas de clientes, projetos e comunicações",
    keywords: "dashboard, estatísticas, clientes, projetos, vivaz",
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate("/auth");
          return;
        }

        // Fetch user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          const firstName = profile.full_name.split(" ")[0];
          setUserName(firstName);
        }

        // Fetch all data in parallel
        const today = new Date().toISOString();
        
        const [
          clientsRes,
          activeClientsRes,
          pendingTasksRes,
          upcomingMeetingsCountRes,
          recentTasksRes,
          meetingsRes,
          notificationsRes,
          recentClientsRes
        ] = await Promise.all([
          // Total clients
          supabase.from("clients").select("*", { count: "exact", head: true }),
          // Active clients
          supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "active"),
          // Pending tasks
          supabase.from("tasks").select("*", { count: "exact", head: true }).neq("status", "done"),
          // Upcoming meetings count
          supabase.from("meeting_minutes").select("*", { count: "exact", head: true }).gte("meeting_date", today),
          // Recent tasks with client info
          supabase
            .from("tasks")
            .select(`
              id, title, status, priority, due_date,
              clients!inner(company_name)
            `)
            .neq("status", "done")
            .order("due_date", { ascending: true, nullsFirst: false })
            .limit(5),
          // Upcoming meetings with client info
          supabase
            .from("meeting_minutes")
            .select(`
              id, title, meeting_date, client_id,
              clients!inner(company_name)
            `)
            .gte("meeting_date", today)
            .order("meeting_date", { ascending: true })
            .limit(5),
          // Recent notifications
          supabase
            .from("notifications")
            .select("id, title, message, category, is_read, created_at")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(5),
          // Recent clients
          supabase
            .from("clients")
            .select("id, company_name, segment, status, updated_at, slug")
            .order("updated_at", { ascending: false })
            .limit(5)
        ]);

        setStats({
          clients: clientsRes.count || 0,
          activeClients: activeClientsRes.count || 0,
          pendingTasks: pendingTasksRes.count || 0,
          upcomingMeetings: upcomingMeetingsCountRes.count || 0,
        });

        // Process tasks
        if (recentTasksRes.data) {
          const tasks = recentTasksRes.data.map((task: any) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            due_date: task.due_date,
            client_name: task.clients?.company_name || "Sem cliente",
          }));
          setRecentTasks(tasks);
        }

        // Process meetings
        if (meetingsRes.data) {
          const meetings = meetingsRes.data.map((meeting: any) => ({
            id: meeting.id,
            title: meeting.title,
            meeting_date: meeting.meeting_date,
            client_id: meeting.client_id,
            client_name: meeting.clients?.company_name || "Sem cliente",
          }));
          setUpcomingMeetings(meetings);
        }

        // Process notifications
        if (notificationsRes.data) {
          setRecentNotifications(notificationsRes.data);
        }

        // Process recent clients
        if (recentClientsRes.data) {
          setRecentClients(recentClientsRes.data);
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
      active: "bg-green-500/10 text-green-600",
      inactive: "bg-gray-500/10 text-gray-600",
    };
    const labels: Record<string, string> = {
      pending: "Pendente",
      in_progress: "Em andamento",
      done: "Concluída",
      active: "Ativo",
      inactive: "Inativo",
    };
    return (
      <Badge variant="secondary" className={styles[status] || ""}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getSegmentBadge = (segment: string) => {
    const colors: Record<string, string> = {
      inside_sales: "bg-blue-500",
      ecommerce: "bg-green-500",
      marketplace: "bg-purple-500",
      local_business: "bg-orange-500",
    };
    const labels: Record<string, string> = {
      inside_sales: "Inside Sales",
      ecommerce: "E-commerce",
      marketplace: "Marketplace",
      local_business: "Negócio Local",
    };
    return (
      <Badge className={colors[segment] || "bg-gray-500"}>
        {labels[segment] || segment}
      </Badge>
    );
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      task: CheckSquare,
      meeting: Calendar,
      payment: TrendingUp,
      comment: FileText,
      invoice: FileText,
    };
    return icons[category] || Bell;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      task: "text-blue-500",
      meeting: "text-purple-500",
      payment: "text-green-500",
      comment: "text-yellow-500",
      invoice: "text-orange-500",
    };
    return colors[category] || "text-muted-foreground";
  };

  const formatMeetingDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (isToday(date)) return "Hoje";
      if (isTomorrow(date)) return "Amanhã";
      return format(date, "dd/MM", { locale: ptBR });
    } catch {
      return "";
    }
  };

  const isDueDateOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    try {
      return isPast(parseISO(dateStr)) && !isToday(parseISO(dateStr));
    } catch {
      return false;
    }
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
      title: "Clientes Ativos",
      value: stats.activeClients,
      total: stats.clients,
      icon: Users,
      description: `de ${stats.clients} total`,
      color: "text-primary",
      onClick: () => navigate("/clientes"),
    },
    {
      title: "Tarefas Pendentes",
      value: stats.pendingTasks,
      icon: CheckSquare,
      description: "aguardando execução",
      color: "text-blue-500",
      onClick: () => navigate("/atividades"),
    },
    {
      title: "Próximas Reuniões",
      value: stats.upcomingMeetings,
      icon: Calendar,
      description: "agendadas",
      color: "text-purple-500",
      onClick: () => navigate("/reunioes"),
    },
    {
      title: "Notificações",
      value: recentNotifications.filter(n => !n.is_read).length,
      icon: Bell,
      description: "não lidas",
      color: "text-orange-500",
      onClick: () => navigate("/notificacoes"),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {getGreeting()}, {userName || "Colaborador"}
            </h1>
            <p className="text-muted-foreground">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <Button onClick={() => navigate("/clientes")} variant="outline">
            <Users className="mr-2 h-4 w-4" />
            Ver Clientes
          </Button>
        </motion.div>

        {/* Stats Cards */}
        <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => (
            <StaggerItem key={index}>
              <Card 
                interactive 
                className="h-full group cursor-pointer" 
                onClick={stat.onClick}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <stat.icon className={`h-5 w-5 ${stat.color} transition-colors group-hover:text-primary`} />
                  </motion.div>
                </CardHeader>
                <CardContent>
                  <motion.div 
                    className="text-3xl font-bold"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
                  >
                    {stat.value}
                  </motion.div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Tarefas Pendentes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-blue-500" />
                  Tarefas Pendentes
                </CardTitle>
                <CardDescription>Próximas tarefas a serem executadas</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/atividades")}>
                Ver todas <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckSquare className="h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => navigate("/atividades")}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{task.client_name}</span>
                          {task.due_date && (
                            <span className={`text-xs flex items-center gap-1 ${isDueDateOverdue(task.due_date) ? 'text-red-500' : 'text-muted-foreground'}`}>
                              <Clock className="h-3 w-3" />
                              {safeFormatDate(task.due_date, "dd/MM", { locale: ptBR })}
                              {isDueDateOverdue(task.due_date) && <AlertCircle className="h-3 w-3" />}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(task.priority)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Próximas Reuniões */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-500" />
                  Próximas Reuniões
                </CardTitle>
                <CardDescription>Reuniões agendadas com clientes</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/reunioes")}>
                Ver todas <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingMeetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma reunião agendada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingMeetings.map((meeting) => (
                    <motion.div
                      key={meeting.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => navigate(`/clientes/${meeting.client_id}?tab=reunioes`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center justify-center bg-primary/10 rounded-lg p-2 min-w-[50px]">
                          <span className="text-xs text-primary font-medium">
                            {formatMeetingDate(meeting.meeting_date)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {safeFormatDate(meeting.meeting_date, "HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium line-clamp-1">{meeting.title}</p>
                          <p className="text-xs text-muted-foreground">{meeting.client_name}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Second Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Notificações Recentes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4 text-orange-500" />
                  Notificações Recentes
                </CardTitle>
                <CardDescription>Últimos alertas e atualizações</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/notificacoes")}>
                Ver todas <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
                </div>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {recentNotifications.map((notification) => {
                      const IconComponent = getCategoryIcon(notification.category);
                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                            !notification.is_read ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'
                          }`}
                        >
                          <IconComponent className={`h-4 w-4 mt-0.5 ${getCategoryColor(notification.category)}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm line-clamp-1 ${!notification.is_read ? 'font-medium' : ''}`}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {notification.message}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {safeFormatDate(notification.created_at, "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Clientes Recentes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-green-500" />
                  Clientes Atualizados
                </CardTitle>
                <CardDescription>Últimas atualizações em clientes</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/clientes")}>
                Ver todos <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Building2 className="h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentClients.map((client) => (
                    <motion.div
                      key={client.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => navigate(`/clientes/${client.slug || client.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {client.company_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium line-clamp-1">{client.company_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {safeFormatDate(client.updated_at, "'Atualizado em' dd/MM", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getSegmentBadge(client.segment)}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Ações Rápidas
              </CardTitle>
              <CardDescription>Acesse as funcionalidades mais utilizadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: Users, title: "Novo Cliente", desc: "Cadastrar cliente", path: "/clientes", color: "text-primary" },
                  { icon: CheckSquare, title: "Nova Tarefa", desc: "Criar atividade", path: "/atividades", color: "text-blue-500" },
                  { icon: Calendar, title: "Nova Reunião", desc: "Agendar reunião", path: "/reunioes", color: "text-purple-500" },
                  { icon: TrendingUp, title: "Ferramentas", desc: "Matriz e diagnósticos", path: "/ferramentas", color: "text-green-500" },
                ].map((action, index) => (
                  <motion.div
                    key={index}
                    className="p-4 bg-muted/50 border border-border rounded-lg cursor-pointer group"
                    whileHover={{ 
                      y: -4, 
                      boxShadow: "0 10px 25px -5px hsl(var(--primary) / 0.1)",
                      borderColor: "hsl(var(--primary) / 0.3)"
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    onClick={() => navigate(action.path)}
                  >
                    <action.icon className={`h-6 w-6 ${action.color} mb-2 transition-transform group-hover:scale-110`} />
                    <h4 className="font-medium text-sm group-hover:text-primary transition-colors">{action.title}</h4>
                    <p className="text-xs text-muted-foreground">{action.desc}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
