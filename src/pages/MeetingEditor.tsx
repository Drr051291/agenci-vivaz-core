import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/meeting-editor/RichTextEditor";
import { MeetingViewer } from "@/components/meeting-editor/MeetingViewer";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Save, Calendar as CalendarIcon, Users, CheckSquare, Presentation, X, ChevronLeft, ChevronRight, Pencil, CalendarDays, RefreshCw, Check, ListTodo, FileText, BarChart3, TrendingUp, Lightbulb, CheckCircle2, Target } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useMeetingCalendarSync } from "@/hooks/useMeetingCalendarSync";
import {
  CollapsibleSection,
  MetricsSection,
  ChannelsSection,
  BulletsSection,
  InsightsSection,
  ChecklistSection,
  MeetingSidebar,
  MeetingStatusBadge,
} from "@/components/meetings";

interface Task {
  id: string;
  title: string;
  status: string;
  priority?: string;
  due_date?: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface Metric {
  metric_key: string;
  metric_label: string;
  target_value: number | null;
  actual_value: number | null;
  unit: string;
}

interface Channel {
  channel: string;
  investment: number;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  revenue: number;
  notes?: string;
}

interface Insight {
  text: string;
  impact: "high" | "medium" | "low";
  evidence?: string;
}

interface ChecklistItem {
  text: string;
  checked: boolean;
  notes?: string;
}

interface MeetingSections {
  objective: string;
  context: string;
  executiveSummary: string[];
  metrics: Metric[];
  channels: Channel[];
  insights: Insight[];
  whatWorkedWell: string[];
  pointsForImprovement: string[];
  actionsPerformed: string[];
  strategicRecommendations: string[];
  approvalsNeeded: ChecklistItem[];
  questionsAndDiscussions: string;
}

const AUTOSAVE_DELAY = 3000;

const DEFAULT_SECTIONS: MeetingSections = {
  objective: "",
  context: "",
  executiveSummary: [],
  metrics: [
    { metric_key: "investment", metric_label: "Investimento", target_value: null, actual_value: null, unit: "R$" },
    { metric_key: "leads", metric_label: "Leads", target_value: null, actual_value: null, unit: "" },
    { metric_key: "cpl", metric_label: "CPL", target_value: null, actual_value: null, unit: "R$" },
    { metric_key: "conversions", metric_label: "Conversões", target_value: null, actual_value: null, unit: "" },
    { metric_key: "roas", metric_label: "ROAS", target_value: null, actual_value: null, unit: "x" },
    { metric_key: "revenue", metric_label: "Receita", target_value: null, actual_value: null, unit: "R$" },
  ],
  channels: [],
  insights: [],
  whatWorkedWell: [],
  pointsForImprovement: [],
  actionsPerformed: [],
  strategicRecommendations: [],
  approvalsNeeded: [],
  questionsAndDiscussions: "",
};

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { isConnected, updateMeetingInCalendar, syncMeetingToCalendar, getMeetingSyncStatus } = useMeetingCalendarSync();
  
  const [meetingData, setMeetingData] = useState({
    meeting_date: "",
    participants: [] as string[],
    content: "",
    action_items: [] as string[],
    title: "",
    created_at: "",
    status: "rascunho" as string,
  });

