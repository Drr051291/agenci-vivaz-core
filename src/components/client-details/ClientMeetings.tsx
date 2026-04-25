import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Users,
  Pencil,
  Share2,
  Trash2,
  CheckSquare,
  FileText,
  Rocket,
  ClipboardList,
  Copy,
  Search,
  Calendar as CalendarIcon,
  Clock,
  Video,
  ArrowRight,
  CalendarPlus,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { getMeetingSlug } from "@/hooks/useSlugResolver";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShareMeetingDialog } from "@/components/meeting-editor/ShareMeetingDialog";
import { format, isToday, isTomorrow, isThisMonth, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getMeetingTemplate, MEETING_TEMPLATE_OPTIONS, type MeetingTemplateType } from "@/lib/meetingTemplates";
import { createNotification, getClientUserId } from "@/lib/notifications";

interface MeetingMinute {
  id: string;
  title: string;
  meeting_date: string;
  participants?: string[];
  content: string;
  action_items?: string[];
  created_at: string;
  share_token?: string;
  slug?: string;
  linked_dashboards?: string[];
  linked_tasks?: string[];
  focus_channels?: string[];
  status?: string;
  duration_min?: number;
  meeting_link?: string;
}

interface ClientMeetingsProps {
  clientId: string;
  clientSlug?: string;
}

interface Dashboard {
  id: string;
  name: string;
  dashboard_type: string;
}

