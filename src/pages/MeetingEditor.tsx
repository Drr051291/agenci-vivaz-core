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
import { ArrowLeft, Save, Calendar as CalendarIcon, Users, CheckSquare, Presentation, X, ChevronLeft, ChevronRight, Pencil, CalendarDays, RefreshCw, Check, ListTodo, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useMeetingCalendarSync } from "@/hooks/useMeetingCalendarSync";

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
  }, [meetingData, selectedTasks, isEditMode]);

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
  }, [isPresentationMode, meetingData]);

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
  }, [isPresentationMode, meetingData]);

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
      });
      setSelectedTasks(meetingDataRes.linked_tasks || []);

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
        })
        .eq("id", meetingId);

      if (error) throw error;

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
  }, [meetingData, selectedTasks, meetingId, isSaving, clientName, isConnected, isSynced, updateMeetingInCalendar]);

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

  const getSections = () => {
    const sections = [];
    sections.push({ id: 'content', title: 'Discussões e Anotações' });
    if (meetingData.action_items && meetingData.action_items.length > 0) {
      sections.push({ id: 'actions', title: 'Itens de Ação' });
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
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Presentation Mode
  if (isPresentationMode) {
    const sections = getSections();

    return (
      <div className="fixed inset-0 bg-background z-50 overflow-auto">
        {/* Navigation */}
        <div className="fixed top-4 left-0 right-0 z-50 flex items-center justify-between px-6">
          <div className="flex items-center gap-3 bg-background/95 backdrop-blur rounded-full px-5 py-2.5 border shadow-lg">
            <div className="flex items-center gap-1.5">
              {sections.map((_, idx) => (
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
              {currentSection + 1} / {sections.length}
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
        {currentSection < sections.length - 1 && (
          <Button
            onClick={handleNextSection}
            variant="secondary"
            size="icon"
            className="fixed right-6 top-1/2 -translate-y-1/2 z-40 h-12 w-12 rounded-full shadow-lg"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}

        <div className="max-w-4xl mx-auto px-8 pt-24 pb-16">
          {/* Header */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
              <FileText className="h-4 w-4" />
              Ata de Reunião
            </div>
            <h1 className="text-4xl font-bold mb-4">{meetingData.title}</h1>
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

          {/* Content */}
          <div 
            id="section-0"
            className={cn(
              "mb-12 p-8 rounded-2xl bg-card border transition-all",
              currentSection === 0 && "ring-2 ring-primary/20"
            )}
          >
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Discussões e Anotações
            </h2>
            <div className="prose prose-lg max-w-none">
              <MeetingViewer content={meetingData.content} />
            </div>
          </div>

          {/* Action Items */}
          {meetingData.action_items && meetingData.action_items.length > 0 && (
            <div 
              id={`section-${sections.length - 1}`}
              className={cn(
                "p-8 rounded-2xl bg-card border transition-all",
                currentSection === sections.length - 1 && "ring-2 ring-primary/20"
              )}
            >
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                Itens de Ação
              </h2>
              <div className="space-y-4">
                {meetingData.action_items.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-muted/50">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">{idx + 1}</span>
                    </div>
                    <span className="flex-1 pt-1">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
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
              <div>
                <h1 className="text-xl font-semibold">
                  {meetingData.title || "Nova Reunião"}
                </h1>
                <p className="text-sm text-muted-foreground">{clientName}</p>
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
      <div className="max-w-6xl mx-auto px-6 py-6">
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

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Editor */}
          <Card className="lg:col-span-3 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Conteúdo</h2>
            </div>
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
          </Card>

          {/* Tasks Sidebar */}
          <Card className="p-4 h-fit lg:sticky lg:top-24">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Atividades</h3>
              </div>
              {selectedTasks.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedTasks.length}
                </Badge>
              )}
            </div>
            
            {isEditMode && tasks.length > 0 && (
              <div className="flex gap-2 mb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 flex-1"
                  onClick={() => {
                    const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
                    setSelectedTasks(pendingTasks.map(t => t.id));
                  }}
                >
                  Pendentes
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setSelectedTasks([])}
                >
                  Limpar
                </Button>
              </div>
            )}
            
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {tasks.length > 0 ? (
                tasks.map((task) => {
                  const isSelected = selectedTasks.includes(task.id);
                  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
                    pending: { bg: "bg-amber-50", text: "text-amber-700", label: "Pendente" },
                    in_progress: { bg: "bg-blue-50", text: "text-blue-700", label: "Em andamento" },
                    completed: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Concluída" },
                    review: { bg: "bg-violet-50", text: "text-violet-700", label: "Revisão" },
                    cancelled: { bg: "bg-gray-50", text: "text-gray-500", label: "Cancelada" },
                  };
                  const config = statusConfig[task.status] || statusConfig.pending;
                  
                  return (
                    <div
                      key={task.id}
                      onClick={() => isEditMode && handleTaskToggle(task.id)}
                      className={cn(
                        "p-3 rounded-lg border transition-all",
                        isEditMode && "cursor-pointer hover:border-primary/50",
                        isSelected ? "bg-primary/5 border-primary/30" : "bg-background"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {isEditMode && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleTaskToggle(task.id)}
                            className="mt-0.5"
                          />
                        )}
                        {!isEditMode && isSelected && (
                          <Check className="h-4 w-4 text-primary mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            !isSelected && !isEditMode && "text-muted-foreground"
                          )}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn("text-xs px-1.5 py-0.5 rounded", config.bg, config.text)}>
                              {config.label}
                            </span>
                            {task.due_date && (
                              <span className="text-xs text-muted-foreground">
                                {format(parseLocalDate(task.due_date), "dd/MM", { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma atividade</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
