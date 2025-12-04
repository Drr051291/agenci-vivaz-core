import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Plus,
  Loader2,
  ExternalLink,
  Pencil,
  Trash2,
  RefreshCw,
  Clock,
  Users,
  CalendarDays,
} from "lucide-react";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { format, startOfDay, endOfDay, addDays, subDays, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type PeriodFilter = "upcoming" | "today" | "week" | "month" | "past_week" | "past_month" | "all";

interface GoogleCalendarManagerProps {
  clientEmail?: string;
  onImportEvent?: (event: {
    title: string;
    date: Date;
    description?: string;
    googleEventId?: string;
  }) => Promise<void>;
}

export const GoogleCalendarManager = ({ clientEmail, onImportEvent }: GoogleCalendarManagerProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("events");
  const [importing, setImporting] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [showOnlyClientEvents, setShowOnlyClientEvents] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("upcoming");
  
  // Create event form state
  const [newEvent, setNewEvent] = useState({
    summary: "",
    description: "",
    startDate: "",
    startTime: "09:00",
    endDate: "",
    endTime: "10:00",
    attendees: "",
  });

  const {
    events,
    isLoadingEvents,
    refetchEvents,
    isConnected,
    createEvent,
    isCreatingEvent,
    updateEvent,
    isUpdatingEvent,
    deleteEvent,
    isDeletingEvent,
  } = useGoogleCalendar();

  // Filter events by period and client email
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    
    const now = new Date();
    const today = startOfDay(now);
    
    return events.filter((event) => {
      // First filter by client email if enabled
      if (showOnlyClientEvents && clientEmail) {
        const attendeeEmails = event.attendees?.map((a: any) => a.email?.toLowerCase()) || [];
        if (!attendeeEmails.includes(clientEmail.toLowerCase())) {
          return false;
        }
      }
      
      // Then filter by period
      const eventDate = event.start.dateTime
        ? new Date(event.start.dateTime)
        : new Date(event.start.date);
      
      switch (periodFilter) {
        case "upcoming":
          return eventDate >= today;
        case "today":
          return eventDate >= today && eventDate <= endOfDay(now);
        case "week":
          return eventDate >= today && eventDate <= addDays(today, 7);
        case "month":
          return eventDate >= today && eventDate <= addMonths(today, 1);
        case "past_week":
          return eventDate >= subDays(today, 7) && eventDate < today;
        case "past_month":
          return eventDate >= subMonths(today, 1) && eventDate < today;
        case "all":
        default:
          return true;
      }
    }).sort((a, b) => {
      const dateA = a.start.dateTime ? new Date(a.start.dateTime) : new Date(a.start.date);
      const dateB = b.start.dateTime ? new Date(b.start.dateTime) : new Date(b.start.date);
      // For upcoming/future, sort ascending; for past, sort descending
      return periodFilter.startsWith("past") ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    });
  }, [events, showOnlyClientEvents, clientEmail, periodFilter]);

  if (!isConnected) {
    return null;
  }

  const handleImport = async (event: any) => {
    if (!onImportEvent) return;
    
    setImporting(event.id);
    try {
      const startDate = event.start.dateTime
        ? new Date(event.start.dateTime)
        : new Date(event.start.date);

      await onImportEvent({
        title: event.summary || "Evento sem título",
        date: startDate,
        description: event.description,
        googleEventId: event.id,
      });

      setOpen(false);
      toast.success("Evento importado com sucesso!");
    } catch (error) {
      console.error("Error importing event:", error);
      toast.error("Erro ao importar evento");
    } finally {
      setImporting(null);
    }
  };

  const handleCreateEvent = () => {
    if (!newEvent.summary || !newEvent.startDate || !newEvent.endDate) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const startDateTime = `${newEvent.startDate}T${newEvent.startTime}:00`;
    const endDateTime = `${newEvent.endDate}T${newEvent.endTime}:00`;
    const attendeesList = newEvent.attendees
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email);

    createEvent(
      {
        summary: newEvent.summary,
        description: newEvent.description,
        startDateTime,
        endDateTime,
        attendees: attendeesList,
      },
      {
        onSuccess: () => {
          setNewEvent({
            summary: "",
            description: "",
            startDate: "",
            startTime: "09:00",
            endDate: "",
            endTime: "10:00",
            attendees: "",
          });
          setActiveTab("events");
          toast.success("Evento criado com sucesso!");
        },
      }
    );
  };

  const handleEditEvent = () => {
    if (!editingEvent) return;

    const startDateTime = `${editingEvent.startDate}T${editingEvent.startTime}:00`;
    const endDateTime = `${editingEvent.endDate}T${editingEvent.endTime}:00`;
    const attendeesList = editingEvent.attendees
      .split(",")
      .map((email: string) => email.trim())
      .filter((email: string) => email);

    updateEvent(
      {
        eventId: editingEvent.id,
        summary: editingEvent.summary,
        description: editingEvent.description,
        startDateTime,
        endDateTime,
        attendees: attendeesList,
      },
      {
        onSuccess: () => {
          setEditingEvent(null);
          toast.success("Evento atualizado com sucesso!");
        },
      }
    );
  };

  const handleDeleteEvent = () => {
    if (!deleteEventId) return;

    deleteEvent(deleteEventId, {
      onSuccess: () => {
        setDeleteEventId(null);
        toast.success("Evento excluído com sucesso!");
      },
    });
  };

  const startEditingEvent = (event: any) => {
    const startDate = event.start.dateTime
      ? new Date(event.start.dateTime)
      : new Date(event.start.date);
    const endDate = event.end.dateTime
      ? new Date(event.end.dateTime)
      : new Date(event.end.date);

    setEditingEvent({
      id: event.id,
      summary: event.summary || "",
      description: event.description || "",
      startDate: format(startDate, "yyyy-MM-dd"),
      startTime: format(startDate, "HH:mm"),
      endDate: format(endDate, "yyyy-MM-dd"),
      endTime: format(endDate, "HH:mm"),
      attendees: event.attendees?.map((a: any) => a.email).join(", ") || "",
    });
    setActiveTab("edit");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Google Calendar
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Gerenciar Google Calendar
            </DialogTitle>
            <DialogDescription>
              Visualize, crie e edite eventos do seu Google Calendar
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="events">Eventos</TabsTrigger>
              <TabsTrigger value="create">
                <Plus className="mr-1 h-4 w-4" />
                Criar
              </TabsTrigger>
              <TabsTrigger value="edit" disabled={!editingEvent}>
                <Pencil className="mr-1 h-4 w-4" />
                Editar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="mt-4">
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <Select value={periodFilter} onValueChange={(value: PeriodFilter) => setPeriodFilter(value)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Próximos eventos</SelectItem>
                          <SelectItem value="today">Hoje</SelectItem>
                          <SelectItem value="week">Próximos 7 dias</SelectItem>
                          <SelectItem value="month">Próximo mês</SelectItem>
                          <SelectItem value="past_week">Últimos 7 dias</SelectItem>
                          <SelectItem value="past_month">Último mês</SelectItem>
                          <SelectItem value="all">Todos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchEvents()}
                    disabled={isLoadingEvents}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingEvents ? "animate-spin" : ""}`} />
                    Atualizar
                  </Button>
                </div>
                
                {clientEmail && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="filterByClient"
                      checked={showOnlyClientEvents}
                      onChange={(e) => setShowOnlyClientEvents(e.target.checked)}
                      className="rounded border-border"
                    />
                    <Label htmlFor="filterByClient" className="text-sm cursor-pointer">
                      Apenas eventos do cliente ({clientEmail})
                    </Label>
                  </div>
                )}
              </div>

              <ScrollArea className="h-[400px] pr-4">
                {isLoadingEvents ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredEvents && filteredEvents.length > 0 ? (
                  <div className="space-y-3">
                    {filteredEvents.map((event) => {
                      const startDate = event.start.dateTime
                        ? new Date(event.start.dateTime)
                        : new Date(event.start.date);
                      const isPast = startDate < new Date();

                      return (
                        <div
                          key={event.id}
                          className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{event.summary}</span>
                              {isPast && <Badge variant="secondary">Passado</Badge>}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {format(startDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </div>
                            {event.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {event.description}
                              </p>
                            )}
                            {event.attendees && event.attendees.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                {event.attendees.length} participante(s)
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => window.open(event.htmlLink, "_blank")}
                              title="Abrir no Google"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => startEditingEvent(event)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteEventId(event.id)}
                              title="Excluir"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {onImportEvent && (
                              <Button
                                size="sm"
                                onClick={() => handleImport(event)}
                                disabled={importing === event.id}
                              >
                                {importing === event.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  "Importar"
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum evento encontrado</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="create" className="mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="summary">Título *</Label>
                  <Input
                    id="summary"
                    placeholder="Nome do evento"
                    value={newEvent.summary}
                    onChange={(e) => setNewEvent({ ...newEvent, summary: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Detalhes do evento"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data Início *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newEvent.startDate}
                      onChange={(e) => {
                        setNewEvent({ 
                          ...newEvent, 
                          startDate: e.target.value,
                          endDate: newEvent.endDate || e.target.value 
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Hora Início</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Data Fim *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newEvent.endDate}
                      onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">Hora Fim</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="attendees">Participantes (emails separados por vírgula)</Label>
                  <Input
                    id="attendees"
                    placeholder="email1@exemplo.com, email2@exemplo.com"
                    value={newEvent.attendees}
                    onChange={(e) => setNewEvent({ ...newEvent, attendees: e.target.value })}
                  />
                </div>

                <Button
                  onClick={handleCreateEvent}
                  disabled={isCreatingEvent}
                  className="w-full"
                >
                  {isCreatingEvent ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Criar Evento
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="edit" className="mt-4">
              {editingEvent && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-summary">Título *</Label>
                    <Input
                      id="edit-summary"
                      placeholder="Nome do evento"
                      value={editingEvent.summary}
                      onChange={(e) =>
                        setEditingEvent({ ...editingEvent, summary: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Descrição</Label>
                    <Textarea
                      id="edit-description"
                      placeholder="Detalhes do evento"
                      value={editingEvent.description}
                      onChange={(e) =>
                        setEditingEvent({ ...editingEvent, description: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-startDate">Data Início *</Label>
                      <Input
                        id="edit-startDate"
                        type="date"
                        value={editingEvent.startDate}
                        onChange={(e) =>
                          setEditingEvent({ ...editingEvent, startDate: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-startTime">Hora Início</Label>
                      <Input
                        id="edit-startTime"
                        type="time"
                        value={editingEvent.startTime}
                        onChange={(e) =>
                          setEditingEvent({ ...editingEvent, startTime: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-endDate">Data Fim *</Label>
                      <Input
                        id="edit-endDate"
                        type="date"
                        value={editingEvent.endDate}
                        onChange={(e) =>
                          setEditingEvent({ ...editingEvent, endDate: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-endTime">Hora Fim</Label>
                      <Input
                        id="edit-endTime"
                        type="time"
                        value={editingEvent.endTime}
                        onChange={(e) =>
                          setEditingEvent({ ...editingEvent, endTime: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-attendees">Participantes (emails separados por vírgula)</Label>
                    <Input
                      id="edit-attendees"
                      placeholder="email1@exemplo.com, email2@exemplo.com"
                      value={editingEvent.attendees}
                      onChange={(e) =>
                        setEditingEvent({ ...editingEvent, attendees: e.target.value })
                      }
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingEvent(null);
                        setActiveTab("events");
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleEditEvent}
                      disabled={isUpdatingEvent}
                      className="flex-1"
                    >
                      {isUpdatingEvent ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Pencil className="mr-2 h-4 w-4" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteEventId} onOpenChange={() => setDeleteEventId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O evento será removido permanentemente do Google Calendar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              disabled={isDeletingEvent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingEvent ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
