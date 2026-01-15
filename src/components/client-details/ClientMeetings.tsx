import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Pencil, Share2, Trash2, CheckSquare, RefreshCw, Calendar, Check, FileText, Rocket, ClipboardList, Copy } from "lucide-react";
import { toast } from "sonner";
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
import { GoogleCalendarManager } from "@/components/calendar/GoogleCalendarManager";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useMeetingCalendarSync } from "@/hooks/useMeetingCalendarSync";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
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
  linked_dashboards?: string[];
  linked_tasks?: string[];
  is_synced?: boolean;
}

interface ClientMeetingsProps {
  clientId: string;
}

interface Dashboard {
  id: string;
  name: string;
  dashboard_type: string;
}

export function ClientMeetings({ clientId }: ClientMeetingsProps) {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<MeetingMinute[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingMinute | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState<string | null>(null);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncedMeetingIds, setSyncedMeetingIds] = useState<Set<string>>(new Set());
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const { isConnected } = useGoogleCalendar();
  const { syncMeetingToCalendar, deleteMeetingFromCalendar, syncAllMeetings } = useMeetingCalendarSync();

  useEffect(() => {
    fetchMeetings();
    fetchClientData();
    if (isConnected) {
      fetchSyncedMeetings();
    }
  }, [clientId, isConnected]);

  const fetchSyncedMeetings = async () => {
    try {
      const { data } = await supabase
        .from("google_calendar_events")
        .select("meeting_id");
      
      setSyncedMeetingIds(new Set(data?.map(e => e.meeting_id) || []));
    } catch (error) {
      console.error("Erro ao buscar reuniões sincronizadas:", error);
    }
  };

  const fetchClientData = async () => {
    try {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("company_name, contact_email")
        .eq("id", clientId)
        .single();

      if (clientError) throw clientError;
      setClientName(clientData.company_name);
      setClientEmail(clientData.contact_email || null);

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

      // Sync to Google Calendar if connected
      if (isConnected) {
        await syncMeetingToCalendar({
          id: newMeeting.id,
          title: newMeeting.title,
          meeting_date: newMeeting.meeting_date,
          participants: [],
        });
        fetchSyncedMeetings();
      }

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
      navigate(`/clientes/${clientId}/reunioes/${newMeeting.id}?mode=edit`);
    } catch (error) {
      console.error("Erro ao criar reunião:", error);
      toast.error("Erro ao criar reunião");
    }
  };

  const handleImportEvent = async (event: {
    title: string;
    date: Date;
    description?: string;
    googleEventId?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const localDateTime = format(event.date, "yyyy-MM-dd'T'HH:mm");
      
      const { data: newMeeting, error } = await supabase
        .from("meeting_minutes")
        .insert({
          client_id: clientId,
          title: event.title,
          meeting_date: localDateTime,
          content: event.description || getMeetingTemplate('performance'),
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Link to existing Google Calendar event if imported
      if (event.googleEventId) {
        await supabase.from("google_calendar_events").insert({
          meeting_id: newMeeting.id,
          google_event_id: event.googleEventId,
          calendar_id: "primary",
        });
        fetchSyncedMeetings();
      }

      toast.success("Reunião importada! Redirecionando para edição...");
      navigate(`/clientes/${clientId}/reunioes/${newMeeting.id}?mode=edit`);
    } catch (error) {
      console.error("Erro ao importar evento:", error);
      toast.error("Erro ao importar evento");
    }
  };

  const handleViewMeeting = (meetingId: string) => {
    navigate(`/clientes/${clientId}/reunioes/${meetingId}?mode=view`);
  };

  const handleEditMeeting = (meetingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/clientes/${clientId}/reunioes/${meetingId}?mode=edit`);
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
      // Delete from Google Calendar first if synced
      if (isConnected && syncedMeetingIds.has(selectedMeeting.id)) {
        await deleteMeetingFromCalendar(selectedMeeting.id);
      }

      const { error } = await supabase
        .from("meeting_minutes")
        .delete()
        .eq("id", selectedMeeting.id);

      if (error) throw error;

      toast.success("Reunião deletada com sucesso!");
      setDeleteDialogOpen(false);
      setSelectedMeeting(null);
      fetchMeetings();
      if (isConnected) fetchSyncedMeetings();
    } catch (error) {
      console.error("Erro ao deletar reunião:", error);
      toast.error("Erro ao deletar reunião");
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const count = await syncAllMeetings(clientId);
      if (count > 0) {
        toast.success(`${count} reunião(ões) sincronizada(s) com Google Calendar`);
        fetchSyncedMeetings();
      } else {
        toast.info("Todas as reuniões já estão sincronizadas");
      }
    } catch (error) {
      console.error("Erro ao sincronizar:", error);
      toast.error("Erro ao sincronizar reuniões");
    } finally {
      setSyncingAll(false);
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
      navigate(`/clientes/${clientId}/reunioes/${newMeeting.id}?mode=edit`);
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2">
        <h2 className="text-xl font-bold">Reuniões</h2>
        <div className="flex gap-2">
          {isConnected && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSyncAll}
                disabled={syncingAll}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncingAll ? "animate-spin" : ""}`} />
                Sincronizar Todas
              </Button>
              <GoogleCalendarManager clientEmail={clientEmail || undefined} onImportEvent={handleImportEvent} />
            </>
          )}
          <Button onClick={() => setTemplateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Reunião
          </Button>
        </div>
      </div>

      {meetings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground mb-4">Nenhuma reunião encontrada</p>
            <Button onClick={() => setTemplateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Reunião
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <Card 
              key={meeting.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewMeeting(meeting.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium leading-tight">
                    {meeting.title}
                  </CardTitle>
                  {isConnected && syncedMeetingIds.has(meeting.id) && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <Check className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {meeting.linked_tasks && meeting.linked_tasks.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckSquare className="h-3 w-3 flex-shrink-0" />
                    <span>{meeting.linked_tasks.length} atividade(s)</span>
                  </div>
                )}

                {meeting.participants && meeting.participants.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{meeting.participants.slice(0, 2).join(", ")}</span>
                    {meeting.participants.length > 2 && (
                      <span>+{meeting.participants.length - 2}</span>
                    )}
                  </div>
                )}

                <div className="flex gap-1 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => handleEditMeeting(meeting.id, e)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDuplicateMeeting(meeting, e)}
                    title="Duplicar"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
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
          ))}
        </div>
      )}

      {selectedMeeting && (
        <ShareMeetingDialog
          shareToken={selectedMeeting.share_token || ""}
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
