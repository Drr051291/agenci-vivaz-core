import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  CheckSquare, 
  Plus,
  Calendar as CalendarIcon,
  User,
  Flag,
  Trash2,
  Save,
  Loader2,
  Check,
  Clock,
  Circle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  status: string;
  priority?: string;
  due_date?: string;
  assigned_to?: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
}

interface NewTask {
  title: string;
  assignee_id: string;
  due_date: string;
  priority: "low" | "medium" | "high";
}

interface EnhancedSidebarProps {
  clientId: string;
  meetingId?: string;
  tasks: Task[];
  profiles: Profile[];
  selectedTasks: string[];
  onTaskToggle: (taskId: string) => void;
  onTasksUpdated: () => void;
  isEditing: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pending: { label: "Pendente", icon: Circle, className: "bg-amber-50 text-amber-700" },
  in_progress: { label: "Em andamento", icon: Clock, className: "bg-blue-50 text-blue-700" },
  completed: { label: "Concluída", icon: Check, className: "bg-emerald-50 text-emerald-700" },
};

const PRIORITY_OPTIONS = [
  { value: "low", label: "Baixa", color: "text-gray-600" },
  { value: "medium", label: "Média", color: "text-yellow-600" },
  { value: "high", label: "Alta", color: "text-red-600" },
];

const DEFAULT_NEW_TASK: NewTask = {
  title: "",
  assignee_id: "",
  due_date: "",
  priority: "medium",
};

export function EnhancedSidebar({
  clientId,
  meetingId,
  tasks,
  profiles,
  selectedTasks,
  onTaskToggle,
  onTasksUpdated,
  isEditing,
}: EnhancedSidebarProps) {
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTask, setNewTask] = useState<NewTask>(DEFAULT_NEW_TASK);
  const [isSaving, setIsSaving] = useState(false);

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast.error("Digite o título da tarefa");
      return;
    }

    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("tasks")
        .insert({
          client_id: clientId,
          title: newTask.title,
          assigned_to: newTask.assignee_id || null,
          due_date: newTask.due_date || null,
          priority: newTask.priority,
          status: "pending",
          category: "general",
          created_by: userData?.user?.id,
          source: meetingId ? "meeting" : null,
          source_id: meetingId || null,
        });

      if (error) throw error;

      toast.success("Tarefa criada com sucesso!");
      setNewTask(DEFAULT_NEW_TASK);
      setShowNewTaskForm(false);
      onTasksUpdated();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Erro ao criar tarefa");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="p-4 h-fit lg:sticky lg:top-24">
      {/* Header */}
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

      {/* Add Task Button */}
      {isEditing && !showNewTaskForm && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mb-4 border-dashed"
          onClick={() => setShowNewTaskForm(true)}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Nova Tarefa
        </Button>
      )}

      {/* New Task Form */}
      {showNewTaskForm && (
        <div className="mb-4 p-3 rounded-lg border bg-muted/30 space-y-3">
          <Input
            value={newTask.title}
            onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Título da tarefa..."
            className="text-sm"
            autoFocus
          />

          <div className="grid grid-cols-2 gap-2">
            {/* Assignee */}
            <Select
              value={newTask.assignee_id}
              onValueChange={(value) => setNewTask(prev => ({ ...prev, assignee_id: value }))}
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

            {/* Priority */}
            <Select
              value={newTask.priority}
              onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value as NewTask["priority"] }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <Flag className="h-3 w-3 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className={opt.color}>{opt.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-8 justify-start text-xs font-normal"
              >
                <CalendarIcon className="h-3 w-3 mr-1.5 text-muted-foreground" />
                {newTask.due_date 
                  ? format(new Date(newTask.due_date), "dd 'de' MMMM", { locale: ptBR })
                  : "Prazo (opcional)"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={newTask.due_date ? new Date(newTask.due_date) : undefined}
                onSelect={(date) => {
                  if (date) {
                    setNewTask(prev => ({ ...prev, due_date: format(date, "yyyy-MM-dd") }));
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 h-8"
              onClick={handleCreateTask}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  Salvar
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                setShowNewTaskForm(false);
                setNewTask(DEFAULT_NEW_TASK);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Task List */}
      <ScrollArea className="max-h-[350px]">
        <div className="space-y-2">
          {tasks.length > 0 ? (
            tasks.map((task) => {
              const isSelected = selectedTasks.includes(task.id);
              const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={task.id}
                  onClick={() => isEditing && onTaskToggle(task.id)}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    isEditing && "cursor-pointer hover:border-primary/50",
                    isSelected ? "bg-primary/5 border-primary/30" : "bg-background"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {isEditing && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onTaskToggle(task.id)}
                        className="mt-0.5"
                      />
                    )}
                    {!isEditing && isSelected && (
                      <StatusIcon className={cn("h-4 w-4 mt-0.5", statusConfig.className.split(" ")[1])} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        !isSelected && !isEditing && "text-muted-foreground"
                      )}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("text-xs px-1.5 py-0.5 rounded", statusConfig.className)}>
                          {statusConfig.label}
                        </span>
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(task.due_date), "dd/MM", { locale: ptBR })}
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
      </ScrollArea>
    </Card>
  );
}
