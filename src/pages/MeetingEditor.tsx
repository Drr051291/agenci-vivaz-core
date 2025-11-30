import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/meeting-editor/RichTextEditor";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save, LayoutDashboard, CheckSquare, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

const AUTOSAVE_DELAY = 3000; // 3 segundos

export default function MeetingEditor() {
  const { clientId, meetingId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [clientName, setClientName] = useState("");
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDashboards, setSelectedDashboards] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    meeting_date: "",
    participants: "",
    content: "",
    action_items: "",
  });

  // Autosave com debounce
  useEffect(() => {
    if (!meetingId || loading) return;

    const timer = setTimeout(() => {
      handleAutoSave();
    }, AUTOSAVE_DELAY);

    return () => clearTimeout(timer);
  }, [formData, selectedDashboards, selectedTasks]);

  useEffect(() => {
    if (clientId && meetingId) {
      loadMeetingData();
    }
  }, [clientId, meetingId]);

  const loadMeetingData = async () => {
    try {
      // Buscar dados do cliente
      const { data: clientData } = await supabase
        .from("clients")
        .select("company_name")
        .eq("id", clientId)
        .single();

      if (clientData) {
        setClientName(clientData.company_name);
      }

      // Buscar dashboards
      const { data: dashboardsData } = await supabase
        .from("client_dashboards")
        .select("id, name, dashboard_type, embed_url")
        .eq("client_id", clientId)
        .eq("is_active", true);

      setDashboards(dashboardsData || []);

      // Buscar tasks
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("id, title, status")
        .eq("client_id", clientId)
        .in("status", ["pending", "in_progress"]);

      setTasks(tasksData || []);

      // Buscar dados da reunião
      const { data: meetingData, error } = await supabase
        .from("meeting_minutes")
        .select("*")
        .eq("id", meetingId)
        .single();

      if (error) throw error;

      setFormData({
        meeting_date: meetingData.meeting_date,
        participants: meetingData.participants?.join(", ") || "",
        content: meetingData.content,
        action_items: meetingData.action_items?.join(", ") || "",
      });
      setSelectedDashboards(meetingData.linked_dashboards || []);
      setSelectedTasks(meetingData.linked_tasks || []);
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

  const generateDashboardsSection = () => {
    if (selectedDashboards.length === 0) {
      return "<p><em>Nenhum dashboard selecionado para esta reunião.</em></p>";
    }
    
    const dashboardsContent = selectedDashboards
      .map(id => {
        const dashboard = dashboards.find(d => d.id === id);
        if (!dashboard) return "";
        
        const shareUrl = `${window.location.origin}/area-cliente/dashboards?dashboard=${dashboard.id}`;
        return `
          <div style="margin: 20px 0; padding: 15px; border: 1px solid #e5e5e5; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0;">${dashboard.name} (${dashboard.dashboard_type})</h3>
            ${dashboard.embed_url ? `
              <iframe 
                src="${dashboard.embed_url}" 
                style="width: 100%; height: 600px; border: none; border-radius: 4px;"
                frameborder="0"
                allowfullscreen
              ></iframe>
            ` : ''}
            <p style="margin-top: 10px; font-size: 14px;">
              <a href="${shareUrl}" target="_blank" style="color: #DA60F4; text-decoration: none;">
                🔗 Abrir dashboard em nova aba
              </a>
            </p>
          </div>
        `;
      })
      .join("");
    
    return dashboardsContent;
  };

  const handleAutoSave = useCallback(async () => {
    if (!meetingId || saving) return;

    setSaving(true);
    try {
      const participants = formData.participants
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p);

      const actionItems = formData.action_items
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item);

      let finalContent = formData.content;
      const dashboardsSection = generateDashboardsSection();
      finalContent = finalContent.replace(
        /<p><em>Os dashboards serão inseridos automaticamente aqui\.<\/em><\/p>/,
        dashboardsSection
      );

      const { error } = await supabase
        .from("meeting_minutes")
        .update({
          title: generateTitle(formData.meeting_date),
          meeting_date: formData.meeting_date,
          participants: participants.length > 0 ? participants : null,
          content: finalContent,
          action_items: actionItems.length > 0 ? actionItems : null,
          linked_dashboards: selectedDashboards.length > 0 ? selectedDashboards : null,
          linked_tasks: selectedTasks.length > 0 ? selectedTasks : null,
        })
        .eq("id", meetingId);

      if (error) throw error;
      setLastSaved(new Date());
    } catch (error) {
      console.error("Erro no autosave:", error);
    } finally {
      setSaving(false);
    }
  }, [formData, selectedDashboards, selectedTasks, meetingId, saving]);

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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header fixo */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/clientes/${clientId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-xl font-bold">{generateTitle(formData.meeting_date)}</h1>
              {lastSaved && (
                <p className="text-xs text-muted-foreground">
                  {saving ? "Salvando..." : `Salvo ${format(lastSaved, "HH:mm:ss")}`}
                </p>
              )}
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </header>

      {/* Conteúdo principal */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna principal - Editor */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label htmlFor="meeting_date">Data da Reunião</Label>
                  <Input
                    id="meeting_date"
                    type="datetime-local"
                    value={formData.meeting_date}
                    onChange={(e) =>
                      setFormData({ ...formData, meeting_date: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="participants">Participantes (separados por vírgula)</Label>
                  <Input
                    id="participants"
                    placeholder="João Silva, Maria Santos..."
                    value={formData.participants}
                    onChange={(e) =>
                      setFormData({ ...formData, participants: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="action_items">Itens de Ação (separados por vírgula)</Label>
                  <Input
                    id="action_items"
                    placeholder="Revisar proposta, Enviar relatório..."
                    value={formData.action_items}
                    onChange={(e) =>
                      setFormData({ ...formData, action_items: e.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Label>Conteúdo da Reunião</Label>
                <div className="mt-2">
                  <RichTextEditor
                    content={formData.content}
                    onChange={(content) =>
                      setFormData({ ...formData, content })
                    }
                    placeholder="Escreva o conteúdo da reunião..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Dashboards e Atividades */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <LayoutDashboard className="h-4 w-4" />
                  <h3 className="font-semibold">Dashboards</h3>
                </div>
                {dashboards.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum dashboard disponível</p>
                ) : (
                  <div className="space-y-3">
                    {dashboards.map((dashboard) => (
                      <div key={dashboard.id} className="flex items-start gap-2">
                        <Checkbox
                          id={`dash-${dashboard.id}`}
                          checked={selectedDashboards.includes(dashboard.id)}
                          onCheckedChange={() => handleDashboardToggle(dashboard.id)}
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={`dash-${dashboard.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {dashboard.name}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {dashboard.dashboard_type}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckSquare className="h-4 w-4" />
                  <h3 className="font-semibold">Atividades</h3>
                </div>
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma atividade pendente</p>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div key={task.id} className="flex items-start gap-2">
                        <Checkbox
                          id={`task-${task.id}`}
                          checked={selectedTasks.includes(task.id)}
                          onCheckedChange={() => handleTaskToggle(task.id)}
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={`task-${task.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {task.title}
                          </label>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {task.status === "pending" ? "Pendente" : "Em Progresso"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
