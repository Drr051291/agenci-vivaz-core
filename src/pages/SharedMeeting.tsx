import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";
import { MeetingPresentationView } from "@/components/meetings/MeetingPresentationView";

interface MeetingMinute {
  id: string;
  title: string;
  meeting_date: string;
  participants?: string[];
  content: string;
  action_items?: string[];
  created_at: string;
  next_period_priority?: string;
  analysis_period_start?: string;
  analysis_period_end?: string;
  client_id?: string;
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
  priority?: string;
  profiles?: { full_name: string } | null;
}

export default function SharedMeeting() {
  const { token } = useParams<{ token: string }>();
  const [meeting, setMeeting] = useState<MeetingMinute | null>(null);
  const [sections, setSections] = useState<MeetingSection[]>([]);
  const [metrics, setMetrics] = useState<MeetingMetric[]>([]);
  const [channels, setChannels] = useState<MeetingChannel[]>([]);
  const [actionPlanItems, setActionPlanItems] = useState<ActionPlanItem[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [loading, setLoading] = useState(true);

  usePageMeta({
    title: meeting ? meeting.title : "Reunião Compartilhada",
    description: `Reunião compartilhada - ${meeting?.title || 'HUB Vivaz'}`,
    keywords: "reunião, compartilhada, vivaz",
  });

  useEffect(() => {
    if (token) {
      fetchMeetingData();
    }
  }, [token]);

  const fetchMeetingData = async () => {
    try {
      // Fetch meeting
      const { data: meetingData, error: meetingError } = await supabase
        .from("meeting_minutes")
        .select("*")
        .eq("share_token", token)
        .single();

      if (meetingError) throw meetingError;
      setMeeting(meetingData);

      // Fetch all related data in parallel
      const [sectionsRes, metricsRes, channelsRes] = await Promise.all([
        supabase
          .from("meeting_sections")
          .select("*")
          .eq("meeting_id", meetingData.id)
          .order("sort_order"),
        supabase
          .from("meeting_metrics")
          .select("*")
          .eq("meeting_id", meetingData.id)
          .order("sort_order"),
        supabase
          .from("meeting_channels")
          .select("*")
          .eq("meeting_id", meetingData.id),
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

      // Fetch recent tasks for retrovisor if client_id exists
      if (meetingData.client_id) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: tasksData } = await supabase
          .from("tasks")
          .select("id, title, status, priority, due_date, category, assigned_to, meeting_excluded_from")
          .eq("client_id", meetingData.client_id)
          .gte("created_at", sevenDaysAgo.toISOString())
          .in("status", ["pendente", "em_andamento", "concluido", "solicitado"])
          .order("created_at", { ascending: false });

        // Filter tasks not excluded from this meeting
        const filteredTasks = (tasksData || []).filter(task => {
          const excludedFrom = (task as any).meeting_excluded_from || [];
          return !excludedFrom.includes(meetingData.id);
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
          priority: task.priority,
          profiles: task.assigned_to ? { full_name: profilesMap[task.assigned_to] || "" } : null
        }));
        
        setRecentTasks(tasksWithProfiles);
      }
    } catch (error) {
      console.error("Erro ao buscar reunião:", error);
      toast.error("Reunião não encontrada ou link inválido");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Reunião não encontrada</h2>
            <p className="text-muted-foreground">
              O link pode estar incorreto ou a reunião pode ter sido removida.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <MeetingPresentationView
          meeting={meeting}
          sections={sections}
          metrics={metrics}
          channels={channels}
          recentTasks={recentTasks}
          actionPlanItems={actionPlanItems}
        />
      </div>
    </div>
  );
}
