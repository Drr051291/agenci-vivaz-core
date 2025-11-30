import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/meeting-editor/RichTextEditor";
import { DashboardCard } from "@/components/meeting-editor/DashboardCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save, Calendar, Users, CheckSquare, LayoutDashboard } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Dashboard {
  id: string;
  name: string;
  dashboard_type: string;
  embed_url: string | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
}

const AUTOSAVE_DELAY = 3000;

export default function MeetingEditor() {
  const { clientId, meetingId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [clientName, setClientName] = useState("");
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDashboards, setSelectedDashboards] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [meetingData, setMeetingData] = useState({
    meeting_date: "",
    participants: [] as string[],
    content: "",
    action_items: [] as string[],
    title: "",
  });

  useEffect(() => {
    if (!meetingId || loading) return;

    const timer = setTimeout(() => {
      handleAutoSave();
    }, AUTOSAVE_DELAY);

    return () => clearTimeout(timer);
  }, [meetingData, selectedDashboards, selectedTasks]);

  useEffect(() => {
    if (clientId && meetingId) {
      loadMeetingData();
    }
  }, [clientId, meetingId]);

  const loadMeetingData = async () => {
    try {
      const { data: clientData } = await supabase
        .from("clients")
        .select("company_name")
        .eq("id", clientId)
        .single();

      if (clientData) {
        setClientName(clientData.company_name);
      }

      const { data: dashboardsData } = await supabase
        .from("client_dashboards")
        .select("id, name, dashboard_type, embed_url")
        .eq("client_id", clientId)
        .eq("is_active", true);

      setDashboards(dashboardsData || []);

      const { data: tasksData } = await supabase
        .from("tasks")
        .select("id, title, status")
        .eq("client_id", clientId)
        .in("status", ["pending", "in_progress"]);

      setTasks(tasksData || []);

      const { data: meetingDataRes, error } = await supabase
        .from("meeting_minutes")
        .select("*")
        .eq("id", meetingId)
        .single();

      if (error) throw error;

      setMeetingData({
        meeting_date: meetingDataRes.meeting_date,
        participants: meetingDataRes.participants || [],
        content: meetingDataRes.content,
        action_items: meetingDataRes.action_items || [],
        title: meetingDataRes.title,
      });
      setSelectedDashboards(meetingDataRes.linked_dashboards || []);
      setSelectedTasks(meetingDataRes.linked_tasks || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar reunião");
      navigate(`/clientes/${clientId}`);
    } finally {
      setLoading(false);
    }
  };

  const generateTitle = (date: string) => {
    const meetingDate = new Date(date);
    const formattedDate = format(meetingDate, "dd/MM/yyyy", { locale: ptBR });
    return `Vivaz - ${clientName} - ${formattedDate}`;
  };

  const handleAutoSave = useCallback(async () => {
    if (!meetingId || isSaving) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("meeting_minutes")
        .update({
          title: generateTitle(meetingData.meeting_date),
          meeting_date: meetingData.meeting_date,
          participants: meetingData.participants.length > 0 ? meetingData.participants : null,
          content: meetingData.content,
          action_items: meetingData.action_items.length > 0 ? meetingData.action_items : null,
          linked_dashboards: selectedDashboards.length > 0 ? selectedDashboards : null,
          linked_tasks: selectedTasks.length > 0 ? selectedTasks : null,
        })
        .eq("id", meetingId);

      if (error) throw error;
    } catch (error) {
      console.error("Erro no autosave:", error);
    } finally {
      setIsSaving(false);
    }
  }, [meetingData, selectedDashboards, selectedTasks, meetingId, isSaving, clientName]);

  const handleSave = async () => {
    await handleAutoSave();
    toast.success("Reunião salva com sucesso!");
  };

  const handleDashboardToggle = (dashboardId: string) => {
    setSelectedDashboards(prev =>
      prev.includes(dashboardId)
        ? prev.filter(id => id !== dashboardId)
        : [...prev, dashboardId]
    );
  };

  const handleTaskToggle = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/clientes/${clientId}`)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">
                  {meetingData.title || "Nova Reunião"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {clientName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn(
                "text-sm",
                isSaving ? "text-muted-foreground animate-pulse" : "text-emerald-600"
              )}>
                {isSaving ? "Salvando..." : "✓ Salvo"}
              </span>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-8 py-8 space-y-8">
        {/* Metadata Section - Inline */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data da Reunião
              </label>
              <Input
                type="date"
                value={meetingData.meeting_date}
                onChange={(e) =>
                  setMeetingData({
                    ...meetingData,
                    meeting_date: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participantes
              </label>
              <Input
                placeholder="João Silva, Maria Santos..."
                value={meetingData.participants.join(", ")}
                onChange={(e) =>
                  setMeetingData({
                    ...meetingData,
                    participants: e.target.value
                      .split(",")
                      .map((p) => p.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Itens de Ação
              </label>
              <Textarea
                placeholder="Enviar proposta, Agendar follow-up..."
                value={meetingData.action_items.join(", ")}
                onChange={(e) =>
                  setMeetingData({
                    ...meetingData,
                    action_items: e.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                rows={2}
              />
            </div>
          </div>
        </Card>

        {/* Dashboards Section */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            Dashboards Vinculados
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {dashboards.map((dashboard) => (
              <DashboardCard
                key={dashboard.id}
                id={dashboard.id}
                name={dashboard.name}
                type={dashboard.dashboard_type}
                embedUrl={dashboard.embed_url || undefined}
                isSelected={selectedDashboards.includes(dashboard.id)}
                onToggle={handleDashboardToggle}
              />
            ))}
          </div>
        </Card>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rich Text Editor - 2/3 */}
          <Card className="p-6 lg:col-span-2">
            <label className="text-sm font-medium mb-4 block">
              📝 Conteúdo da Reunião
            </label>
            <RichTextEditor
              content={meetingData.content}
              onChange={(content) =>
                setMeetingData({ ...meetingData, content })
              }
              placeholder="Descreva o que foi discutido na reunião..."
            />
          </Card>

          {/* Tasks - 1/3 */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Atividades Vinculadas
            </h3>
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border"
                >
                  <Checkbox
                    checked={selectedTasks.includes(task.id)}
                    onCheckedChange={() => handleTaskToggle(task.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{task.title}</p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {task.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