  const [sections, setSections] = useState<MeetingSections>(DEFAULT_SECTIONS);

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
  }, [meetingData, selectedTasks, sections, isEditMode]);

  useEffect(() => {
    if (clientId && meetingId) {
      loadMeetingData();
    }
  }, [clientId, meetingId]);

  useEffect(() => {
    if (!isPresentationMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPresentationMode(false);
        setCurrentSection(0);
        return;
      }

      const presentationSections = getPresentationSections();
      
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setCurrentSection(prev => Math.min(prev + 1, presentationSections.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setCurrentSection(prev => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPresentationMode, meetingData, sections]);

  useEffect(() => {
    if (isPresentationMode && currentSection >= 0) {
      const sectionId = `section-${currentSection}`;
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentSection, isPresentationMode]);

  useEffect(() => {
    if (!isPresentationMode) return;

    const handleScroll = () => {
      const presentationSections = getPresentationSections();
      const scrollPosition = window.scrollY + window.innerHeight / 2;

      for (let i = presentationSections.length - 1; i >= 0; i--) {
        const element = document.getElementById(`section-${i}`);
        if (element && element.offsetTop <= scrollPosition) {
          setCurrentSection(i);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isPresentationMode, meetingData, sections]);

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

      const { data: tasksData } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_date")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      setTasks(tasksData || []);

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");

      setProfiles(profilesData || []);

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
        status: meetingDataRes.status || "rascunho",
      });
      setSelectedTasks(meetingDataRes.linked_tasks || []);

      // Load meeting sections
      const { data: sectionsData } = await supabase
        .from("meeting_sections")
        .select("*")
        .eq("meeting_id", meetingId);

      if (sectionsData && sectionsData.length > 0) {
        const loadedSections = { ...DEFAULT_SECTIONS };
        sectionsData.forEach((section) => {
          const content = section.content_json as Record<string, unknown>;
          if (content) {
            switch (section.section_key) {
              case "objective":
                loadedSections.objective = (content.text as string) || "";
                break;
              case "context":
                loadedSections.context = (content.text as string) || "";
                break;
              case "executive_summary":
                loadedSections.executiveSummary = (content.items as string[]) || [];
                break;
              case "what_worked_well":
                loadedSections.whatWorkedWell = (content.items as string[]) || [];
                break;
              case "points_for_improvement":
                loadedSections.pointsForImprovement = (content.items as string[]) || [];
                break;
              case "actions_performed":
                loadedSections.actionsPerformed = (content.items as string[]) || [];
                break;
              case "strategic_recommendations":
                loadedSections.strategicRecommendations = (content.items as string[]) || [];
                break;
              case "questions_discussions":
                loadedSections.questionsAndDiscussions = (content.text as string) || "";
                break;
              case "insights":
                loadedSections.insights = (content.items as Insight[]) || [];
                break;
              case "approvals_needed":
                loadedSections.approvalsNeeded = (content.items as ChecklistItem[]) || [];
                break;
            }
          }
        });
        setSections(loadedSections);
      }

      // Load meeting metrics
      const { data: metricsData } = await supabase
        .from("meeting_metrics")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("sort_order");

      if (metricsData && metricsData.length > 0) {
        setSections(prev => ({
          ...prev,
          metrics: metricsData.map(m => ({
            metric_key: m.metric_key,
            metric_label: m.metric_label,
            target_value: m.target_value,
            actual_value: m.actual_value,
            unit: m.unit || "",
          })),
        }));
      }

      // Load meeting channels
      const { data: channelsData } = await supabase
        .from("meeting_channels")
        .select("*")
        .eq("meeting_id", meetingId);

      if (channelsData && channelsData.length > 0) {
        setSections(prev => ({
          ...prev,
          channels: channelsData.map(c => ({
            channel: c.channel,
            investment: c.investment || 0,
            impressions: c.impressions || 0,
            clicks: c.clicks || 0,
            leads: c.leads || 0,
            conversions: c.conversions || 0,
            revenue: c.revenue || 0,
            notes: c.notes || "",
          })),
        }));
      }

      if (isConnected && meetingId) {
        const syncStatus = await getMeetingSyncStatus(meetingId);
        setIsSynced(!!syncStatus);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar reunião");
      navigate(`/clientes/${clientId}`);
    } finally {
      setLoading(false);
    }
  };

  const generateTitle = (meetingDate: string, createdAt?: string) => {
    if (meetingDate && meetingDate.trim() !== '') {
      const dateOnly = meetingDate.split('T')[0];
      const date = parseLocalDate(dateOnly);
      const formattedDate = format(date, "dd/MM/yyyy", { locale: ptBR });
      return `Vivaz - ${clientName} - ${formattedDate}`;
    }
    if (createdAt) {
      const dateOnly = createdAt.split('T')[0];
      const date = parseLocalDate(dateOnly);
      const formattedDate = format(date, "dd/MM/yyyy", { locale: ptBR });
      return `Vivaz - ${clientName} - ${formattedDate}`;
    }
    return `Vivaz - ${clientName} - Nova Reunião`;
  };

  const handleAutoSave = useCallback(async () => {
    if (!meetingId || isSaving) return;

    setIsSaving(true);
    try {
      const newTitle = generateTitle(meetingData.meeting_date, meetingData.created_at);
      const { error } = await supabase
        .from("meeting_minutes")
        .update({
          title: newTitle,
          meeting_date: meetingData.meeting_date,
          participants: meetingData.participants.length > 0 ? meetingData.participants : null,
          content: meetingData.content,
          action_items: meetingData.action_items.length > 0 ? meetingData.action_items : null,
          linked_tasks: selectedTasks.length > 0 ? selectedTasks : null,
          status: meetingData.status,
        })
        .eq("id", meetingId);

      if (error) throw error;

      // Save sections
      const sectionsToSave = [
        { section_key: "objective", title: "Objetivo da reunião", content_json: JSON.parse(JSON.stringify({ text: sections.objective })), sort_order: 0 },
        { section_key: "context", title: "Contexto", content_json: JSON.parse(JSON.stringify({ text: sections.context })), sort_order: 1 },
        { section_key: "executive_summary", title: "Resumo executivo", content_json: JSON.parse(JSON.stringify({ items: sections.executiveSummary })), sort_order: 2 },
        { section_key: "what_worked_well", title: "O que funcionou bem", content_json: JSON.parse(JSON.stringify({ items: sections.whatWorkedWell })), sort_order: 3 },
        { section_key: "points_for_improvement", title: "Pontos de melhoria", content_json: JSON.parse(JSON.stringify({ items: sections.pointsForImprovement })), sort_order: 4 },
        { section_key: "actions_performed", title: "Ações realizadas", content_json: JSON.parse(JSON.stringify({ items: sections.actionsPerformed })), sort_order: 5 },
        { section_key: "strategic_recommendations", title: "Recomendações estratégicas", content_json: JSON.parse(JSON.stringify({ items: sections.strategicRecommendations })), sort_order: 6 },
        { section_key: "questions_discussions", title: "Dúvidas e discussões", content_json: JSON.parse(JSON.stringify({ text: sections.questionsAndDiscussions })), sort_order: 7 },
        { section_key: "insights", title: "Insights", content_json: JSON.parse(JSON.stringify({ items: sections.insights })), sort_order: 8 },
        { section_key: "approvals_needed", title: "Aprovações necessárias", content_json: JSON.parse(JSON.stringify({ items: sections.approvalsNeeded })), sort_order: 9 },
      ];

      for (const section of sectionsToSave) {
        const { data: existing } = await supabase
          .from("meeting_sections")
          .select("id")
          .eq("meeting_id", meetingId)
          .eq("section_key", section.section_key)
          .single();

        if (existing) {
          await supabase
            .from("meeting_sections")
            .update({ content_json: section.content_json })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("meeting_sections")
            .insert([{ meeting_id: meetingId, ...section }]);
        }
      }

      // Save metrics
      await supabase
        .from("meeting_metrics")
        .delete()
        .eq("meeting_id", meetingId);

      if (sections.metrics.length > 0) {
        const metricsToInsert = sections.metrics.map((m, idx) => ({
          meeting_id: meetingId,
          metric_key: m.metric_key,
          metric_label: m.metric_label,
          target_value: m.target_value,
          actual_value: m.actual_value,
          unit: m.unit,
          sort_order: idx,
        }));
        await supabase.from("meeting_metrics").insert(metricsToInsert);
      }

      // Save channels
      await supabase
        .from("meeting_channels")
        .delete()
        .eq("meeting_id", meetingId);

      if (sections.channels.length > 0) {
        const channelsToInsert = sections.channels.map((c) => ({
          meeting_id: meetingId,
          channel: c.channel,
          investment: c.investment,
          impressions: c.impressions,
          clicks: c.clicks,
          leads: c.leads,
          conversions: c.conversions,
          revenue: c.revenue,
          notes: c.notes,
        }));
        await supabase.from("meeting_channels").insert(channelsToInsert);
      }

      if (isConnected && isSynced) {
        await updateMeetingInCalendar({
          id: meetingId,
          title: newTitle,
          meeting_date: meetingData.meeting_date,
          participants: meetingData.participants,
        });
      }
    } catch (error) {
      console.error("Erro no autosave:", error);
    } finally {
      setIsSaving(false);
    }
  }, [meetingData, selectedTasks, sections, meetingId, isSaving, clientName, isConnected, isSynced, updateMeetingInCalendar]);

  const handleSave = async () => {
    await handleAutoSave();
    toast.success("Alterações salvas!");
  };

  const handleSyncToCalendar = async () => {
    if (!meetingId) return;
    setIsSyncing(true);
    try {
      const result = await syncMeetingToCalendar({
        id: meetingId,
        title: meetingData.title,
        meeting_date: meetingData.meeting_date,
        participants: meetingData.participants,
      });
      if (result) {
        setIsSynced(true);
        toast.success("Sincronizado com Google Calendar");
      } else {
        toast.error("Erro ao sincronizar");
      }
    } catch (error) {
      console.error("Erro ao sincronizar:", error);
      toast.error("Erro ao sincronizar");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTaskToggle = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const getPresentationSections = () => {
    const presentationSections = [];
    
    if (sections.objective || sections.context) {
      presentationSections.push({ id: 'opening', title: 'Abertura' });
    }
    if (sections.executiveSummary.length > 0) {
      presentationSections.push({ id: 'summary', title: 'Resumo Executivo' });
    }
    if (sections.metrics.some(m => m.actual_value !== null)) {
      presentationSections.push({ id: 'metrics', title: 'Métricas Principais' });
    }
    if (sections.channels.length > 0) {
      presentationSections.push({ id: 'channels', title: 'Desempenho por Canal' });
    }
    if (sections.insights.length > 0) {
      presentationSections.push({ id: 'insights', title: 'Insights' });
    }
    if (sections.whatWorkedWell.length > 0 || sections.pointsForImprovement.length > 0) {
      presentationSections.push({ id: 'analysis', title: 'Análise' });
    }
    if (meetingData.action_items.length > 0) {
      presentationSections.push({ id: 'actions', title: 'Plano de Ação' });
    }
    
    return presentationSections;
  };

  const handlePrevSection = () => {
    setCurrentSection(prev => Math.max(prev - 1, 0));
  };

  const handleNextSection = () => {
    const presentationSections = getPresentationSections();
    setCurrentSection(prev => Math.min(prev + 1, presentationSections.length - 1));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Presentation Mode
  if (isPresentationMode) {
    const presentationSections = getPresentationSections();

    return (
      <div className="fixed inset-0 bg-background z-50 overflow-auto">
        {/* Navigation */}
        <div className="fixed top-4 left-0 right-0 z-50 flex items-center justify-between px-6">
          <div className="flex items-center gap-3 bg-background/95 backdrop-blur rounded-full px-5 py-2.5 border shadow-lg">
            <div className="flex items-center gap-1.5">
              {presentationSections.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSection(idx)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    idx === currentSection 
                      ? "w-6 bg-primary" 
                      : "w-2 bg-muted-foreground/20 hover:bg-muted-foreground/40"
                  )}
                />
              ))}
            </div>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm text-muted-foreground">
              {currentSection + 1} / {presentationSections.length}
            </span>
          </div>

          <Button
            onClick={() => {
              setIsPresentationMode(false);
              setCurrentSection(0);
            }}
            variant="secondary"
            size="sm"
            className="rounded-full shadow-lg"
          >
            <X className="h-4 w-4 mr-1.5" />
            Sair
          </Button>
        </div>

        {/* Navigation Buttons */}
        {currentSection > 0 && (
          <Button
            onClick={handlePrevSection}
            variant="secondary"
            size="icon"
            className="fixed left-6 top-1/2 -translate-y-1/2 z-40 h-12 w-12 rounded-full shadow-lg"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        {currentSection < presentationSections.length - 1 && (
          <Button
            onClick={handleNextSection}
            variant="secondary"
            size="icon"
            className="fixed right-6 top-1/2 -translate-y-1/2 z-40 h-12 w-12 rounded-full shadow-lg"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}

        <div className="w-full px-16 lg:px-24 pt-20 pb-16">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-3">
              <FileText className="h-4 w-4" />
              Ata de Reunião
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-3">{meetingData.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span>
                  {meetingData.meeting_date 
                    ? format(parseLocalDate(meetingData.meeting_date.split('T')[0]), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) 
                    : "Data não definida"}
                </span>
              </div>
              {meetingData.participants && meetingData.participants.length > 0 && (
                <>
                  <span className="text-border">•</span>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{meetingData.participants.join(", ")}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Presentation Sections */}
          {presentationSections.map((section, idx) => (
            <div
              key={section.id}
              id={`section-${idx}`}
              className={cn(
                "mb-8 p-6 lg:p-8 rounded-xl bg-card border transition-all",
                currentSection === idx && "ring-2 ring-primary/20"
              )}
            >
              {section.id === 'opening' && (
                <>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Abertura e Alinhamento
                  </h2>
                  {sections.objective && (
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground mb-1">Objetivo</p>
                      <p className="text-lg">{sections.objective}</p>
                    </div>
                  )}
                  {sections.context && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Contexto</p>
                      <p>{sections.context}</p>
                    </div>
                  )}
                </>
              )}

              {section.id === 'summary' && (
                <>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Resumo Executivo
                  </h2>
                  <ul className="space-y-2">
                    {sections.executiveSummary.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {section.id === 'metrics' && (
                <>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Métricas Principais
                  </h2>
                  <MetricsSection metrics={sections.metrics} onChange={() => {}} isEditing={false} />
                </>
              )}

              {section.id === 'channels' && (
                <>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Desempenho por Canal
                  </h2>
                  <ChannelsSection channels={sections.channels} onChange={() => {}} isEditing={false} />
                </>
              )}

              {section.id === 'insights' && (
                <>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    Insights
                  </h2>
                  <InsightsSection insights={sections.insights} onChange={() => {}} isEditing={false} />
                </>
              )}

              {section.id === 'analysis' && (
                <>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Análise
                  </h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    {sections.whatWorkedWell.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-emerald-700 mb-2">O que funcionou bem</p>
                        <ul className="space-y-1">
                          {sections.whatWorkedWell.map((item, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <Check className="h-4 w-4 text-emerald-500 mt-0.5" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {sections.pointsForImprovement.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-amber-700 mb-2">Pontos de melhoria</p>
                        <ul className="space-y-1">
                          {sections.pointsForImprovement.map((item, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-2" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}

              {section.id === 'actions' && (
                <>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    Plano de Ação
                  </h2>
                  <div className="space-y-3">
                    {meetingData.action_items.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">{idx + 1}</span>
                        </div>
                        <span className="flex-1 pt-0.5">{item}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/clientes/${clientId}?tab=meetings`)}
                className="rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-xl font-semibold">
                    {meetingData.title || "Nova Reunião"}
                  </h1>
                  <p className="text-sm text-muted-foreground">{clientName}</p>
                </div>
                <MeetingStatusBadge status={meetingData.status} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnected && (
                isSynced ? (
                  <Badge variant="outline" className="gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                    <Check className="h-3 w-3" />
                    Sincronizado
                  </Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSyncToCalendar}
                    disabled={isSyncing}
                    className="text-muted-foreground"
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-1.5", isSyncing && "animate-spin")} />
                    Sincronizar
                  </Button>
                )
              )}
              {isEditMode && (
                <span className={cn(
                  "text-xs px-2.5 py-1 rounded-full",
                  isSaving 
                    ? "text-muted-foreground bg-muted animate-pulse" 
                    : "text-emerald-700 bg-emerald-50"
                )}>
                  {isSaving ? "Salvando..." : "Salvo"}
                </span>
              )}
              <Button
                onClick={() => setIsPresentationMode(true)}
                variant="outline"
                size="sm"
              >
                <Presentation className="h-4 w-4 mr-1.5" />
                Apresentar
              </Button>
              {isEditMode ? (
                <Button onClick={handleSave} size="sm">
                  <Save className="h-4 w-4 mr-1.5" />
                  Salvar
                </Button>
              ) : (
                <Button onClick={() => navigate(`/clientes/${clientId}/reunioes/${meetingId}?mode=edit`)} size="sm">
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <span className="font-medium">Data</span>
            </div>
            {isEditMode ? (
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start font-normal h-10",
                      !meetingData.meeting_date && "text-muted-foreground"
                    )}
                  >
                    {meetingData.meeting_date 
                      ? format(parseLocalDate(meetingData.meeting_date.split('T')[0]), "dd/MM/yyyy", { locale: ptBR })
                      : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={meetingData.meeting_date ? parseLocalDate(meetingData.meeting_date.split('T')[0]) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setMeetingData({
                          ...meetingData,
                          meeting_date: format(date, "yyyy-MM-dd"),
                        });
                      }
                      setDatePickerOpen(false);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <p className="text-sm text-muted-foreground">
                {meetingData.meeting_date 
                  ? format(parseLocalDate(meetingData.meeting_date.split('T')[0]), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) 
                  : "Não definida"}
              </p>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <span className="font-medium">Participantes</span>
            </div>
            {isEditMode ? (
              <Popover open={participantsOpen} onOpenChange={setParticipantsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start font-normal h-10 truncate",
                      !meetingData.participants.length && "text-muted-foreground"
                    )}
                  >
                    {meetingData.participants.length > 0 
                      ? meetingData.participants.join(", ")
                      : "Adicionar participantes"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar..." />
                    <CommandList>
                      <CommandEmpty>Nenhum resultado.</CommandEmpty>
                      <CommandGroup>
                        {profiles.map((profile) => {
                          const isSelected = meetingData.participants.includes(profile.full_name);
                          return (
                            <CommandItem
                              key={profile.id}
                              onSelect={() => {
                                const newParticipants = isSelected
                                  ? meetingData.participants.filter(p => p !== profile.full_name)
                                  : [...meetingData.participants, profile.full_name];
                                setMeetingData({ ...meetingData, participants: newParticipants });
                              }}
                              className="cursor-pointer"
                            >
                              <Checkbox checked={isSelected} className="mr-2" />
                              {profile.full_name}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : (
              <p className="text-sm text-muted-foreground truncate">
                {meetingData.participants.length > 0 ? meetingData.participants.join(", ") : "Nenhum participante"}
              </p>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <ListTodo className="h-5 w-5 text-primary" />
              </div>
              <span className="font-medium">Próximos Passos</span>
            </div>
            {isEditMode ? (
              <Textarea
                placeholder="Ex: Enviar proposta, Agendar follow-up..."
                value={meetingData.action_items.join(", ")}
                onChange={(e) =>
                  setMeetingData({
                    ...meetingData,
                    action_items: e.target.value.split(",").map(item => item.trim()).filter(Boolean),
                  })
                }
                className="min-h-[40px] resize-none text-sm"
                rows={1}
              />
            ) : (
              <p className="text-sm text-muted-foreground truncate">
                {meetingData.action_items.length > 0 
                  ? `${meetingData.action_items.length} item(s) definido(s)` 
                  : "Nenhum item definido"}
              </p>
            )}
          </Card>
        </div>

        {/* Main Content with Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Structured Editor */}
          <div className="lg:col-span-3 space-y-4">
            {/* Abertura e Alinhamento */}
            <CollapsibleSection 
              title="Abertura e Alinhamento" 
              icon={<Target className="h-5 w-5" />}
              defaultOpen={true}
            >
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Objetivo da reunião</label>
                  {isEditMode ? (
                    <Textarea
                      value={sections.objective}
                      onChange={(e) => setSections({ ...sections, objective: e.target.value })}
                      placeholder="Ex: Apresentar resultados do mês e alinhar próximas ações..."
                      className="min-h-[60px]"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{sections.objective || "Não definido"}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Contexto</label>
                  {isEditMode ? (
                    <Textarea
                      value={sections.context}
                      onChange={(e) => setSections({ ...sections, context: e.target.value })}
                      placeholder="Breve contexto sobre a situação atual do cliente..."
                      className="min-h-[80px]"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{sections.context || "Não definido"}</p>
                  )}
                </div>
              </div>
            </CollapsibleSection>

            {/* Resumo Executivo */}
            <CollapsibleSection 
              title="Resumo Executivo" 
              icon={<FileText className="h-5 w-5" />}
              badge={sections.executiveSummary.length > 0 ? `${sections.executiveSummary.length}` : undefined}
            >
              <BulletsSection
                items={sections.executiveSummary}
                onChange={(items) => setSections({ ...sections, executiveSummary: items })}
                isEditing={isEditMode}
                placeholder="Adicione os pontos principais..."
                maxItems={5}
              />
            </CollapsibleSection>

            {/* Métricas Principais */}
            <CollapsibleSection 
              title="Métricas Principais" 
              icon={<BarChart3 className="h-5 w-5" />}
            >
              <MetricsSection
                metrics={sections.metrics}
                onChange={(metrics) => setSections({ ...sections, metrics })}
                isEditing={isEditMode}
              />
            </CollapsibleSection>

            {/* Desempenho por Canal */}
            <CollapsibleSection 
              title="Desempenho por Canal" 
              icon={<TrendingUp className="h-5 w-5" />}
              badge={sections.channels.length > 0 ? `${sections.channels.length}` : undefined}
            >
              <ChannelsSection
                channels={sections.channels}
                onChange={(channels) => setSections({ ...sections, channels })}
                isEditing={isEditMode}
              />
            </CollapsibleSection>

            {/* Insights */}
            <CollapsibleSection 
              title="Insights" 
              icon={<Lightbulb className="h-5 w-5" />}
              badge={sections.insights.length > 0 ? `${sections.insights.length}` : undefined}
            >
              <InsightsSection
                insights={sections.insights}
                onChange={(insights) => setSections({ ...sections, insights })}
                isEditing={isEditMode}
              />
            </CollapsibleSection>

            {/* O que funcionou bem / Pontos de melhoria */}
            <CollapsibleSection 
              title="Análise de Performance" 
              icon={<CheckCircle2 className="h-5 w-5" />}
            >
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium mb-2 block text-emerald-700">O que funcionou bem</label>
                  <BulletsSection
                    items={sections.whatWorkedWell}
                    onChange={(items) => setSections({ ...sections, whatWorkedWell: items })}
                    isEditing={isEditMode}
                    placeholder="Ex: Campanha de remarketing teve ótimo ROI..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-amber-700">Pontos de melhoria</label>
                  <BulletsSection
                    items={sections.pointsForImprovement}
                    onChange={(items) => setSections({ ...sections, pointsForImprovement: items })}
                    isEditing={isEditMode}
                    placeholder="Ex: Taxa de conversão do site precisa melhorar..."
                  />
                </div>
              </div>
            </CollapsibleSection>

            {/* Ações Realizadas */}
            <CollapsibleSection 
              title="Ações Realizadas" 
              icon={<Check className="h-5 w-5" />}
              badge={sections.actionsPerformed.length > 0 ? `${sections.actionsPerformed.length}` : undefined}
            >
              <BulletsSection
                items={sections.actionsPerformed}
                onChange={(items) => setSections({ ...sections, actionsPerformed: items })}
                isEditing={isEditMode}
                placeholder="Ex: Otimização de campanhas, Criação de novos anúncios..."
              />
            </CollapsibleSection>

            {/* Recomendações Estratégicas */}
            <CollapsibleSection 
              title="Recomendações Estratégicas" 
              icon={<Target className="h-5 w-5" />}
              badge={sections.strategicRecommendations.length > 0 ? `${sections.strategicRecommendations.length}` : undefined}
            >
              <BulletsSection
                items={sections.strategicRecommendations}
                onChange={(items) => setSections({ ...sections, strategicRecommendations: items })}
                isEditing={isEditMode}
                placeholder="Ex: Aumentar investimento em Google Ads, Testar novos públicos..."
              />
            </CollapsibleSection>

            {/* Aprovações Necessárias */}
            <CollapsibleSection 
              title="Aprovações Necessárias" 
              icon={<CheckSquare className="h-5 w-5" />}
              badge={sections.approvalsNeeded.length > 0 ? `${sections.approvalsNeeded.length}` : undefined}
            >
              <ChecklistSection
                items={sections.approvalsNeeded}
                onChange={(items) => setSections({ ...sections, approvalsNeeded: items })}
                isEditing={isEditMode}
              />
            </CollapsibleSection>

            {/* Dúvidas e Discussões */}
            <CollapsibleSection 
              title="Dúvidas e Discussões" 
              icon={<FileText className="h-5 w-5" />}
            >
              {isEditMode ? (
                <RichTextEditor
                  content={sections.questionsAndDiscussions}
                  onChange={(content) => setSections({ ...sections, questionsAndDiscussions: content })}
                  placeholder="Registre dúvidas e discussões importantes..."
                />
              ) : (
                <div className="prose max-w-none">
                  <MeetingViewer content={sections.questionsAndDiscussions} />
                </div>
              )}
            </CollapsibleSection>

            {/* Conteúdo Livre (legado) */}
            <CollapsibleSection 
              title="Anotações Adicionais" 
              icon={<FileText className="h-5 w-5" />}
              defaultOpen={false}
            >
              {isEditMode ? (
                <RichTextEditor
                  content={meetingData.content}
                  onChange={(content) => setMeetingData({ ...meetingData, content })}
                  placeholder="Descreva os pontos discutidos na reunião..."
                />
              ) : (
                <div className="prose max-w-none">
                  <MeetingViewer content={meetingData.content} />
                </div>
              )}
            </CollapsibleSection>
          </div>

          {/* Sidebar */}
          <MeetingSidebar
            tasks={tasks}
            selectedTasks={selectedTasks}
            onTaskToggle={handleTaskToggle}
            isEditing={isEditMode}
            onSelectPending={() => {
              const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
              setSelectedTasks(pendingTasks.map(t => t.id));
            }}
            onClear={() => setSelectedTasks([])}
          />
        </div>
      </div>
    </div>
  );
}