// Map focus channel keys to category badge configurations
const CATEGORY_STYLES: Record<string, { label: string; className: string }> = {
  estrategico: { label: "Estratégico", className: "bg-primary/10 text-primary" },
  performance: { label: "Performance", className: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400" },
  social_media: { label: "Social Media", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  social: { label: "Social Media", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  meta_ads: { label: "Meta Ads", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  google_ads: { label: "Google Ads", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  conteudo: { label: "Conteúdo", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  email: { label: "E-mail", className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
  default: { label: "Reunião", className: "bg-muted text-muted-foreground" },
};

function getCategoryBadge(meeting: MeetingMinute) {
  const channel = meeting.focus_channels?.[0]?.toLowerCase().replace(/\s+/g, "_");
  return CATEGORY_STYLES[channel || ""] || CATEGORY_STYLES.default;
}

function getRelativeDateLabel(date: Date) {
  if (isToday(date)) return "Hoje";
  if (isTomorrow(date)) return "Amanhã";
  return format(date, "dd/MM/yyyy", { locale: ptBR });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
}

function ParticipantAvatars({ participants }: { participants?: string[] }) {
  if (!participants || participants.length === 0) return null;
  const visible = participants.slice(0, 3);
  const extra = participants.length - visible.length;
  return (
    <div className="flex items-center -space-x-2">
      {visible.map((name, i) => (
        <div
          key={`${name}-${i}`}
          title={name}
          className="h-7 w-7 rounded-full border-2 border-background bg-gradient-to-br from-primary/70 to-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center"
        >
          {getInitials(name)}
        </div>
      ))}
      {extra > 0 && (
        <div className="h-7 w-7 rounded-full border-2 border-background bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center">
          +{extra}
        </div>
      )}
    </div>
  );
}

export function ClientMeetings({ clientId, clientSlug }: ClientMeetingsProps) {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<MeetingMinute[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingMinute | null>(null);
  const [clientName, setClientName] = useState("");
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    fetchMeetings();
    fetchClientData();
  }, [clientId]);

  const fetchClientData = async () => {
    try {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("company_name, contact_email")
        .eq("id", clientId)
        .single();

      if (clientError) throw clientError;
      setClientName(clientData.company_name);

      const { data: dashboardsData, error: dashboardsError } = await supabase
        .from("client_dashboards")
        .select("id, name, dashboard_type")
        .eq("client_id", clientId)
        .eq("is_active", true);

      if (dashboardsError) throw dashboardsError;
      setDashboards(dashboardsData || []);
    } catch (error) {
      console.error("Erro ao buscar dados do cliente:", error);
    }
  };

  const fetchMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from("meeting_minutes")
        .select("*")
        .eq("client_id", clientId)
        .order("meeting_date", { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error("Erro ao buscar reuniões:", error);
      toast.error("Erro ao carregar reuniões");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async (templateType: MeetingTemplateType = 'performance') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date();
      const localDateTime = format(now, "yyyy-MM-dd'T'HH:mm");
      
      const { data: newMeeting, error } = await supabase
        .from("meeting_minutes")
        .insert({
          client_id: clientId,
          title: `Vivaz - ${clientName} - Nova Reunião`,
          meeting_date: localDateTime,
          content: getMeetingTemplate(templateType),
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Enviar notificação para o cliente
      const clientUserId = await getClientUserId(clientId);
      if (clientUserId) {
        await createNotification({
          userId: clientUserId,
          title: "Nova reunião disponível",
          message: `Uma nova reunião "${newMeeting.title}" foi criada e está disponível para visualização.`,
          category: "meeting",
          referenceId: newMeeting.id,
          referenceType: "meeting",
          clientId: clientId,
          sendEmail: true,
        });
      }

      setTemplateDialogOpen(false);
      toast.success("Reunião criada! Redirecionando para edição...");
      const slug = await getMeetingSlug(newMeeting.id);
      const clientPath = clientSlug || clientId;
      navigate(`/clientes/${clientPath}/reunioes/${slug}?mode=edit`);
    } catch (error) {
      console.error("Erro ao criar reunião:", error);
      toast.error("Erro ao criar reunião");
    }
  };

  const handleViewMeeting = async (meetingId: string) => {
    const slug = await getMeetingSlug(meetingId);
    const clientPath = clientSlug || clientId;
    navigate(`/clientes/${clientPath}/reunioes/${slug}?mode=view`);
  };

  const handleEditMeeting = async (meetingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const slug = await getMeetingSlug(meetingId);
    const clientPath = clientSlug || clientId;
    navigate(`/clientes/${clientPath}/reunioes/${slug}?mode=edit`);
  };

  const handleShare = (meeting: MeetingMinute) => {
    setSelectedMeeting(meeting);
    setShareDialogOpen(true);
  };

  const handleDeleteClick = (meeting: MeetingMinute) => {
    setSelectedMeeting(meeting);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMeeting) return;

    try {
      const { error } = await supabase
        .from("meeting_minutes")
        .delete()
        .eq("id", selectedMeeting.id);

      if (error) throw error;

      toast.success("Reunião deletada com sucesso!");
      setDeleteDialogOpen(false);
      setSelectedMeeting(null);
      fetchMeetings();
    } catch (error) {
      console.error("Erro ao deletar reunião:", error);
      toast.error("Erro ao deletar reunião");
    }
  };

  const handleDuplicateMeeting = async (meeting: MeetingMinute, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch all related data
      const [sectionsRes, metricsRes, channelsRes] = await Promise.all([
        supabase.from("meeting_sections").select("*").eq("meeting_id", meeting.id),
        supabase.from("meeting_metrics").select("*").eq("meeting_id", meeting.id),
        supabase.from("meeting_channels").select("*").eq("meeting_id", meeting.id),
      ]);

      // Create new meeting with same content
      const now = new Date();
      const localDateTime = format(now, "yyyy-MM-dd'T'HH:mm");
      
      const { data: newMeeting, error } = await supabase
        .from("meeting_minutes")
        .insert({
          client_id: clientId,
          title: `${meeting.title} (cópia)`,
          meeting_date: localDateTime,
          content: meeting.content,
          participants: meeting.participants,
          action_items: meeting.action_items,
          linked_dashboards: meeting.linked_dashboards,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Duplicate sections
      if (sectionsRes.data && sectionsRes.data.length > 0) {
        const newSections = sectionsRes.data.map(s => ({
          meeting_id: newMeeting.id,
          section_key: s.section_key,
          title: s.title,
          content_json: s.content_json,
          sort_order: s.sort_order,
          is_collapsed: s.is_collapsed,
          metadata: s.metadata,
        }));
        await supabase.from("meeting_sections").insert(newSections);
      }

      // Duplicate metrics
      if (metricsRes.data && metricsRes.data.length > 0) {
        const newMetrics = metricsRes.data.map(m => ({
          meeting_id: newMeeting.id,
          metric_key: m.metric_key,
          metric_label: m.metric_label,
          target_value: m.target_value,
          actual_value: m.actual_value,
          unit: m.unit,
          variation_pct: m.variation_pct,
          sort_order: m.sort_order,
          quick_note: m.quick_note,
        }));
        await supabase.from("meeting_metrics").insert(newMetrics);
      }

      // Duplicate channels
      if (channelsRes.data && channelsRes.data.length > 0) {
        const newChannels = channelsRes.data.map(c => ({
          meeting_id: newMeeting.id,
          channel: c.channel,
          investment: c.investment,
          leads: c.leads,
          conversions: c.conversions,
          revenue: c.revenue,
          cpl: c.cpl,
          cpa: c.cpa,
          roas: c.roas,
          what_worked: c.what_worked,
          what_to_adjust: c.what_to_adjust,
          impressions: c.impressions,
          clicks: c.clicks,
          notes: c.notes,
        }));
        await supabase.from("meeting_channels").insert(newChannels);
      }

      toast.success("Reunião duplicada com sucesso!");
      fetchMeetings();
      const slug = await getMeetingSlug(newMeeting.id);
      const clientPath = clientSlug || clientId;
      navigate(`/clientes/${clientPath}/reunioes/${slug}?mode=edit`);
    } catch (error) {
      console.error("Erro ao duplicar reunião:", error);
      toast.error("Erro ao duplicar reunião");
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Filtered meetings (search)
  const filteredMeetings = meetings.filter((m) =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Next upcoming meeting
  const upcomingMeetings = meetings
    .filter((m) => isFuture(new Date(m.meeting_date)))
    .sort((a, b) => new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime());
  const nextMeeting = upcomingMeetings[0];

  // Month metrics
  const monthMeetings = meetings.filter((m) => isThisMonth(new Date(m.meeting_date)));
  const totalDurationMin = monthMeetings.reduce((acc, m) => acc + (m.duration_min || 60), 0);
  const totalHours = (totalDurationMin / 60).toFixed(1).replace(".", ",");
  const completedThisMonth = monthMeetings.filter(
    (m) => !isFuture(new Date(m.meeting_date)) || m.status === "aprovado"
  ).length;
  const completionRate = monthMeetings.length
    ? Math.round((completedThisMonth / monthMeetings.length) * 100)
    : 0;

  // Other meetings (excluding the highlighted next one)
  const listMeetings = filteredMeetings.filter((m) => m.id !== nextMeeting?.id);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(listMeetings.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedMeetings = listMeetings.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      {/* Header with search + CTA */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Reuniões</h2>
          <p className="text-sm text-muted-foreground">
            {meetings.length} {meetings.length === 1 ? "conversa registrada" : "conversas registradas"}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar reuniões..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <Button onClick={() => setTemplateDialogOpen(true)} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Nova Reunião
          </Button>
        </div>
      </div>

      {meetings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <CalendarPlus className="h-6 w-6 text-primary" />
            </div>
            <p className="text-muted-foreground mb-4">Nenhuma reunião encontrada</p>
            <Button onClick={() => setTemplateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Reunião
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Sidebar: Próxima Reunião + Métricas do Mês */}
          <div className="space-y-4 lg:col-span-1">
            {/* Próxima Reunião */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Próxima Reunião</CardTitle>
              </CardHeader>
              <CardContent>
                {nextMeeting ? (
                  <button
                    onClick={() => handleViewMeeting(nextMeeting.id)}
                    className="w-full text-left rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/0 to-primary/10 p-4 transition-all hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="text-primary font-semibold text-base">
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

            {/* Métricas do Mês */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Métricas do Mês
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total de Horas</span>
                  <span className="font-semibold text-foreground">{totalHours}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Concluídas</span>
                  <span className="font-semibold text-foreground">{completedThisMonth}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-muted-foreground text-right">
                    {completionRate}% do mês
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Meetings grid (right side) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
            {listMeetings.length === 0 && filteredMeetings.length === 0 && (
              <div className="sm:col-span-2 xl:col-span-3 rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
                Nenhuma reunião corresponde a "{searchQuery}"
              </div>
            )}

            {paginatedMeetings.map((meeting) => {
              const category = getCategoryBadge(meeting);
              const meetingDate = new Date(meeting.meeting_date);
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
                        {format(meetingDate, "dd/MM/yyyy")}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {format(meetingDate, "HH:mm")}
                      </div>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-3">
                      <ParticipantAvatars participants={meeting.participants} />
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

                    {/* Hidden actions on hover */}
                    <div className="flex items-center gap-1 pt-2 border-t border-border/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs flex-1"
                        onClick={(e) => handleEditMeeting(meeting.id, e)}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateMeeting(meeting, e);
                        }}
                        title="Duplicar"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(meeting);
                        }}
                        title="Compartilhar"
                      >
                        <Share2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(meeting);
                        }}
                        title="Deletar"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Empty placeholder card to schedule a new meeting */}
            {safePage === totalPages && (
              <button
                onClick={() => setTemplateDialogOpen(true)}
                className="rounded-xl border-2 border-dashed border-border/70 hover:border-primary/40 hover:bg-primary/5 transition-colors min-h-[200px] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
              >
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="text-sm font-semibold">Agendar nova conversa</div>
                <div className="text-[11px] text-muted-foreground/80">
                  Clique para criar uma nova reunião
                </div>
              </button>
            )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <p className="text-xs text-muted-foreground">
                  Mostrando <span className="font-semibold text-foreground">{(safePage - 1) * PAGE_SIZE + 1}</span>
                  {" - "}
                  <span className="font-semibold text-foreground">
                    {Math.min(safePage * PAGE_SIZE, listMeetings.length)}
                  </span>
                  {" de "}
                  <span className="font-semibold text-foreground">{listMeetings.length}</span> reuniões
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={page === safePage ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0 text-xs"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedMeeting && (
        <ShareMeetingDialog
          shareToken={selectedMeeting.share_token || ""}
          meetingSlug={selectedMeeting.slug}
          meetingTitle={selectedMeeting.title}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta reunião? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Template Selection Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Escolher Template</DialogTitle>
            <DialogDescription>
              Selecione um modelo para sua reunião
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {MEETING_TEMPLATE_OPTIONS.map((option) => {
              const icons: Record<MeetingTemplateType, React.ReactNode> = {
                performance: <FileText className="h-5 w-5 text-primary" />,
                kickoff: <Rocket className="h-5 w-5 text-emerald-600" />,
                simple: <ClipboardList className="h-5 w-5 text-blue-600" />,
              };
              return (
                <button
                  key={option.value}
                  onClick={() => handleCreateMeeting(option.value)}
                  className="flex items-start gap-4 p-4 rounded-lg border hover:border-primary hover:bg-muted/50 transition-all text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    {icons[option.value]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
