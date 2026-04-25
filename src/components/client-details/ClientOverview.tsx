import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Info,
  TrendingUp,
  CalendarClock,
  CheckCircle2,
  FileText,
  BarChart3,
  AlertCircle,
  Megaphone,
  Palette,
  Upload,
  MessageSquare,
  CheckSquare,
  CalendarDays,
} from "lucide-react";
import { ptBR } from "date-fns/locale";
import { safeFormatDate } from "@/lib/dateUtils";

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

interface RecentTask {
  id: string;
  title: string;
  status: string;
  created_at: string;
  category: string | null;
  description: string | null;
}

interface RecentMeeting {
  id: string;
  title: string;
  meeting_date: string;
}

const SEGMENT_LABELS: Record<string, string> = {
  inside_sales: "Inside Sales",
  ecommerce: "E-commerce",
  marketplace: "Marketplace",
  local_business: "Negócio Local",
  educacao: "Educação Corporativa",
  outro: "Outro",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function getCategoryStyle(category: string | null) {
  const map: Record<string, { bg: string; icon: React.ElementType; label: string }> = {
    campaign: { bg: "bg-fuchsia-100 text-fuchsia-700", icon: Megaphone, label: "Campanha" },
    design: { bg: "bg-violet-100 text-violet-700", icon: Palette, label: "Design" },
    content: { bg: "bg-sky-100 text-sky-700", icon: FileText, label: "Conteúdo" },
    meeting: { bg: "bg-amber-100 text-amber-700", icon: CalendarDays, label: "Reunião" },
  };
  return map[category || ""] || { bg: "bg-muted text-muted-foreground", icon: CheckSquare, label: "Tarefa" };
}

export function ClientOverview({ clientId, client }: ClientOverviewProps) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pending: 0,
    overdue: 0,
    completed: 0,
    completedThisMonth: 0,
    meetings: 0,
    lastMeetingDate: null as string | null,
    dashboards: 0,
  });
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<RecentMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const fetchData = async () => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const todayIso = today.toISOString();

      const [
        pending,
        overdue,
        completed,
        completedMonth,
        meetingsCount,
        dashboardsCount,
        lastMeeting,
        tasks,
        meetingsList,
      ] = await Promise.all([
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("client_id", clientId).neq("status", "concluido"),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("client_id", clientId).neq("status", "concluido").lt("due_date", todayIso),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "concluido"),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("client_id", clientId).eq("status", "concluido").gte("updated_at", startOfMonth),
        supabase.from("meeting_minutes").select("*", { count: "exact", head: true }).eq("client_id", clientId),
        supabase.from("client_dashboards").select("*", { count: "exact", head: true }).eq("client_id", clientId).eq("is_active", true),
        supabase.from("meeting_minutes").select("meeting_date").eq("client_id", clientId).order("meeting_date", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("tasks").select("id, title, status, created_at, category, description").eq("client_id", clientId).order("created_at", { ascending: false }).limit(4),
        supabase.from("meeting_minutes").select("id, title, meeting_date").eq("client_id", clientId).order("meeting_date", { ascending: false }).limit(4),
      ]);

      setStats({
        pending: pending.count || 0,
        overdue: overdue.count || 0,
        completed: completed.count || 0,
        completedThisMonth: completedMonth.count || 0,
        meetings: meetingsCount.count || 0,
        lastMeetingDate: lastMeeting.data?.meeting_date || null,
        dashboards: dashboardsCount.count || 0,
      });
      setRecentTasks((tasks.data as RecentTask[]) || []);
      setRecentMeetings((meetingsList.data as RecentMeeting[]) || []);
    } catch (error) {
      console.error("Erro ao buscar dados da visão geral:", error);
    } finally {
      setLoading(false);
    }
  };

  const goToTab = (tab: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    navigate(`${url.pathname}?${url.searchParams.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const segmentLabel = SEGMENT_LABELS[client.segment] || client.segment;
  const monthsAsClient = client.contract_start
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(client.contract_start).getTime()) / (1000 * 60 * 60 * 24 * 30)
        )
      )
    : null;

  return (
    <div className="space-y-6">
      {/* Header card: Resumo + Highlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Resumo de Informações */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Info className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-semibold">Resumo de Informações</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5 text-sm">
              {client.cnpj && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">CNPJ</p>
                  <p className="font-semibold text-foreground">{client.cnpj}</p>
                </div>
              )}
              {client.contact_name && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Contato Principal</p>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                      {getInitials(client.contact_name)}
                    </div>
                    <p className="font-semibold text-foreground">{client.contact_name}</p>
                  </div>
                </div>
              )}
              {client.contact_phone && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Telefone</p>
                  <p className="font-semibold text-foreground">{client.contact_phone}</p>
                </div>
              )}
              {client.contact_email && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">E-mail</p>
                  <p className="font-semibold text-foreground truncate">{client.contact_email}</p>
                </div>
              )}
              {client.contract_start && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Início de Contrato</p>
                  <p className="font-semibold text-foreground">
                    {safeFormatDate(client.contract_start, "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}
              {client.monthly_fee != null && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Fee Mensal</p>
                  <div className="flex items-center gap-2">
                    {client.status === "active" && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-[10px] px-1.5 py-0">
                        ATIVO
                      </Badge>
                    )}
                    <p className="font-semibold text-primary">
                      {client.monthly_fee.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Segmento</p>
                <p className="font-semibold text-foreground">{segmentLabel}</p>
              </div>
              {monthsAsClient !== null && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Tempo de Casa</p>
                  <p className="font-semibold text-foreground">
                    {monthsAsClient >= 12
                      ? `${(monthsAsClient / 12).toFixed(1)} anos`
                      : `${monthsAsClient} meses`}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Highlight Card */}
        <Card className="overflow-hidden border-0 shadow-md relative bg-gradient-to-br from-primary via-primary to-purple-700 text-white">
          <CardContent className="p-6 relative z-10">
            <div className="h-10 w-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center mb-4">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-bold leading-tight mb-2">
              {stats.completedThisMonth > 0
                ? `${stats.completedThisMonth} entregas concluídas este mês`
                : "Acompanhe a performance do cliente"}
            </h3>
            <p className="text-sm text-white/80 mb-5">
              {stats.dashboards > 0
                ? `${stats.dashboards} dashboard${stats.dashboards > 1 ? "s" : ""} ativo${stats.dashboards > 1 ? "s" : ""} disponível para análise.`
                : "Configure dashboards para visualizar métricas em tempo real."}
            </p>
            <Button
              onClick={() => goToTab("performance")}
              variant="secondary"
              size="sm"
              className="bg-white/95 text-primary hover:bg-white font-semibold uppercase text-xs tracking-wide"
            >
              Ver Performance
            </Button>
          </CardContent>
          <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute right-10 top-2 h-16 w-16 rounded-full bg-white/5 pointer-events-none" />
        </Card>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="ATIVIDADES PENDENTES"
          value={stats.pending}
          icon={CalendarClock}
          iconClass="bg-orange-100 text-orange-600"
          footer={
            stats.overdue > 0 ? (
              <span className="flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3 w-3" />
                {stats.overdue} em atraso
              </span>
            ) : (
              <span className="text-muted-foreground">Tudo em dia</span>
            )
          }
          onClick={() => goToTab("tasks")}
        />
        <KpiCard
          title="TOTAL REALIZADAS"
          value={stats.completed}
          icon={CheckCircle2}
          iconClass="bg-emerald-100 text-emerald-600"
          footer={
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              +{stats.completedThisMonth} este mês
            </span>
          }
          onClick={() => goToTab("tasks")}
        />
        <KpiCard
          title="ATAS DE REUNIÃO"
          value={stats.meetings}
          icon={FileText}
          iconClass="bg-violet-100 text-violet-600"
          footer={
            stats.lastMeetingDate ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                <CalendarClock className="h-3 w-3" />
                Última {safeFormatDate(stats.lastMeetingDate, "dd/MM", { locale: ptBR })}
              </span>
            ) : (
              <span className="text-muted-foreground">Sem reuniões</span>
            )
          }
          onClick={() => goToTab("meetings")}
        />
        <KpiCard
          title="DASHBOARDS ATIVOS"
          value={String(stats.dashboards).padStart(2, "0")}
          icon={BarChart3}
          iconClass="bg-sky-100 text-sky-600"
          footer={
            <span className="flex items-center gap-1 text-sky-600">
              <BarChart3 className="h-3 w-3" />
              Todos em tempo real
            </span>
          }
          onClick={() => goToTab("dashboards")}
        />
      </div>

      {/* Bottom Grid: Atividades recentes + Reuniões */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Atividades recentes */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold">Atividades Recentes</h3>
              <Button variant="link" size="sm" className="text-primary h-auto p-0" onClick={() => goToTab("tasks")}>
                Ver todas
              </Button>
            </div>
            {recentTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckSquare className="h-10 w-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma atividade ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task) => {
                  const cat = getCategoryStyle(task.category);
                  const Icon = cat.icon;
                  return (
                    <button
                      key={task.id}
                      onClick={() => goToTab("tasks")}
                      className="w-full flex items-start gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-muted/30 transition-all text-left"
                    >
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground line-clamp-1">{task.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {task.description?.replace(/<[^>]+>/g, "").slice(0, 80) || cat.label}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-semibold flex-shrink-0 ${
                          task.status === "concluido"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : task.status === "em_andamento"
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {task.status === "concluido"
                          ? "Concluída"
                          : task.status === "em_andamento"
                          ? "Em curso"
                          : "Pendente"}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Atividade Recente / Timeline */}
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-base font-semibold mb-5">Reuniões Recentes</h3>
            {recentMeetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma reunião registrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentMeetings.map((meeting, idx) => (
                  <div key={meeting.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <FileText className="h-4 w-4" />
                      </div>
                      {idx < recentMeetings.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" style={{ minHeight: 16 }} />
                      )}
                    </div>
                    <button
                      onClick={() => goToTab("meetings")}
                      className="flex-1 text-left pb-3 hover:opacity-80 transition-opacity"
                    >
                      <p className="text-sm font-semibold text-foreground line-clamp-1">{meeting.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {safeFormatDate(meeting.meeting_date, "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  iconClass: string;
  footer: React.ReactNode;
  onClick?: () => void;
}

function KpiCard({ title, value, icon: Icon, iconClass, footer, onClick }: KpiCardProps) {
  return (
    <Card
      onClick={onClick}
      className="border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold leading-tight max-w-[70%]">
            {title}
          </p>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${iconClass}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="text-3xl font-bold text-foreground mb-2">{value}</p>
        <div className="text-xs font-medium">{footer}</div>
      </CardContent>
    </Card>
  );
}
