import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  Send, 
  Calendar as CalendarIcon, 
  User, 
  Flag,
  Loader2,
  X
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface SendToTasksButtonProps {
  clientId: string;
  meetingId?: string;
  text: string;
  profiles: Profile[];
  onTaskCreated?: () => void;
  variant?: "inline" | "popover";
}

const PRIORITY_OPTIONS = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
];

export function SendToTasksButton({
  clientId,
  meetingId,
  text,
  profiles,
  onTaskCreated,
  variant = "inline",
}: SendToTasksButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [taskData, setTaskData] = useState({
    title: text,
    assignee_id: "",
    due_date: "",
    priority: "medium" as "low" | "medium" | "high",
  });

  const handleCreate = async () => {
    if (!taskData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("tasks")
        .insert({
          client_id: clientId,
          title: taskData.title,
          assigned_to: taskData.assignee_id || null,
          due_date: taskData.due_date || null,
          priority: taskData.priority,
          status: "pending",
          category: "general",
          created_by: userData?.user?.id,
          source: meetingId ? "meeting" : null,
          source_id: meetingId || null,
        });

      if (error) throw error;

      toast.success("Tarefa criada!");
      setIsOpen(false);
      onTaskCreated?.();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Erro ao criar tarefa");
    } finally {
      setIsSaving(false);
    }
  };

  if (variant === "inline") {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-primary"
        onClick={async () => {
          setIsSaving(true);
          try {
            const { data: userData } = await supabase.auth.getUser();
            
            const { error } = await supabase
              .from("tasks")
              .insert({
                client_id: clientId,
                title: text,
                priority: "medium",
                status: "pending",
                category: "general",
                created_by: userData?.user?.id,
                source: meetingId ? "meeting" : null,
                source_id: meetingId || null,
              });

            if (error) throw error;

            toast.success("Enviado para Atividades!");
            onTaskCreated?.();
          } catch (error) {
            console.error("Error creating task:", error);
            toast.error("Erro ao criar tarefa");
          } finally {
            setIsSaving(false);
          }
        }}
        disabled={isSaving || !text.trim()}
        title="Enviar para Atividades"
      >
        {isSaving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Send className="h-3.5 w-3.5" />
        )}
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          disabled={!text.trim()}
        >
          <Send className="h-3.5 w-3.5 mr-1" />
          Enviar para Tarefas
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Criar Tarefa</h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Input
            value={taskData.title}
            onChange={(e) => setTaskData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Título..."
            className="text-sm"
          />

          <div className="grid grid-cols-2 gap-2">
            <Select
              value={taskData.assignee_id}
              onValueChange={(value) => setTaskData(prev => ({ ...prev, assignee_id: value }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <User className="h-3 w-3 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={taskData.priority}
              onValueChange={(value) => setTaskData(prev => ({ ...prev, priority: value as typeof taskData.priority }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <Flag className="h-3 w-3 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-8 justify-start text-xs font-normal"
              >
                <CalendarIcon className="h-3 w-3 mr-1.5" />
                {taskData.due_date 
                  ? format(new Date(taskData.due_date), "dd/MM/yyyy", { locale: ptBR })
                  : "Prazo"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={taskData.due_date ? new Date(taskData.due_date) : undefined}
                onSelect={(date) => {
                  if (date) {
                    setTaskData(prev => ({ ...prev, due_date: format(date, "yyyy-MM-dd") }));
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            className="w-full h-8"
            onClick={handleCreate}
            disabled={isSaving || !taskData.title.trim()}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Criar Tarefa
              </>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
