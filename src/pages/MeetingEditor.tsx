import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/meeting-editor/RichTextEditor";
import { MeetingViewer } from "@/components/meeting-editor/MeetingViewer";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Save, Calendar as CalendarIcon, Users, Presentation, X, ChevronLeft, ChevronRight, Pencil, CalendarDays, FileText, BarChart3, TrendingUp, Target, Wrench, Stethoscope, MessageSquare, ListTodo } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  CollapsibleSection,
  MetricsSection,
  ChannelsSection,
  BulletsSection,
  MeetingStatusBadge,
} from "@/components/meetings";
import { MeetingActionPlan, ActionPlanItem } from "@/components/meetings/MeetingActionPlan";
import { RetrovisorSection, DiagnosisPickerSection, EnhancedSidebar, SendToTasksButton } from "@/components/meetings/v2";
import { useClientSlugResolver, useMeetingSlugResolver, getClientSlug } from "@/hooks/useSlugResolver";

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


interface ChecklistItem {
  text: string;
  checked: boolean;
  notes?: string;
}

interface DiagnosisItem {
  tagId: string;
  tagLabel: string;
  context: string;
  solution: string;
}

interface MeetingSections {
  objective: string;
  context: string;
  executiveSummary: string[];
  metrics: Metric[];
  channels: Channel[];
  actionPlan: ActionPlanItem[];
  questionsAndDiscussions: string;
  diagnosisItems: DiagnosisItem[];
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
  actionPlan: [],
  questionsAndDiscussions: "",
  diagnosisItems: [],
};

