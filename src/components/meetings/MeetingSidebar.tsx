import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckSquare, 
  MessageSquare, 
  Paperclip, 
  Plus, 
  Calendar as CalendarIcon,
  User,
  Flag,
  ChevronRight,
  ChevronLeft,
  X
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { parseLocalDate } from "@/lib/dateUtils";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string;
  owner_type?: string;
  assigned_to?: string;
}

interface Profile {
  id: string;
  full_name: string;
}

interface MeetingSidebarProps {
  tasks: Task[];
  selectedTasks: string[];
  onTaskToggle: (taskId: string) => void;
  onCreateTask: (task: Partial<Task>) => void;
  isEditing: boolean;
  profiles: Profile[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-amber-50 text-amber-700" },
  in_progress: { label: "Em andamento", className: "bg-blue-50 text-blue-700" },
  completed: { label: "Concluída", className: "bg-emerald-50 text-emerald-700" },
  review: { label: "Revisão", className: "bg-violet-50 text-violet-700" },
  cancelled: { label: "Cancelada", className: "bg-gray-50 text-gray-500" },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: "Baixa", className: "text-gray-500" },
  medium: { label: "Média", className: "text-amber-500" },
  high: { label: "Alta", className: "text-orange-500" },
  urgent: { label: "Urgente", className: "text-red-500" },
};

export function MeetingSidebar({
  tasks,
  selectedTasks,
  onTaskToggle,
  onCreateTask,
  isEditing,
  profiles,
  isCollapsed,
  onToggleCollapse,
}: MeetingSidebarProps) {
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: "",
    priority: "medium",
    owner_type: "vivaz",
    status: "pending",
  });

  const handleCreateTask = () => {
    if (!newTask.title?.trim()) return;
    onCreateTask(newTask);
    setNewTask({
      title: "",
      priority: "medium",
      owner_type: "vivaz",
      status: "pending",
    });
    setShowNewTask(false);
  };

  if (isCollapsed) {
    return (
      <div className="w-12 border-l bg-card flex flex-col items-center py-4 gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Separator />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleCollapse}>
          <CheckSquare className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleCollapse}>
          <MessageSquare className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleCollapse}>
          <Paperclip className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-card flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Sidebar</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleCollapse}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tasks" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start px-4 pt-2 bg-transparent">
          <TabsTrigger value="tasks" className="gap-1.5">
            <CheckSquare className="h-4 w-4" />
            Atividades
            {selectedTasks.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {selectedTasks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="comments" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Comentários
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-1.5">
            <Paperclip className="h-4 w-4" />
            Arquivos
          </TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="flex-1 flex flex-col mt-0 px-4 pb-4">
          {/* Quick Add */}
          {isEditing && (
            <div className="py-3">
              {showNewTask ? (
                <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                  <Input
                    placeholder="Título da atividade"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={newTask.owner_type}
                      onValueChange={(value) => setNewTask({ ...newTask, owner_type: value })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vivaz">Vivaz</SelectItem>
                        <SelectItem value="cliente">Cliente</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Prioridade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={handleCreateTask}>
                      Criar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setShowNewTask(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setShowNewTask(true)}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Nova atividade
                </Button>
              )}
            </div>
          )}

          {/* Filter Buttons */}
          {tasks.length > 0 && isEditing && (
            <div className="flex gap-2 mb-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 flex-1"
                onClick={() => {
                  const pending = tasks.filter(t => t.status === "pending" || t.status === "in_progress");
                  pending.forEach(t => {
                    if (!selectedTasks.includes(t.id)) {
                      onTaskToggle(t.id);
                    }
                  });
                }}
              >
                Vincular pendentes
              </Button>
            </div>
          )}

          {/* Tasks List */}
          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-2">
              {tasks.length > 0 ? (
                tasks.map((task) => {
                  const isSelected = selectedTasks.includes(task.id);
                  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                  const priorityConfig = PRIORITY_CONFIG[task.priority || "medium"];

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
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            !isSelected && !isEditing && "text-muted-foreground"
                          )}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={cn("text-xs px-1.5 py-0.5 rounded", statusConfig.className)}>
                              {statusConfig.label}
                            </span>
                            <span className={cn("text-xs flex items-center gap-1", priorityConfig.className)}>
                              <Flag className="h-3 w-3" />
                              {priorityConfig.label}
                            </span>
                            {task.due_date && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
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
                  <p className="text-xs mt-1">Crie atividades para acompanhar ações</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments" className="flex-1 flex flex-col items-center justify-center text-muted-foreground px-4">
          <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm">Comentários em breve</p>
          <p className="text-xs mt-1">Adicione anotações e discussões</p>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="flex-1 flex flex-col items-center justify-center text-muted-foreground px-4">
          <Paperclip className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm">Arquivos em breve</p>
          <p className="text-xs mt-1">Anexe documentos e imagens</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
