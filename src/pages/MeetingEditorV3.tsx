import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/meeting-editor/RichTextEditor";
import { MeetingViewer } from "@/components/meeting-editor/MeetingViewer";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Home,
  TrendingUp,
  Plus,
  Search,
  Bell,
  Settings,
  HelpCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  MetricsSection,
  MeetingStatusBadge,
} from "@/components/meetings";
import { ActionPlanItem } from "@/components/meetings/MeetingActionPlan";
import {
  SendToTasksButton,
  ActionPlanWorkspace,
  MeetingScheduleSection,
} from "@/components/meetings/v2";
import {
  useClientSlugResolver,
  useMeetingSlugResolver,
} from "@/hooks/useSlugResolver";

/* ----------------------------- Types ------------------------------ */
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

/* --------------------------- Component --------------------------- */
export default function MeetingEditorV3() {
  const { clientId: clientSlugOrId, meetingId: meetingSlugOrId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "view";
  const isEditMode = mode === "edit";

  const [dataLoading, setDataLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [clientName, setClientName] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);

  const { clientId, clientSlug, loading: clientLoading, error: clientError } =
    useClientSlugResolver(clientSlugOrId);
  const { meetingId, meetingSlug, loading: meetingLoading, error: meetingError } =
    useMeetingSlugResolver(clientId, meetingSlugOrId);

  const loading = clientLoading || meetingLoading || dataLoading;

  useEffect(() => {
    if (clientSlug && meetingSlug && (clientSlugOrId !== clientSlug || meetingSlugOrId !== meetingSlug)) {
      navigate(`/clientes/${clientSlug}/reunioes/${meetingSlug}?${searchParams.toString()}`, { replace: true });
    }
  }, [clientSlug, meetingSlug, clientSlugOrId, meetingSlugOrId, navigate, searchParams]);

  useEffect(() => {
    if (clientError || meetingError) {
      toast.error("Reunião não encontrada");
      navigate(`/clientes/${clientSlugOrId || ""}`);
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
    meeting_link: "" as string,
  });

  const [sections, setSections] = useState<MeetingSections>(DEFAULT_SECTIONS);

  usePageMeta({
    title: meetingData.title || "Reunião",
    description: `Edite e visualize a reunião ${meetingData.title || ""}`,
    keywords: "reunião, ata, editor, vivaz, performance",
  });

  /* -------- Load -------- */
  useEffect(() => {
    if (clientId && meetingId) loadMeetingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, meetingId]);

  const loadMeetingData = async () => {
    try {
      const { data: clientData } = await supabase
        .from("clients")
        .select("company_name")
        .eq("id", clientId)
        .single();
      if (clientData) setClientName(clientData.company_name);

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
        meeting_link: meetingDataRes.meeting_link || "",
      });
      setSelectedTasks(meetingDataRes.linked_tasks || []);

      const { data: sectionsData } = await supabase
        .from("meeting_sections")
        .select("*")
        .eq("meeting_id", meetingId);

      if (sectionsData && sectionsData.length > 0) {
        const loaded = { ...DEFAULT_SECTIONS };
        sectionsData.forEach((s) => {
          const c = s.content_json as Record<string, unknown>;
          if (!c) return;
          switch (s.section_key) {
            case "objective":
              loaded.objective = (c.text as string) || "";
              break;
            case "context":
              loaded.context = (c.text as string) || "";
              break;
            case "action_plan":
              loaded.actionPlan = (c.items as ActionPlanItem[]) || [];
              break;
            case "questions_discussions":
              loaded.questionsAndDiscussions = (c.text as string) || "";
              break;
          }
        });
        setSections(loaded);
      }

      const { data: metricsData } = await supabase
        .from("meeting_metrics")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("sort_order");

      if (metricsData && metricsData.length > 0) {
        setSections((prev) => ({
          ...prev,
          metrics: metricsData.map((m) => ({
            metric_key: m.metric_key,
            metric_label: m.metric_label,
            target_value: m.target_value,
            actual_value: m.actual_value,
            unit: m.unit || "",
          })),
        }));
      }

      const { data: channelsData } = await supabase
        .from("meeting_channels")
        .select("*")
        .eq("meeting_id", meetingId);

      if (channelsData && channelsData.length > 0) {
        setSections((prev) => ({
          ...prev,
          channels: channelsData.map((c) => ({
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
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar reunião");
      navigate(`/clientes/${clientSlug || clientSlugOrId}`);
    } finally {
      setDataLoading(false);
    }
  };

  /* -------- Title -------- */
  const generateTitle = (meetingDate: string, createdAt?: string) => {
    if (meetingDate && meetingDate.trim() !== "") {
      const dateOnly = meetingDate.split("T")[0];
      const date = parseLocalDate(dateOnly);
      return `Vivaz - ${clientName} - ${format(date, "dd/MM/yyyy", { locale: ptBR })}`;
    }
    if (createdAt) {
      const dateOnly = createdAt.split("T")[0];
      const date = parseLocalDate(dateOnly);
      return `Vivaz - ${clientName} - ${format(date, "dd/MM/yyyy", { locale: ptBR })}`;
    }
    return `Vivaz - ${clientName} - Nova Reunião`;
  };

  /* -------- Autosave -------- */
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
          meeting_link: meetingData.meeting_link || null,
        })
        .eq("id", meetingId);
      if (error) throw error;

      const sectionsToSave = [
        { section_key: "objective", title: "Objetivo da reunião", content_json: { text: sections.objective } as any, sort_order: 0 },
        { section_key: "context", title: "Contexto", content_json: { text: sections.context } as any, sort_order: 1 },
        { section_key: "action_plan", title: "Plano de ação", content_json: { items: sections.actionPlan } as any, sort_order: 2 },
        { section_key: "questions_discussions", title: "Dúvidas e discussões", content_json: { text: sections.questionsAndDiscussions } as any, sort_order: 3 },
      ];
      for (const s of sectionsToSave) {
        const { data: existing } = await supabase
          .from("meeting_sections")
          .select("id")
          .eq("meeting_id", meetingId)
          .eq("section_key", s.section_key)
          .maybeSingle();
        if (existing) {
          await supabase.from("meeting_sections").update({ content_json: s.content_json }).eq("id", existing.id);
        } else {
          await supabase.from("meeting_sections").insert([{ meeting_id: meetingId, ...s }]);
        }
      }

      await supabase.from("meeting_metrics").delete().eq("meeting_id", meetingId);
      if (sections.metrics.length > 0) {
        await supabase.from("meeting_metrics").insert(
          sections.metrics.map((m, idx) => ({
            meeting_id: meetingId,
            metric_key: m.metric_key,
            metric_label: m.metric_label,
            target_value: m.target_value,
            actual_value: m.actual_value,
            unit: m.unit,
            sort_order: idx,
          }))
        );
      }
    } catch (err) {
      console.error("autosave", err);
    } finally {
      setIsSaving(false);
    }
  }, [meetingData, selectedTasks, sections, meetingId, isSaving, clientName]);

  useEffect(() => {
    if (!meetingId || loading || !isEditMode) return;
    const t = setTimeout(() => handleAutoSave(), AUTOSAVE_DELAY);
    return () => clearTimeout(t);
  }, [meetingData, selectedTasks, sections, isEditMode, meetingId, loading, handleAutoSave]);

  const handleSave = async () => {
    await handleAutoSave();
    toast.success("Alterações salvas!");
  };

  const handleTaskToggle = (taskId: string) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  /* -------- KPI insight -------- */
  const kpiInsight = useMemo(() => {
    const cpl = sections.metrics.find((m) => m.metric_key === "cpl");
    if (cpl && cpl.actual_value && cpl.target_value && cpl.target_value > 0) {
      const variation = ((cpl.actual_value - cpl.target_value) / cpl.target_value) * 100;
      if (variation <= -5) {
        return {
          tone: "positive" as const,
          title: "Resultado Acima da Média",
          message: `O CPL está ${Math.abs(variation).toFixed(0)}% abaixo da meta estipulada para este período.`,
        };
      }
      if (variation >= 10) {
        return {
          tone: "warning" as const,
          title: "CPL Acima da Meta",
          message: `O CPL está ${variation.toFixed(0)}% acima da meta. Reveja segmentação e criativos.`,
        };
      }
    }
    return null;
  }, [sections.metrics]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  /* ============================ RENDER ============================ */
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar — breadcrumb + search + actions (Stitch ref) */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center gap-4">
          <nav className="flex items-center gap-1.5 text-sm shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/clientes/${clientSlug || clientSlugOrId}?tab=meetings`)}
              className="h-8 px-2 -ml-2 text-muted-foreground hover:text-foreground gap-1.5"
            >
              <Home className="h-3.5 w-3.5" />
              Dashboard
            </Button>
            <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="font-semibold text-primary">Reuniões</span>
          </nav>

          <div className="flex-1 max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                className="pl-9 h-9 bg-muted/50 border-border/60"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isEditMode && (
              <span
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full font-medium mr-2",
                  isSaving
                    ? "text-muted-foreground bg-muted animate-pulse"
                    : "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400"
                )}
              >
                {isSaving ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Salvando
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3" />
                    Salvo
                  </span>
                )}
              </span>
            )}
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70 ml-1" />
          </div>
        </div>
      </header>

      {/* Page header */}
      <div className="max-w-[1600px] mx-auto px-6 pt-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            {isEditMode ? (
              <Input
                value={meetingData.title}
                onChange={(e) => setMeetingData({ ...meetingData, title: e.target.value })}
                placeholder="Nome da reunião..."
                className="text-3xl font-bold h-12 border-0 bg-transparent px-0 focus-visible:ring-0 shadow-none"
              />
            ) : (
              <h1 className="text-3xl font-bold leading-tight tracking-tight">
                {meetingData.title || "Nova Reunião"}
              </h1>
            )}
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>{formattedFullDate}</span>
              </div>
              <span className="text-border">•</span>
              <MeetingStatusBadge status={meetingData.status} />
              <span className="text-border">•</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                Reunião de Performance
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isEditMode ? (
              <>
                <Button
                  onClick={() =>
                    navigate(`/clientes/${clientSlug || clientSlugOrId}/reunioes/${meetingSlug || meetingSlugOrId}`)
                  }
                  variant="ghost"
                  size="sm"
                >
                  Descartar
                </Button>
                <Button onClick={handleSave} size="sm" className="gap-1.5">
                  <Save className="h-4 w-4" />
                  Salvar
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
                className="gap-1.5"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div className="max-w-[1600px] mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          {/* MAIN COLUMN */}
          <div className="space-y-6 min-w-0">
            {/* Card: Informações Básicas */}
            <SectionCard
              icon={<Info className="h-5 w-5" />}
              title="Informações Básicas"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Data da Reunião">
                  {isEditMode ? (
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-between font-normal h-11 bg-background",
                            !meetingData.meeting_date && "text-muted-foreground"
                          )}
                        >
                          {meetingData.meeting_date
                            ? format(parseLocalDate(meetingData.meeting_date.split("T")[0]), "dd/MM/yyyy", { locale: ptBR })
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
                    <ReadOnlyValue icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}>
                      {meetingData.meeting_date
                        ? format(parseLocalDate(meetingData.meeting_date.split("T")[0]), "dd/MM/yyyy", { locale: ptBR })
                        : "Não definida"}
                    </ReadOnlyValue>
                  )}
                </Field>

                <Field label="Horário">
                  {isEditMode ? (
                    <div className="relative">
                      <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type="time"
                        value={meetingData.meeting_date ? meetingData.meeting_date.split("T")[1]?.slice(0, 5) || "" : ""}
                        onChange={(e) => {
                          const datePart = meetingData.meeting_date?.split("T")[0] || format(new Date(), "yyyy-MM-dd");
                          setMeetingData({
                            ...meetingData,
                            meeting_date: `${datePart}T${e.target.value}`,
                          });
                        }}
                        className="h-11 bg-background pr-10"
                      />
                    </div>
                  ) : (
                    <ReadOnlyValue icon={<Clock className="h-4 w-4 text-muted-foreground" />}>
                      {meetingData.meeting_date?.split("T")[1]?.slice(0, 5) || "—"}
                    </ReadOnlyValue>
                  )}
                </Field>

                <Field label="Link da reunião (Google Meet / Zoom)" full>
                  {isEditMode ? (
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={meetingData.meeting_link}
                        onChange={(e) => setMeetingData({ ...meetingData, meeting_link: e.target.value })}
                        placeholder="https://meet.google.com/abc-defg-hij"
                        className="h-11 pl-10 bg-background"
                      />
                    </div>
                  ) : (
                    <ReadOnlyValue icon={<Link2 className="h-4 w-4 text-muted-foreground" />}>
                      {meetingData.meeting_link ? (
                        <a
                          href={meetingData.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline truncate"
                        >
                          {meetingData.meeting_link}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Sem link</span>
                      )}
                    </ReadOnlyValue>
                  )}
                </Field>

                <Field label="Participantes" full>
                  {isEditMode ? (
                    <Popover open={participantsOpen} onOpenChange={setParticipantsOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full min-h-11 px-3 py-2 rounded-md border border-border/60 bg-background text-sm text-left hover:border-primary/40 transition-colors flex items-center flex-wrap gap-1.5"
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
                                        participants: meetingData.participants.filter((x) => x !== p),
                                      });
                                    }}
                                  />
                                </Badge>
                              ))}
                              <span className="text-primary text-xs font-medium ml-1">+ Adicionar</span>
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
                                const isSelected = meetingData.participants.includes(profile.full_name);
                                return (
                                  <CommandItem
                                    key={profile.id}
                                    onSelect={() => {
                                      const newParticipants = isSelected
                                        ? meetingData.participants.filter((p) => p !== profile.full_name)
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
                  ) : meetingData.participants.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {meetingData.participants.map((p) => (
                        <Badge key={p} variant="secondary" className="bg-primary/10 text-primary font-normal">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum participante</p>
                  )}
                </Field>
              </div>
            </SectionCard>

            {/* Card: Pauta e Contexto */}
            <SectionCard
              icon={<FileText className="h-5 w-5" />}
              title="Pauta e Contexto"
              description="Defina o objetivo e pauta da reunião"
            >
              <div className="space-y-5">
                <Field label="Objetivo da reunião">
                  {isEditMode ? (
                    <Textarea
                      value={sections.objective}
                      onChange={(e) => setSections({ ...sections, objective: e.target.value })}
                      placeholder="Ex: Apresentar resultados do mês e alinhar próximas ações..."
                      className="min-h-[60px] bg-background"
                    />
                  ) : (
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                      {sections.objective || <span className="italic text-muted-foreground">Não definido</span>}
                    </p>
                  )}
                </Field>
                <Field label="Pauta detalhada">
                  {isEditMode ? (
                    <Textarea
                      value={sections.context}
                      onChange={(e) => setSections({ ...sections, context: e.target.value })}
                      placeholder={"1. Abertura e Alinhamento de Expectativas\n2. Revisão das metas do último mês\n3. Apresentação dos resultados..."}
                      className="min-h-[140px] bg-background font-mono text-sm"
                    />
                  ) : (
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                      {sections.context || <span className="italic text-muted-foreground">Não definido</span>}
                    </p>
                  )}
                </Field>
              </div>
            </SectionCard>

            {/* Card: Análise de KPIs (highlighted, Stitch ref) */}
            <SectionCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Análise de KPIs"
              description="Métricas-chave do período"
            >
              <MetricsSection
                metrics={sections.metrics}
                onChange={(metrics) => setSections({ ...sections, metrics })}
                isEditing={isEditMode}
              />
              {kpiInsight && (
                <div
                  className={cn(
                    "mt-5 rounded-xl p-4 flex items-start gap-3 border",
                    kpiInsight.tone === "positive" &&
                      "bg-emerald-500/5 border-emerald-500/20",
                    kpiInsight.tone === "warning" &&
                      "bg-amber-500/5 border-amber-500/20"
                  )}
                >
                  <div
                    className={cn(
                      "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
                      kpiInsight.tone === "positive" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                      kpiInsight.tone === "warning" && "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    )}
                  >
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{kpiInsight.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{kpiInsight.message}</p>
                  </div>
                </div>
              )}
            </SectionCard>

            {/* Card: Plano de Ação e Discussões */}
            <SectionCard
              icon={<Wrench className="h-5 w-5" />}
              title="Plano de Ação e Discussões"
              description="Próximos passos e tarefas do plano"
            >
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Discussões e anotações
                  </label>
                  {isEditMode ? (
                    <>
                      <RichTextEditor
                        content={sections.questionsAndDiscussions}
                        onChange={(content) =>
                          setSections({ ...sections, questionsAndDiscussions: content })
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
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Wrench className="h-3.5 w-3.5" />
                    Tarefas do plano
                  </label>
                  <ActionPlanWorkspace
                    meetingId={meetingId}
                    clientId={clientId || ""}
                    profiles={profiles}
                    readOnly={!isEditMode}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Card: Cronograma */}
            <SectionCard
              icon={<CalendarRange className="h-5 w-5" />}
              title="Cronograma"
              description="Visão consolidada das atividades no calendário"
            >
              <MeetingScheduleSection
                meetingId={meetingId}
                clientId={clientId || ""}
                meetingDate={meetingData.meeting_date}
                readOnly={!isEditMode}
              />
            </SectionCard>
          </div>

          {/* SIDEBAR */}
          <aside className="min-w-0">
            <div className="xl:sticky xl:top-24 space-y-5">
              {/* Atividades vinculadas */}
              <LinkedActivitiesCard
                tasks={tasks}
                selectedTasks={selectedTasks}
                onTaskToggle={handleTaskToggle}
                isEditing={isEditMode}
              />

              {/* Resumo da Reunião */}
              <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary mb-4">
                  Resumo da Reunião
                </h3>
                <div className="space-y-3 text-sm">
                  <SummaryRow icon={<Clock className="h-3.5 w-3.5" />} label="Estimativa de Duração">
                    <span className="font-medium">45 min</span>
                  </SummaryRow>
                  <SummaryRow icon={<ListChecks className="h-3.5 w-3.5" />} label="Tarefas Vinculadas">
                    <span className="font-medium">
                      {linkedTasksCount} {linkedTasksCount === 1 ? "selecionada" : "selecionadas"}
                    </span>
                  </SummaryRow>
                  <SummaryRow icon={<Users className="h-3.5 w-3.5" />} label="Participantes">
                    <span className="font-medium">{meetingData.participants.length}</span>
                  </SummaryRow>
                  <div className="flex items-center justify-between pt-3 border-t border-border/60">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full animate-pulse",
                          isSaving ? "bg-amber-500" : "bg-emerald-500"
                        )}
                      />
                      Status do Sync
                    </span>
                    <span className={cn("font-medium text-xs", isSaving ? "text-amber-600" : "text-emerald-600")}>
                      {isSaving ? "Salvando..." : "Em tempo real"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ========================== Sub-components ========================== */

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border/60 bg-muted/20">
        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-base leading-tight">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(full && "md:col-span-2")}>
      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}

function ReadOnlyValue({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 h-11 px-3 rounded-md border border-border/60 bg-muted/30 text-sm">
      {icon}
      <span className="truncate">{children}</span>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground flex items-center gap-2">
        {icon}
        {label}
      </span>
      {children}
    </div>
  );
}

function LinkedActivitiesCard({
  tasks,
  selectedTasks,
  onTaskToggle,
  isEditing,
}: {
  tasks: Task[];
  selectedTasks: string[];
  onTaskToggle: (id: string) => void;
  isEditing: boolean;
}) {
  const activeCount = selectedTasks.length;
  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ClipboardIcon />
          </div>
          <h3 className="font-semibold text-sm leading-tight">Atividades Vinculadas</h3>
        </div>
        {activeCount > 0 && (
          <span className="text-[10px] uppercase tracking-wider font-bold bg-primary/10 text-primary px-2 py-1 rounded-full">
            {activeCount} {activeCount === 1 ? "ativa" : "ativas"}
          </span>
        )}
      </header>
      <div className="p-4 space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Selecione as tarefas do projeto que deseja pautar nesta reunião:
        </p>
        <ScrollArea className="h-[420px] pr-2 -mr-2">
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                Nenhuma atividade disponível
              </div>
            ) : (
              tasks.map((task) => {
                const checked = selectedTasks.includes(task.id);
                const isPriorityHigh = task.priority === "high";
                const isOverdue =
                  task.due_date && new Date(task.due_date) < new Date() && task.status !== "concluido";
                return (
                  <label
                    key={task.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                      checked
                        ? "border-primary/40 bg-primary/[0.04]"
                        : "border-border/60 bg-background hover:border-border hover:bg-muted/30",
                      !isEditing && "cursor-default opacity-90"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => isEditing && onTaskToggle(task.id)}
                      disabled={!isEditing}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                        <span
                          className={cn(
                            "font-medium",
                            isPriorityHigh && "text-rose-600 dark:text-rose-400"
                          )}
                        >
                          Prioridade: {priorityLabel(task.priority)}
                        </span>
                        {task.due_date && (
                          <>
                            <span>•</span>
                            <span className={cn(isOverdue && "text-rose-600 dark:text-rose-400 font-medium")}>
                              {formatDueDate(task.due_date)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function ClipboardIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    </svg>
  );
}

function priorityLabel(p?: string) {
  switch (p) {
    case "high":
      return "Alta";
    case "medium":
      return "Média";
    case "low":
      return "Baixa";
    default:
      return "—";
  }
}

function formatDueDate(date: string) {
  const d = parseLocalDate(date.split("T")[0]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d.toDateString() === today.toDateString()) return "Vence hoje";
  return `Prazo: ${format(d, "dd/MM", { locale: ptBR })}`;
}