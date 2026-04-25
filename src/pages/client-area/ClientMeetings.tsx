import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  CheckSquare,
  FileText,
  ExternalLink,
  Search,
  ArrowRight,
  TrendingUp,
  Video,
} from "lucide-react";
import { ptBR } from "date-fns/locale";
import { format, isFuture, isToday, isTomorrow, isThisMonth } from "date-fns";
import { safeFormatDate } from "@/lib/dateUtils";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useClientUser } from "@/hooks/useClientUser";

interface MeetingMinute {
  id: string;
  title: string;
  meeting_date: string;
  participants: string[] | null;
  content: string;
  action_items: string[] | null;
  linked_dashboards: string[] | null;
  linked_tasks: string[] | null;
  share_token: string | null;
  slug: string | null;
  focus_channels?: string[] | null;
  meeting_link?: string | null;
  duration_min?: number | null;
  status?: string | null;
}

interface Dashboard {
  id: string;
  name: string;
  dashboard_type: string;
}

const CATEGORY_STYLES: Record<string, { label: string; className: string }> = {
  estrategico: { label: "Estratégico", className: "bg-primary/10 text-primary" },
  performance: { label: "Performance", className: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400" },
  social_media: { label: "Social Media", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  social: { label: "Social Media", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  meta_ads: { label: "Meta Ads", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  google_ads: { label: "Google Ads", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  conteudo: { label: "Conteúdo", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  default: { label: "Reunião", className: "bg-muted text-muted-foreground" },
};

function getCategoryBadge(meeting: MeetingMinute) {
  const channel = meeting.focus_channels?.[0]?.toLowerCase().replace(/\s+/g, "_");
  return CATEGORY_STYLES[channel || ""] || CATEGORY_STYLES.default;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

function getRelativeDateLabel(date: Date) {
  if (isToday(date)) return "Hoje";
  if (isTomorrow(date)) return "Amanhã";
  return format(date, "dd 'de' MMM", { locale: ptBR });
}

export default function ClientMeetings() {
  const navigate = useNavigate();
  const [dataLoading, setDataLoading] = useState(true);
  const [meetings, setMeetings] = useState<MeetingMinute[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { clientId, loading: authLoading, error } = useClientUser();

  usePageMeta({
    title: "Minhas Reuniões - Área do Cliente",
    description: "Visualize as reuniões e atas da sua conta",
    keywords: "reuniões, atas, cliente, vivaz",
  });

  useEffect(() => {
    if (!authLoading && clientId) {
      loadMeetingsData();
    }
  }, [authLoading, clientId]);

  const loadMeetingsData = async () => {
    if (!clientId) return;

    try {
      // Buscar dashboards do cliente
      const { data: dashboardsData } = await supabase
        .from("client_dashboards")
        .select("id, name, dashboard_type")
        .eq("client_id", clientId)
        .eq("is_active", true);

      setDashboards(dashboardsData || []);

      // Buscar reuniões do cliente
      const { data: meetingsData, error: meetingsError } = await supabase
        .from("meeting_minutes")
        .select("*")
        .eq("client_id", clientId)
        .order("meeting_date", { ascending: false });

      if (meetingsError) throw meetingsError;

      setMeetings(meetingsData || []);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      toast.error("Erro ao carregar reuniões");
    } finally {
      setDataLoading(false);
    }
  };

  const handleViewMeeting = (meetingId: string) => {
    navigate(`/area-cliente/reunioes/${meetingId}`);
  };

  const handleOpenPublicLink = (meeting: MeetingMinute) => {
    const linkPath = meeting.slug || meeting.share_token;
    if (linkPath) {
      window.open(`https://hub.vivazagencia.com.br/reunioes/${linkPath}`, '_blank');
    } else {
      toast.error("Link público não disponível para esta reunião");
    }
  };

  const getDashboardNames = (dashboardIds: string[] | null) => {
    if (!dashboardIds || dashboardIds.length === 0) return [];
    return dashboards
      .filter(d => dashboardIds.includes(d.id))
      .map(d => d.name);
  };

  const filteredMeetings = useMemo(
    () =>
      meetings.filter((m) =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [meetings, searchQuery]
  );

  const upcomingMeetings = useMemo(
    () =>
      meetings
        .filter((m) => isFuture(new Date(m.meeting_date)))
        .sort(
          (a, b) =>
            new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime()
        ),
    [meetings]
  );
  const nextMeeting = upcomingMeetings[0];

  const monthMeetings = useMemo(
    () => meetings.filter((m) => isThisMonth(new Date(m.meeting_date))),
    [meetings]
  );
  const totalDurationMin = monthMeetings.reduce(
    (acc, m) => acc + (m.duration_min || 60),
    0
  );
  const totalHours = (totalDurationMin / 60).toFixed(1).replace(".", ",");
  const completedThisMonth = monthMeetings.filter(
    (m) => !isFuture(new Date(m.meeting_date)) || m.status === "aprovado"
  ).length;

  if (authLoading || dataLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">{error}</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reuniões</h1>
            <p className="text-sm text-muted-foreground">
              Visualize suas reuniões e atas com a Vivaz
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar reuniões..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
        </div>

        {meetings.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <p className="text-muted-foreground text-center">
                Nenhuma reunião disponível no momento
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Sidebar com Próxima + Métricas */}
            <div className="space-y-4 lg:col-span-1">
              <Card className="border-border/60">
                <CardContent className="p-5 space-y-4">
                  <h2 className="text-base font-semibold">Próxima Reunião</h2>
                  {nextMeeting ? (
                    <button
                      onClick={() => handleViewMeeting(nextMeeting.id)}
                      className="w-full text-left rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/0 to-primary/10 p-4 transition-all hover:border-primary/40 hover:shadow-sm"
                    >
                      <div className="text-primary font-semibold">
                        {getRelativeDateLabel(new Date(nextMeeting.meeting_date))},{" "}
                        {format(new Date(nextMeeting.meeting_date), "HH:mm")}
                      </div>
                      <div className="mt-1 font-semibold text-foreground line-clamp-2">
                        {nextMeeting.title}
                      </div>
                      {nextMeeting.meeting_link && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                          <Video className="h-4 w-4" />
                          <span className="truncate">Link da reunião</span>
                        </div>
                      )}
                    </button>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                      Sem reuniões agendadas
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardContent className="p-5 space-y-4">
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Métricas do Mês
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total de Horas</span>
                      <span className="font-semibold text-foreground">{totalHours}h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Concluídas</span>
                      <span className="font-semibold text-foreground">
                        {completedThisMonth}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lista de reuniões */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-min">
              {filteredMeetings.length === 0 && (
                <div className="sm:col-span-2 rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
                  Nenhuma reunião corresponde a "{searchQuery}"
                </div>
              )}

              {filteredMeetings.map((meeting) => {
                const category = getCategoryBadge(meeting);
                const meetingDate = new Date(meeting.meeting_date);
                const linkedDashboardNames = getDashboardNames(meeting.linked_dashboards);
                const actionItemsCount = meeting.action_items?.length || 0;

                return (
                  <Card
                    key={meeting.id}
                    className="group border-border/60 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer flex flex-col"
                    onClick={() => handleViewMeeting(meeting.id)}
                  >
                    <CardContent className="p-5 flex flex-col gap-3 flex-1">
                      <Badge
                        variant="secondary"
                        className={`w-fit text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 border-0 ${category.className}`}
                      >
                        {category.label}
                      </Badge>

                      <h3 className="font-semibold text-foreground leading-tight line-clamp-2">
                        {meeting.title}
                      </h3>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {safeFormatDate(meeting.meeting_date, "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {format(meetingDate, "HH:mm")}
                        </div>
                      </div>

                      {(actionItemsCount > 0 || linkedDashboardNames.length > 0) && (
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                          {actionItemsCount > 0 && (
                            <div className="flex items-center gap-1">
                              <CheckSquare className="h-3 w-3" />
                              {actionItemsCount} ação{actionItemsCount > 1 ? "ões" : ""}
                            </div>
                          )}
                          {linkedDashboardNames.length > 0 && (
                            <div className="line-clamp-1">
                              {linkedDashboardNames.slice(0, 2).join(", ")}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-auto flex items-center justify-between pt-3">
                        {meeting.participants && meeting.participants.length > 0 ? (
                          <div className="flex items-center -space-x-2">
                            {meeting.participants.slice(0, 3).map((name, i) => (
                              <div
                                key={`${name}-${i}`}
                                title={name}
                                className="h-7 w-7 rounded-full border-2 border-background bg-gradient-to-br from-primary/70 to-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center"
                              >
                                {getInitials(name)}
                              </div>
                            ))}
                            {meeting.participants.length > 3 && (
                              <div className="h-7 w-7 rounded-full border-2 border-background bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center">
                                +{meeting.participants.length - 3}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Sem participantes
                          </span>
                        )}

                        <div className="flex items-center gap-1">
                          {meeting.share_token && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPublicLink(meeting);
                              }}
                              title="Abrir link público"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewMeeting(meeting.id);
                            }}
                            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                          >
                            Ver Detalhes
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
