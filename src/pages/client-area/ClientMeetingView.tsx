import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useClientUser } from "@/hooks/useClientUser";
import { MeetingPresentationView } from "@/components/meetings/MeetingPresentationView";

interface MeetingData {
  id: string;
  title: string;
  meeting_date: string;
  participants: string[] | null;
  content: string;
  action_items: string[] | null;
  client_id: string;
  share_token: string | null;
  analysis_period_start?: string | null;
  analysis_period_end?: string | null;
  next_period_priority?: string | null;
}

interface MeetingSection {
  id: string;
  section_key: string;
  title: string;
  content_json: any;
  sort_order: number;
}

interface MeetingMetric {
  id: string;
  metric_key: string;
  metric_label: string;
  target_value: number | null;
  actual_value: number | null;
  unit: string | null;
  variation_pct: number | null;
}

interface MeetingChannel {
  id: string;
  channel: string;
  investment: number | null;
  leads: number | null;
  conversions: number | null;
  revenue: number | null;
  cpl: number | null;
  cpa: number | null;
  roas: number | null;
  what_worked: string | null;
  what_to_adjust: string | null;
}

interface ActionPlanItem {
  title: string;
  responsible?: string;
  deadline?: string;
  status?: string;
  owner_type?: string;
  category?: string;
}

interface RecentTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  profiles?: { full_name: string } | null;
}

export default function ClientMeetingView() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [dataLoading, setDataLoading] = useState(true);
  const [meetingData, setMeetingData] = useState<MeetingData | null>(null);
  const [sections, setSections] = useState<MeetingSection[]>([]);
  const [metrics, setMetrics] = useState<MeetingMetric[]>([]);
  const [channels, setChannels] = useState<MeetingChannel[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [actionPlanItems, setActionPlanItems] = useState<ActionPlanItem[]>([]);

  const { clientId, loading: authLoading, error } = useClientUser();

  usePageMeta({
    title: meetingData?.title || "Reunião - Área do Cliente",
    description: `Visualize os detalhes da reunião ${meetingData?.title || ''}`,
    keywords: "reunião, ata, cliente, vivaz",
  });

  useEffect(() => {
    if (!authLoading && clientId && meetingId) {
      loadMeetingData();
    }
  }, [authLoading, clientId, meetingId]);

  const loadMeetingData = async () => {
    if (!clientId || !meetingId) return;

    try {
      const { data: meeting, error: meetingError } = await supabase
        .from("meeting_minutes")
        .select("id, title, meeting_date, participants, content, action_items, client_id, share_token, analysis_period_start, analysis_period_end, next_period_priority")
        .eq("id", meetingId)
        .eq("client_id", clientId)
        .single();

      if (meetingError || !meeting) {
        toast.error("Reunião não encontrada");
        navigate("/area-cliente/reunioes");
        return;
      }

      setMeetingData(meeting);

      // Fetch sections, metrics, channels in parallel
      const [sectionsRes, metricsRes, channelsRes] = await Promise.all([
        supabase
          .from("meeting_sections")
          .select("*")
          .eq("meeting_id", meeting.id)
          .order("sort_order"),
        supabase
          .from("meeting_metrics")
          .select("*")
          .eq("meeting_id", meeting.id)
          .order("sort_order"),
        supabase
          .from("meeting_channels")
          .select("*")
          .eq("meeting_id", meeting.id),
      ]);

      setSections(sectionsRes.data || []);
      setMetrics(metricsRes.data || []);
      setChannels(channelsRes.data || []);

      // Parse action plan from sections
      const actionPlanSection = sectionsRes.data?.find(s => s.section_key === "action_plan");
      const contentJson = actionPlanSection?.content_json as any;
      if (contentJson?.vivazTasks || contentJson?.clientTasks) {
        const vivazTasks = (contentJson.vivazTasks || []).map((t: any) => ({ ...t, owner_type: 'vivaz' }));
        const clientTasks = (contentJson.clientTasks || []).map((t: any) => ({ ...t, owner_type: 'client' }));
        setActionPlanItems([...vivazTasks, ...clientTasks]);
      } else if (contentJson?.items) {
        setActionPlanItems(contentJson.items);
      } else if (contentJson?.actions) {
        setActionPlanItems(contentJson.actions);
      }

      // Fetch all tasks for this client
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, category, assigned_to, meeting_excluded_from")
        .eq("client_id", clientId)
        .in("status", ["pendente", "em_andamento", "concluido", "solicitado"])
        .order("created_at", { ascending: false });

      // Filter tasks not excluded from this meeting
      const filteredTasks = (tasksData || []).filter(task => {
        const excludedFrom = (task as any).meeting_excluded_from || [];
        return !excludedFrom.includes(meeting.id);
      });

      // Get profiles for assigned users
      const assignedIds = [...new Set(filteredTasks.map(t => t.assigned_to).filter(Boolean))];
      let profilesMap: Record<string, string> = {};
      
      if (assignedIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", assignedIds);
        
        profilesMap = (profilesData || []).reduce((acc, p) => {
          acc[p.id] = p.full_name;
          return acc;
        }, {} as Record<string, string>);
      }

      const tasksWithProfiles = filteredTasks.map(task => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority || "medium",
        profiles: task.assigned_to ? { full_name: profilesMap[task.assigned_to] || "" } : null
      }));
      
      setRecentTasks(tasksWithProfiles);
    } catch (err) {
      console.error("Erro ao carregar reunião:", err);
      toast.error("Erro ao carregar reunião");
      navigate("/area-cliente/reunioes");
    } finally {
      setDataLoading(false);
    }
  };

  const handleOpenPublicLink = () => {
    if (meetingData?.share_token) {
      window.open(`https://hub.vivazagencia.com.br/reunioes/${meetingData.share_token}`, '_blank');
    } else {
      toast.error("Link público não disponível para esta reunião");
    }
  };

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

  if (!meetingData) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Reunião não encontrada</h1>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Reunião não encontrada</p>
              <Button
                onClick={() => navigate("/area-cliente/reunioes")}
                className="mt-4"
              >
                Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/area-cliente/reunioes")}
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Voltar
          </Button>
          {meetingData.share_token && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenPublicLink}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Abrir Link Público
            </Button>
          )}
        </div>

        {/* Meeting Content */}
        <MeetingPresentationView
          meeting={meetingData}
          sections={sections}
          metrics={metrics}
          channels={channels}
          recentTasks={recentTasks}
          actionPlanItems={actionPlanItems}
        />
      </div>
    </DashboardLayout>
  );
}
