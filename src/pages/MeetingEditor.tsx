import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MeetingEditorV3 from "./MeetingEditorV3";
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
import {
  ArrowLeft,
  Save,
  Calendar as CalendarIcon,
  Users,
  Presentation,
  X,
  ChevronLeft,
  ChevronRight,
  Pencil,
  CalendarDays,
  FileText,
  BarChart3,
  Target,
  Wrench,
  MessageSquare,
  CalendarRange,
  ChevronRight as ChevronRightIcon,
  Info,
  ListChecks,
  Sparkles,
  Clock,
  Link2,
} from "lucide-react";
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
  MeetingStatusBadge,
} from "@/components/meetings";
import { MeetingActionPlan, ActionPlanItem } from "@/components/meetings/MeetingActionPlan";
import { EnhancedSidebar, SendToTasksButton, ActionPlanWorkspace, MeetingScheduleSection } from "@/components/meetings/v2";
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

interface MeetingSections {
  objective: string;
  context: string;
  metrics: Metric[];
  channels: Channel[];
  actionPlan: ActionPlanItem[];
  questionsAndDiscussions: string;
}

const AUTOSAVE_DELAY = 3000;

const DEFAULT_SECTIONS: MeetingSections = {
  objective: "",
  context: "",
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
  const [templateVersion, setTemplateVersion] = useState<string | null>(null);
  const [versionResolved, setVersionResolved] = useState(false);
  
  // Resolve slugs to IDs
  const { clientId, clientSlug, loading: clientLoading, error: clientError } = useClientSlugResolver(clientSlugOrId);
  const { meetingId, meetingSlug, loading: meetingLoading, error: meetingError } = useMeetingSlugResolver(clientId, meetingSlugOrId);

  // Detect template_version to route to the new V3 editor for new meetings
  useEffect(() => {
    if (!meetingId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("meeting_minutes")
        .select("template_version")
        .eq("id", meetingId)
        .maybeSingle();
      if (!cancelled) {
        setTemplateVersion(data?.template_version || null);
        setVersionResolved(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meetingId]);
  
  const loading = clientLoading || meetingLoading || dataLoading;

  // While resolving version, hold rendering to avoid flicker
  if (meetingId && !versionResolved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Route new meetings to the redesigned V3 editor
  if (versionResolved && templateVersion === "v3") {
    return <MeetingEditorV3 />;
  }
  
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
              case "action_plan":
                loadedSections.actionPlan = (content.items as ActionPlanItem[]) || [];
                break;
              case "questions_discussions":
                loadedSections.questionsAndDiscussions = (content.text as string) || "";
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
        { section_key: "action_plan", title: "Plano de ação", content_json: JSON.parse(JSON.stringify({ items: sections.actionPlan })), sort_order: 2 },
        { section_key: "questions_discussions", title: "Dúvidas e discussões", content_json: JSON.parse(JSON.stringify({ text: sections.questionsAndDiscussions })), sort_order: 3 },
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
    // Sempre exibir a estrutura completa da reunião na apresentação,
    // mesmo quando alguma seção ainda estiver vazia.
    return [
      { id: 'opening', title: 'Abertura e Alinhamento' },
      { id: 'metrics', title: 'Análise de KPIs' },
      { id: 'actions', title: 'Plano de Ação e Discussões' },
      { id: 'schedule', title: 'Cronograma' },
    ];
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
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-1">Objetivo</p>
                    {sections.objective ? (
                      <p className="text-lg whitespace-pre-wrap">{sections.objective}</p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">Nenhum objetivo definido.</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Contexto</p>
                    {sections.context ? (
                      <p className="whitespace-pre-wrap">{sections.context}</p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">Nenhum contexto definido.</p>
                    )}
                  </div>
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

              {section.id === 'actions' && (
                <>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-primary" />
                    Plano de Ação e Discussões
                  </h2>
                  <div className="mb-6">
                    <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4" />
                      Discussões e anotações
                    </p>
                    {sections.questionsAndDiscussions &&
                    sections.questionsAndDiscussions.trim() !== '' &&
                    sections.questionsAndDiscussions !== '<p></p>' ? (
                      <div className="prose prose-sm max-w-none">
                        <MeetingViewer content={sections.questionsAndDiscussions} />
                      </div>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">
                        Nenhuma discussão registrada.
                      </p>
                    )}
                  </div>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Wrench className="h-4 w-4" />
                      Tarefas do plano
                    </p>
                    <ActionPlanWorkspace
                      meetingId={meetingId}
                      clientId={clientId || ""}
                      profiles={profiles}
                      readOnly
                    />
                  </div>
                </>
              )}

              {section.id === 'schedule' && (
                <>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CalendarRange className="h-5 w-5 text-primary" />
                    Cronograma
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Visão consolidada de todas as atividades do plano no calendário.
                  </p>
                  <MeetingScheduleSection
                    meetingId={meetingId}
                    clientId={clientId || ""}
                    meetingDate={meetingData.meeting_date}
                    readOnly
                  />
                </>
              )}

            </div>
          ))}
        </div>
      </div>
    );
  }

  const formattedFullDate = meetingData.meeting_date
    ? format(
        parseLocalDate(meetingData.meeting_date.split("T")[0]),
        "dd 'de' MMMM 'de' yyyy",
        { locale: ptBR }
      )
    : "Data não definida";

  const linkedTasksCount = selectedTasks.length;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Breadcrumb row */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate(`/clientes/${clientSlug || clientSlugOrId}?tab=meetings`)
              }
              className="h-7 px-2 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              {clientName || "Cliente"}
            </Button>
            <ChevronRightIcon className="h-3.5 w-3.5 opacity-50" />
            <span className="font-medium text-foreground">Reuniões</span>
            <ChevronRightIcon className="h-3.5 w-3.5 opacity-50" />
            <span className="truncate max-w-[280px]">
              {meetingData.title || "Nova Reunião"}
            </span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {isEditMode ? (
                <Input
                  value={meetingData.title}
                  onChange={(e) =>
                    setMeetingData({ ...meetingData, title: e.target.value })
                  }
                  placeholder="Nome da reunião..."
                  className="text-2xl font-bold h-10 border-0 bg-transparent px-0 focus-visible:ring-0 shadow-none"
                />
              ) : (
                <h1 className="text-2xl font-bold leading-tight tracking-tight">
                  {meetingData.title || "Nova Reunião"}
                </h1>
              )}
              <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>{formattedFullDate}</span>
                </div>
                <span className="text-border">•</span>
                <MeetingStatusBadge status={meetingData.status} />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isEditMode && (
                <span
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full font-medium",
                    isSaving
                      ? "text-muted-foreground bg-muted animate-pulse"
                      : "text-primary bg-primary/10"
                  )}
                >
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
                <>
                  <Button
                    onClick={() =>
                      navigate(
                        `/clientes/${clientSlug || clientSlugOrId}/reunioes/${meetingSlug || meetingSlugOrId}`
                      )
                    }
                    variant="ghost"
                    size="sm"
                  >
                    Descartar
                  </Button>
                  <Button onClick={handleSave} size="sm">
                    <Save className="h-4 w-4 mr-1.5" />
                    Salvar Reunião
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() =>
                    navigate(
                      `/clientes/${clientSlug || clientSlugOrId}/reunioes/${meetingSlug || meetingSlugOrId}?mode=edit`
                    )
                  }
                  size="sm"
                >
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main column */}
          <div className="lg:col-span-3 space-y-5">
            {/* Informações Básicas (unified) */}
            <CollapsibleSection
              title="Informações Básicas"
              icon={<Info className="h-5 w-5" />}
              defaultOpen
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data */}
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                    Data da Reunião
                  </label>
                  {isEditMode ? (
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-between font-normal h-10",
                            !meetingData.meeting_date && "text-muted-foreground"
                          )}
                        >
                          {meetingData.meeting_date
                            ? format(
                                parseLocalDate(meetingData.meeting_date.split("T")[0]),
                                "dd/MM/yyyy",
                                { locale: ptBR }
                              )
                            : "Selecionar data"}
                          <CalendarDays className="h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            meetingData.meeting_date
                              ? parseLocalDate(meetingData.meeting_date.split("T")[0])
                              : undefined
                          }
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
                    <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-border/60 bg-muted/30 text-sm">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {meetingData.meeting_date
                          ? format(
                              parseLocalDate(meetingData.meeting_date.split("T")[0]),
                              "dd/MM/yyyy",
                              { locale: ptBR }
                            )
                          : "Não definida"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                    Status
                  </label>
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-border/60 bg-muted/30">
                    <MeetingStatusBadge status={meetingData.status} />
                  </div>
                </div>

                {/* Participantes — full width */}
                <div className="md:col-span-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                    Participantes
                  </label>
                  {isEditMode ? (
                    <Popover open={participantsOpen} onOpenChange={setParticipantsOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "w-full min-h-10 px-3 py-2 rounded-md border border-border/60 bg-background text-sm text-left hover:border-primary/40 transition-colors flex items-center flex-wrap gap-1.5"
                          )}
                        >
                          {meetingData.participants.length > 0 ? (
                            <>
                              {meetingData.participants.map((p) => (
                                <Badge
                                  key={p}
                                  variant="secondary"
                                  className="bg-primary/10 text-primary hover:bg-primary/15 gap-1 font-normal"
                                >
                                  {p}
                                  <X
                                    className="h-3 w-3 cursor-pointer opacity-60 hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMeetingData({
                                        ...meetingData,
                                        participants: meetingData.participants.filter(
                                          (x) => x !== p
                                        ),
                                      });
                                    }}
                                  />
                                </Badge>
                              ))}
                              <span className="text-primary text-xs font-medium ml-1">
                                + Adicionar
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Adicionar participantes
                            </span>
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar..." />
                          <CommandList>
                            <CommandEmpty>Nenhum resultado.</CommandEmpty>
                            <CommandGroup>
                              {profiles.map((profile) => {
                                const isSelected = meetingData.participants.includes(
                                  profile.full_name
                                );
                                return (
                                  <CommandItem
                                    key={profile.id}
                                    onSelect={() => {
                                      const newParticipants = isSelected
                                        ? meetingData.participants.filter(
                                            (p) => p !== profile.full_name
                                          )
                                        : [
                                            ...meetingData.participants,
                                            profile.full_name,
                                          ];
                                      setMeetingData({
                                        ...meetingData,
                                        participants: newParticipants,
                                      });
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      className="mr-2"
                                    />
                                    {profile.full_name}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  ) : meetingData.participants.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {meetingData.participants.map((p) => (
                        <Badge
                          key={p}
                          variant="secondary"
                          className="bg-primary/10 text-primary font-normal"
                        >
                          {p}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhum participante
                    </p>
                  )}
                </div>
              </div>
            </CollapsibleSection>

            {/* Pauta e Contexto */}
            <CollapsibleSection
              title="Pauta e Contexto"
              icon={<FileText className="h-5 w-5" />}
              defaultOpen
            >
              <div className="space-y-5">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                    Objetivo da reunião
                  </label>
                  {isEditMode ? (
                    <Textarea
                      value={sections.objective}
                      onChange={(e) =>
                        setSections({ ...sections, objective: e.target.value })
                      }
                      placeholder="Ex: Apresentar resultados do mês e alinhar próximas ações..."
                      className="min-h-[60px]"
                    />
                  ) : (
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                      {sections.objective || (
                        <span className="italic text-muted-foreground">
                          Não definido
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">
                    Contexto
                  </label>
                  {isEditMode ? (
                    <Textarea
                      value={sections.context}
                      onChange={(e) =>
                        setSections({ ...sections, context: e.target.value })
                      }
                      placeholder="Breve contexto sobre a situação atual do cliente..."
                      className="min-h-[100px]"
                    />
                  ) : (
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                      {sections.context || (
                        <span className="italic text-muted-foreground">
                          Não definido
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
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

            {/* Plano de Ação e Discussões */}
            <CollapsibleSection
              title="Plano de Ação e Discussões"
              icon={<Wrench className="h-5 w-5" />}
            >
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    Discussões e anotações
                  </div>
                  {isEditMode ? (
                    <>
                      <RichTextEditor
                        content={sections.questionsAndDiscussions}
                        onChange={(content) =>
                          setSections({
                            ...sections,
                            questionsAndDiscussions: content,
                          })
                        }
                        placeholder="Registre dúvidas, decisões e discussões importantes da reunião..."
                      />
                      {sections.questionsAndDiscussions && (
                        <div className="flex justify-end">
                          <SendToTasksButton
                            clientId={clientId || ""}
                            meetingId={meetingId}
                            text={sections.questionsAndDiscussions
                              .replace(/<[^>]*>/g, "")
                              .substring(0, 100)}
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

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Wrench className="h-4 w-4" />
                    Tarefas do plano
                  </div>
                  <ActionPlanWorkspace
                    meetingId={meetingId}
                    clientId={clientId || ""}
                    profiles={profiles}
                    readOnly={!isEditMode}
                  />
                </div>
              </div>
            </CollapsibleSection>

            {/* Cronograma */}
            <CollapsibleSection
              title="Cronograma"
              icon={<CalendarRange className="h-5 w-5" />}
              defaultOpen
            >
              <p className="text-sm text-muted-foreground mb-4">
                Calendário do mês com todas as atividades do plano de ação. Clique em uma atividade para ver os detalhes.
              </p>
              <MeetingScheduleSection
                meetingId={meetingId}
                clientId={clientId || ""}
                meetingDate={meetingData.meeting_date}
                readOnly={!isEditMode}
              />
            </CollapsibleSection>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-28 space-y-5">
              {/* Atividades vinculadas */}
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

              {/* Resumo da Reunião */}
              <div className="rounded-xl border border-border/60 bg-card shadow-sm p-5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary mb-4">
                  Resumo da Reunião
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      Data
                    </span>
                    <span className="font-medium">
                      {meetingData.meeting_date
                        ? format(
                            parseLocalDate(meetingData.meeting_date.split("T")[0]),
                            "dd/MM/yy",
                            { locale: ptBR }
                          )
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <ListChecks className="h-3.5 w-3.5" />
                      Tarefas Vinculadas
                    </span>
                    <span className="font-medium">
                      {linkedTasksCount} {linkedTasksCount === 1 ? "selecionada" : "selecionadas"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      Participantes
                    </span>
                    <span className="font-medium">
                      {meetingData.participants.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full animate-pulse",
                          isSaving ? "bg-amber-500" : "bg-emerald-500"
                        )}
                      />
                      Status do Sync
                    </span>
                    <span
                      className={cn(
                        "font-medium",
                        isSaving ? "text-amber-600" : "text-emerald-600"
                      )}
                    >
                      {isSaving ? "Salvando..." : "Em tempo real"}
                    </span>
                  </div>
                </div>
              </div>

              {/* IA Vivaz Sugere */}
              <div className="rounded-xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4" />
                  <h3 className="font-bold">IA Vivaz Sugere</h3>
                </div>
                <p className="text-sm leading-relaxed text-primary-foreground/90">
                  Use as métricas inseridas na seção de KPIs para gerar insights automáticos. A IA analisa tendências e recomenda focos para a próxima reunião.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
