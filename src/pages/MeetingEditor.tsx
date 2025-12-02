import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/meeting-editor/RichTextEditor";
import { MeetingViewer } from "@/components/meeting-editor/MeetingViewer";
import { DashboardCard } from "@/components/meeting-editor/DashboardCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save, Calendar, Users, CheckSquare, LayoutDashboard, Presentation, X, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { usePageMeta } from "@/hooks/usePageMeta";

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
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "view";
  const isEditMode = mode === "edit";
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
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
    created_at: "",
  });

  usePageMeta({
    title: meetingData.title || "Reunião",
    description: `Edite e visualize a reunião ${meetingData.title || ''}`,
    keywords: "reunião, ata, editor, vivaz",
  });

  useEffect(() => {
    if (!meetingId || loading || !isEditMode) return;

    const timer = setTimeout(() => {
      handleAutoSave();
    }, AUTOSAVE_DELAY);

    return () => clearTimeout(timer);
  }, [meetingData, selectedDashboards, selectedTasks, isEditMode]);

  useEffect(() => {
    if (clientId && meetingId) {
      loadMeetingData();
    }
  }, [clientId, meetingId]);

  // Handle keyboard navigation in presentation mode
  useEffect(() => {
    if (!isPresentationMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPresentationMode(false);
        setCurrentSection(0);
        return;
      }

      const sections = getSections();
      
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setCurrentSection(prev => Math.min(prev + 1, sections.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setCurrentSection(prev => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPresentationMode, selectedDashboards, meetingData]);

  // Auto-scroll to active section when using navigation controls
  useEffect(() => {
    if (isPresentationMode && currentSection >= 0) {
      const sectionId = `section-${currentSection}`;
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentSection, isPresentationMode]);

  // Update current section based on scroll position
  useEffect(() => {
    if (!isPresentationMode) return;

    const handleScroll = () => {
      const sections = getSections();
      const scrollPosition = window.scrollY + window.innerHeight / 2;

      for (let i = sections.length - 1; i >= 0; i--) {
        const element = document.getElementById(`section-${i}`);
        if (element && element.offsetTop <= scrollPosition) {
          setCurrentSection(i);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isPresentationMode, selectedDashboards, meetingData]);

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
        created_at: meetingDataRes.created_at,
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

  const generateTitle = (meetingDate: string, createdAt?: string) => {
    // Se a data da reunião foi preenchida pelo analista, usar ela
    if (meetingDate && meetingDate.trim() !== '') {
      const date = new Date(meetingDate);
      const formattedDate = format(date, "dd/MM/yyyy", { locale: ptBR });
      return `Vivaz - ${clientName} - ${formattedDate}`;
    }
    // Caso contrário, usar a data de criação
    if (createdAt) {
      const date = new Date(createdAt);
      const formattedDate = format(date, "dd/MM/yyyy", { locale: ptBR });
      return `Vivaz - ${clientName} - ${formattedDate}`;
    }
    // Fallback
    return `Vivaz - ${clientName} - Nova Reunião`;
  };

  const handleAutoSave = useCallback(async () => {
    if (!meetingId || isSaving) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("meeting_minutes")
        .update({
          title: generateTitle(meetingData.meeting_date, meetingData.created_at),
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

  const getSections = () => {
    const sections = [];
    const linkedDashboardsData = dashboards.filter(d => selectedDashboards.includes(d.id));
    
    if (linkedDashboardsData.length > 0) {
      sections.push({ id: 'dashboards', title: '📊 Dashboards Analisados' });
    }
    sections.push({ id: 'content', title: '📝 Discussões e Anotações' });
    if (meetingData.action_items && meetingData.action_items.length > 0) {
      sections.push({ id: 'actions', title: '✅ Itens de Ação' });
    }
    return sections;
  };

  const handlePrevSection = () => {
    setCurrentSection(prev => Math.max(prev - 1, 0));
  };

  const handleNextSection = () => {
    const sections = getSections();
    setCurrentSection(prev => Math.min(prev + 1, sections.length - 1));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Presentation Mode View
  if (isPresentationMode) {
    const linkedDashboardsData = dashboards.filter(d => 
      selectedDashboards.includes(d.id)
    );
    const sections = getSections();

    return (
      <div className="fixed inset-0 bg-background z-50 overflow-auto">
        {/* Navigation Controls */}
        <div className="fixed top-4 left-0 right-0 z-50 flex items-center justify-between px-4">
          {/* Section Indicators */}
          <div className="flex items-center gap-3 bg-background/95 backdrop-blur-sm rounded-lg px-4 py-3 border shadow-sm">
            <div className="flex items-center gap-2">
              {sections.map((section, idx) => (
                <button
                  key={section.id}
                  onClick={() => setCurrentSection(idx)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    idx === currentSection 
                      ? "w-8 bg-primary" 
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                  title={section.title}
                />
              ))}
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {currentSection + 1} / {sections.length}
              </span>
              <span className="text-sm text-foreground font-medium">
                {sections[currentSection]?.title}
              </span>
            </div>
          </div>

          {/* Exit Button */}
          <Button
            onClick={() => {
              setIsPresentationMode(false);
              setCurrentSection(0);
            }}
            variant="ghost"
            size="sm"
            className="bg-background/80 backdrop-blur-sm hover:bg-background"
          >
            <X className="h-4 w-4 mr-2" />
            Sair (ESC)
          </Button>
        </div>

        {/* Previous/Next Navigation Buttons */}
        {currentSection > 0 && (
          <Button
            onClick={handlePrevSection}
            variant="ghost"
            size="icon"
            className="fixed left-4 top-1/2 -translate-y-1/2 z-40 h-12 w-12 rounded-full bg-background/95 backdrop-blur-sm hover:bg-background border shadow-sm"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}
        {currentSection < sections.length - 1 && (
          <Button
            onClick={handleNextSection}
            variant="ghost"
            size="icon"
            className="fixed right-4 top-1/2 -translate-y-1/2 z-40 h-12 w-12 rounded-full bg-background/95 backdrop-blur-sm hover:bg-background border shadow-sm"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}

        <div className="max-w-[1600px] mx-auto p-8 pt-20 pb-16 space-y-16">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">{meetingData.title}</h1>
            <div className="flex flex-wrap gap-4 text-lg text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {format(parseLocalDate(meetingData.meeting_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>
              {meetingData.participants && meetingData.participants.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {meetingData.participants.join(", ")}
                </div>
              )}
            </div>
          </div>

          {/* Dashboards */}
          {linkedDashboardsData.length > 0 && (
            <div 
              id="section-0" 
              className={cn(
                "space-y-4 scroll-mt-20 rounded-lg transition-all duration-300",
                currentSection === 0 && "pl-4 border-l-4 border-primary"
              )}
            >
              <h2 className="text-2xl font-semibold">📊 Dashboards Analisados</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {linkedDashboardsData.map((dashboard) => (
                  <Card key={dashboard.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>{dashboard.name}</span>
                        {dashboard.embed_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(dashboard.embed_url, "_blank")}
                          >
                            Abrir Completo →
                          </Button>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {dashboard.embed_url ? (
                        <iframe
                          src={dashboard.embed_url}
                          className="w-full h-[500px] border-0"
                          title={dashboard.name}
                        />
                      ) : (
                        <div className="h-[500px] flex items-center justify-center bg-muted">
                          <p className="text-muted-foreground">Dashboard não disponível</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <div 
            id={`section-${linkedDashboardsData.length > 0 ? 1 : 0}`}
            className={cn(
              "space-y-4 border-t pt-8 scroll-mt-20 rounded-lg transition-all duration-300",
              currentSection === (linkedDashboardsData.length > 0 ? 1 : 0) && "pl-4 border-l-4 border-primary"
            )}
          >
            <h2 className="text-2xl font-semibold">📝 Discussões e Anotações</h2>
            <div className="prose prose-lg max-w-none">
              <MeetingViewer content={meetingData.content} />
            </div>
          </div>

          {/* Action Items */}
          {meetingData.action_items && meetingData.action_items.length > 0 && (
            <div 
              id={`section-${sections.length - 1}`}
              className={cn(
                "space-y-4 border-t pt-8 scroll-mt-20 rounded-lg transition-all duration-300",
                currentSection === sections.length - 1 && "pl-4 border-l-4 border-primary"
              )}
            >
              <h2 className="text-2xl font-semibold">✅ Itens de Ação</h2>
              <ul className="space-y-3">
                {meetingData.action_items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-lg">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm font-semibold text-primary">{idx + 1}</span>
                    </div>
                    <span className="flex-1">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
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
                onClick={() => navigate(`/clientes/${clientId}?tab=meetings`)}
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
              {isEditMode && (
                <span className={cn(
                  "text-sm",
                  isSaving ? "text-muted-foreground animate-pulse" : "text-emerald-600"
                )}>
                  {isSaving ? "Salvando..." : "✓ Salvo"}
                </span>
              )}
              <Button
                onClick={() => setIsPresentationMode(true)}
                variant="outline"
              >
                <Presentation className="h-4 w-4 mr-2" />
                Modo Apresentação
              </Button>
              {isEditMode ? (
                <Button onClick={handleSave}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </Button>
              ) : (
                <Button onClick={() => navigate(`/clientes/${clientId}/reunioes/${meetingId}?mode=edit`)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              )}
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
              {isEditMode ? (
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
              ) : (
                <p className="text-sm py-2">
                  {format(parseLocalDate(meetingData.meeting_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participantes
              </label>
              {isEditMode ? (
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
              ) : (
                <p className="text-sm py-2">
                  {meetingData.participants.length > 0 ? meetingData.participants.join(", ") : "—"}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Itens de Ação
              </label>
              {isEditMode ? (
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
              ) : (
                <p className="text-sm py-2">
                  {meetingData.action_items.length > 0 ? meetingData.action_items.join(", ") : "—"}
                </p>
              )}
            </div>
          </div>
        </Card>


        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rich Text Editor/Viewer - 2/3 */}
          <Card className="p-6 lg:col-span-2">
            <label className="text-sm font-medium mb-4 block">
              📝 Conteúdo da Reunião
            </label>
            {isEditMode ? (
              <RichTextEditor
                content={meetingData.content}
                onChange={(content) =>
                  setMeetingData({ ...meetingData, content })
                }
                placeholder="Descreva o que foi discutido na reunião..."
              />
            ) : (
              <MeetingViewer content={meetingData.content} />
            )}
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
                  {isEditMode && (
                    <Checkbox
                      checked={selectedTasks.includes(task.id)}
                      onCheckedChange={() => handleTaskToggle(task.id)}
                    />
                  )}
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
