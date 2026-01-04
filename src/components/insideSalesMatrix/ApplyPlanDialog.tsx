import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ActionItemV2 } from "./ActionPlanV2";
import { CalendarCheck, ListTodo, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ApplyPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: ActionItemV2[];
  clientId?: string;
  onConfirm: (options: { linkToMeeting: boolean; meetingId?: string; createTasks: boolean }) => void;
}

interface Meeting {
  id: string;
  title: string;
  meeting_date: string;
}

export function ApplyPlanDialog({
  open,
  onOpenChange,
  actions,
  clientId,
  onConfirm,
}: ApplyPlanDialogProps) {
  const [linkToMeeting, setLinkToMeeting] = useState(false);
  const [createTasks, setCreateTasks] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && clientId && linkToMeeting) {
      loadMeetings();
    }
  }, [open, clientId, linkToMeeting]);

  async function loadMeetings() {
    if (!clientId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meeting_minutes')
        .select('id, title, meeting_date')
        .eq('client_id', clientId)
        .order('meeting_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error loading meetings:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    onConfirm({
      linkToMeeting,
      meetingId: linkToMeeting ? selectedMeetingId : undefined,
      createTasks,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aplicar plano de ação</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            {actions.length} ação{actions.length > 1 ? 'ões' : ''} será{actions.length > 1 ? 'ão' : ''} adicionada{actions.length > 1 ? 's' : ''} ao plano.
          </p>

          {/* Link to meeting option */}
          {clientId && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="link-meeting"
                  checked={linkToMeeting}
                  onCheckedChange={(checked) => setLinkToMeeting(checked === true)}
                />
                <Label htmlFor="link-meeting" className="text-sm flex items-center gap-2 cursor-pointer">
                  <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                  Vincular a uma reunião
                </Label>
              </div>

              {linkToMeeting && (
                <div className="ml-6">
                  {loading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Carregando reuniões...
                    </div>
                  ) : meetings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma reunião encontrada para este cliente.
                    </p>
                  ) : (
                    <Select value={selectedMeetingId} onValueChange={setSelectedMeetingId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione uma reunião" />
                      </SelectTrigger>
                      <SelectContent>
                        {meetings.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            <div className="flex flex-col">
                              <span className="truncate">{m.title}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(m.meeting_date), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Create tasks option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="create-tasks"
              checked={createTasks}
              onCheckedChange={(checked) => setCreateTasks(checked === true)}
            />
            <Label htmlFor="create-tasks" className="text-sm flex items-center gap-2 cursor-pointer">
              <ListTodo className="h-4 w-4 text-muted-foreground" />
              Criar tarefas a partir das ações
            </Label>
          </div>
          {createTasks && (
            <p className="text-xs text-muted-foreground ml-6">
              Cada ação se tornará uma tarefa visível em Atividades.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Aplicar plano
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}