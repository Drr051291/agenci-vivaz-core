import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar, Download, Loader2, ExternalLink } from "lucide-react";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ImportEventsDialogProps {
  clientId: string;
  onImportEvent: (event: {
    title: string;
    date: Date;
    description?: string;
  }) => Promise<void>;
}

export const ImportEventsDialog = ({ clientId, onImportEvent }: ImportEventsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const { events, isLoadingEvents, refetchEvents } = useGoogleCalendar();

  const handleImport = async (event: any) => {
    setImporting(event.id);
    try {
      const startDate = event.start.dateTime
        ? new Date(event.start.dateTime)
        : new Date(event.start.date);

      await onImportEvent({
        title: event.summary || "Evento sem título",
        date: startDate,
        description: event.description,
      });

      setOpen(false);
    } catch (error) {
      console.error("Error importing event:", error);
    } finally {
      setImporting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Importar do Google
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Eventos do Google Calendar</DialogTitle>
          <DialogDescription>
            Selecione um evento para criar uma nova reunião com base nele
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {isLoadingEvents ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : events && events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event) => {
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
                      <p className="text-sm text-muted-foreground">
                        {format(startDate, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                      {event.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      {event.attendees && event.attendees.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {event.attendees.length} participante(s)
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(event.htmlLink, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
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
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum evento encontrado</p>
              <Button
                variant="link"
                onClick={() => refetchEvents()}
                className="mt-2"
              >
                Atualizar
              </Button>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