export default function MeetingEditor() {
  const { clientId: clientSlugOrId, meetingId: meetingSlugOrId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "view";
  const isEditMode = mode === "edit";
  const [dataLoading, setDataLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [clientName, setClientName] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  
  // Resolve slugs to IDs
  const { clientId, clientSlug, loading: clientLoading, error: clientError } = useClientSlugResolver(clientSlugOrId);
  const { meetingId, meetingSlug, loading: meetingLoading, error: meetingError } = useMeetingSlugResolver(clientId, meetingSlugOrId);
  
  const loading = clientLoading || meetingLoading || dataLoading;
  
  // Redirect to slug-based URL if using UUIDs
  useEffect(() => {
    if (clientSlug && meetingSlug && (clientSlugOrId !== clientSlug || meetingSlugOrId !== meetingSlug)) {
      navigate(`/clientes/${clientSlug}/reunioes/${meetingSlug}?${searchParams.toString()}`, { replace: true });
    }
  }, [clientSlug, meetingSlug, clientSlugOrId, meetingSlugOrId, navigate, searchParams]);
  
  useEffect(() => {
    if (clientError || meetingError) {
      toast.error("Reunião não encontrada");
      navigate(`/clientes/${clientSlugOrId || ''}`);
    }
  }, [clientError, meetingError, navigate, clientSlugOrId]);
  
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
              case "action_plan":
                loadedSections.actionPlan = (content.items as ActionPlanItem[]) || [];
                break;
              case "questions_discussions":
                loadedSections.questionsAndDiscussions = (content.text as string) || "";
                break;
              case "diagnosis_items":
                loadedSections.diagnosisItems = (content.items as DiagnosisItem[]) || [];
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
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar reunião");
      navigate(`/clientes/${clientSlug || clientSlugOrId}`);
    } finally {
      setDataLoading(false);
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
        { section_key: "action_plan", title: "Plano de ação", content_json: JSON.parse(JSON.stringify({ items: sections.actionPlan })), sort_order: 3 },
        { section_key: "questions_discussions", title: "Dúvidas e discussões", content_json: JSON.parse(JSON.stringify({ text: sections.questionsAndDiscussions })), sort_order: 4 },
        { section_key: "diagnosis_items", title: "Diagnósticos", content_json: JSON.parse(JSON.stringify({ items: sections.diagnosisItems })), sort_order: 5 },
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
    } catch (error) {
      console.error("Erro no autosave:", error);
    } finally {
      setIsSaving(false);
    }
  }, [meetingData, selectedTasks, sections, meetingId, isSaving, clientName]);

  const handleSave = async () => {
    await handleAutoSave();
    toast.success("Alterações salvas!");
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
    
    // 1. Abertura e Alinhamento
    if (sections.objective || sections.context) {
      presentationSections.push({ id: 'opening', title: 'Abertura e Alinhamento' });
    }
    // 2. Resumo Executivo
    if (sections.executiveSummary.length > 0) {
      presentationSections.push({ id: 'summary', title: 'Resumo Executivo' });
    }
    // 3. Análise de KPIs
    if (sections.metrics.some(m => m.actual_value !== null || m.target_value !== null)) {
      presentationSections.push({ id: 'metrics', title: 'Análise de KPIs' });
    }
    // 4. Desempenho por Canal
    if (sections.channels.length > 0) {
      presentationSections.push({ id: 'channels', title: 'Desempenho por Canal' });
    }
    // 5. Diagnóstico
    if (sections.diagnosisItems.length > 0) {
      presentationSections.push({ id: 'diagnosis', title: 'Diagnóstico' });
    }
    // 6. Plano de Ação
    if (sections.actionPlan.length > 0) {
      presentationSections.push({ id: 'actions', title: 'Plano de Ação' });
    }
    // 7. Dúvidas e Discussões
    if (sections.questionsAndDiscussions && sections.questionsAndDiscussions.trim() !== '' && sections.questionsAndDiscussions !== '<p></p>') {
      presentationSections.push({ id: 'questions', title: 'Dúvidas e Discussões' });
    }
    // 8. Todo's - sempre mostra pois busca tarefas dinamicamente
    presentationSections.push({ id: 'todos', title: "Todo's" });
    
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
              Reunião
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
                    Análise de KPIs
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

              {section.id === 'diagnosis' && (
                <>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    Diagnóstico
                  </h2>
                  <DiagnosisPickerSection items={sections.diagnosisItems} onChange={() => {}} isEditing={false} />
                </>
              )}

              {section.id === 'actions' && (
                <>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-primary" />
                    Plano de Ação
                  </h2>
                  <div className="space-y-3">
                    {sections.actionPlan.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">{idx + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {item.category && (
                              <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                            )}
                            {item.status && (
                              <Badge variant={item.status === 'completed' ? 'default' : 'outline'} className="text-xs">
                                {item.status === 'completed' ? 'Concluído' : item.status === 'in_progress' ? 'Em andamento' : 'Pendente'}
                              </Badge>
                            )}
                          </div>
                          <span className="pt-0.5">{item.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {section.id === 'questions' && (
                <>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Dúvidas e Discussões
                  </h2>
                  <div className="prose prose-sm max-w-none">
                    <MeetingViewer content={sections.questionsAndDiscussions} />
                  </div>
                </>
              )}

              {section.id === 'todos' && (
                <>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ListTodo className="h-5 w-5 text-primary" />
                    Todo's
                  </h2>
                  <RetrovisorSection
                    clientId={clientId || ""}
                    meetingId={meetingId}
                    isEditing={false}
                    onTasksUpdated={() => {}}
                  />
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
                onClick={() => navigate(`/clientes/${clientSlug || clientSlugOrId}?tab=meetings`)}
                className="rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
                <div className="flex items-center gap-3">
                <div>
                  {isEditMode ? (
                    <Input
                      value={meetingData.title}
                      onChange={(e) => setMeetingData({ ...meetingData, title: e.target.value })}
                      placeholder="Nome da reunião..."
                      className="text-xl font-semibold h-9 border-0 bg-transparent px-0 focus-visible:ring-0"
                    />
                  ) : (
                    <h1 className="text-xl font-semibold">
                      {meetingData.title || "Nova Reunião"}
                    </h1>
                  )}
                  <p className="text-sm text-muted-foreground">{clientName}</p>
                </div>
                <MeetingStatusBadge status={meetingData.status} />
              </div>
            </div>
            <div className="flex items-center gap-2">
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
                <Button onClick={() => navigate(`/clientes/${clientSlug || clientSlugOrId}/reunioes/${meetingSlug || meetingSlugOrId}?mode=edit`)} size="sm">
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
        </div>

        {/* Main Content with Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-4">
            {/* 1. Abertura e Alinhamento */}
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

            {/* 2. Resumo Executivo */}
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


            {/* Análise de KPIs */}
            <CollapsibleSection 
              title="Análise de KPIs" 
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

            {/* Diagnóstico */}
            <CollapsibleSection 
              title="Diagnóstico" 
              icon={<Stethoscope className="h-5 w-5" />}
              badge={sections.diagnosisItems.length > 0 ? `${sections.diagnosisItems.length}` : undefined}
            >
              <DiagnosisPickerSection
                items={sections.diagnosisItems}
                onChange={(items) => setSections({ ...sections, diagnosisItems: items })}
                isEditing={isEditMode}
              />
            </CollapsibleSection>

            {/* Plano de Ação */}
            <CollapsibleSection 
              title="Plano de Ação" 
              icon={<Wrench className="h-5 w-5" />}
              badge={sections.actionPlan.length > 0 ? `${sections.actionPlan.length}` : undefined}
            >
              <MeetingActionPlan
                items={sections.actionPlan}
                onChange={(items) => setSections({ ...sections, actionPlan: items })}
                isEditing={isEditMode}
              />
            </CollapsibleSection>

            {/* Dúvidas e Discussões */}
            <CollapsibleSection 
              title="Dúvidas e Discussões" 
              icon={<MessageSquare className="h-5 w-5" />}
            >
              <div className="space-y-3">
                {isEditMode ? (
                  <>
                    <RichTextEditor
                      content={sections.questionsAndDiscussions}
                      onChange={(content) => setSections({ ...sections, questionsAndDiscussions: content })}
                      placeholder="Registre dúvidas e discussões importantes..."
                    />
                    {sections.questionsAndDiscussions && (
                      <div className="flex justify-end">
                        <SendToTasksButton
                          clientId={clientId || ""}
                          meetingId={meetingId}
                          text={sections.questionsAndDiscussions.replace(/<[^>]*>/g, '').substring(0, 100)}
                          profiles={profiles}
                          onTaskCreated={() => loadMeetingData()}
                          variant="popover"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="prose max-w-none">
                    <MeetingViewer content={sections.questionsAndDiscussions} />
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* Todo's */}
            <CollapsibleSection 
              title="Todo's" 
              icon={<ListTodo className="h-5 w-5" />}
            >
              <RetrovisorSection
                clientId={clientId || ""}
                meetingId={meetingId}
                isEditing={isEditMode}
                onTasksUpdated={() => loadMeetingData()}
              />
            </CollapsibleSection>
          </div>

          {/* Enhanced Sidebar */}
          <EnhancedSidebar
            clientId={clientId || ""}
            meetingId={meetingId}
            tasks={tasks}
            profiles={profiles}
            selectedTasks={selectedTasks}
            onTaskToggle={handleTaskToggle}
            onTasksUpdated={() => loadMeetingData()}
            isEditing={isEditMode}
          />
        </div>
      </div>
    </div>
  );
}
