import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, GripVertical, Clock, CheckCircle, Eye, Play, Pause, XCircle, FileText, Rocket, Settings, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TaskCategory, getCategoryStatuses, getStatusLabel, getStatusColor, getPriorityColor, getPriorityLabel } from "@/lib/taskCategories";
import { isAfter, startOfDay, parseISO } from "date-fns";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  category: string;
  assigned_profile?: {
    full_name: string;
  };
}

interface TaskKanbanViewProps {
  tasks: Task[];
  category: TaskCategory;
  onTaskClick?: (task: Task) => void;
  onUpdate?: () => void;
}

export function TaskKanbanView({ tasks, category, onTaskClick, onUpdate }: TaskKanbanViewProps) {
  const statuses = getCategoryStatuses(category);
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggingTask(task);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
  };

  const handleDragEnd = () => {
    setDraggingTask(null);
    setDragOverStatus(null);
  };

  const handleDragOver = (e: React.DragEvent, statusValue: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(statusValue);
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverStatus(null);

    if (!draggingTask || draggingTask.status === newStatus) {
      setDraggingTask(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus as any })
        .eq("id", draggingTask.id);

      if (error) throw error;

      toast.success("Status atualizado!");
      onUpdate?.();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    } finally {
      setDraggingTask(null);
    }
  };

  const getColumnColor = (statusValue: string) => {
    if (statusValue === "pendente") return "bg-purple-500/10 border-purple-500/30";
    if (statusValue.includes("aprovado") || statusValue.includes("concluido") || statusValue.includes("entregue") || statusValue.includes("publicado") || statusValue.includes("enviado") || statusValue.includes("publicada")) {
      return "bg-green-500/10 border-green-500/30";
    }
    if (statusValue.includes("revisao") || statusValue.includes("aguardando") || statusValue.includes("analise")) {
      return "bg-yellow-500/10 border-yellow-500/30";
    }
    if (statusValue.includes("ativa") || statusValue.includes("execucao") || statusValue.includes("criacao") || statusValue.includes("desenvolvimento") || statusValue.includes("producao") || statusValue.includes("em_andamento")) {
      return "bg-blue-500/10 border-blue-500/30";
    }
    if (statusValue.includes("pausada") || statusValue.includes("encerrada") || statusValue.includes("finalizada")) {
      return "bg-gray-500/10 border-gray-500/30";
    }
    return "bg-orange-500/10 border-orange-500/30";
  };

  const getHeaderColor = (statusValue: string) => {
    if (statusValue === "pendente") return "bg-purple-500 text-white";
    if (statusValue.includes("aprovado") || statusValue.includes("concluido") || statusValue.includes("entregue") || statusValue.includes("publicado") || statusValue.includes("enviado") || statusValue.includes("publicada")) {
      return "bg-green-500 text-white";
    }
    if (statusValue.includes("revisao") || statusValue.includes("aguardando") || statusValue.includes("analise")) {
      return "bg-yellow-500 text-white";
    }
    if (statusValue.includes("ativa") || statusValue.includes("execucao") || statusValue.includes("criacao") || statusValue.includes("desenvolvimento") || statusValue.includes("producao") || statusValue.includes("em_andamento")) {
      return "bg-blue-500 text-white";
    }
    if (statusValue.includes("pausada") || statusValue.includes("encerrada") || statusValue.includes("finalizada")) {
      return "bg-gray-500 text-white";
    }
    return "bg-orange-500 text-white";
  };

  const getStatusIcon = (statusValue: string) => {
    if (statusValue === "pendente") return Clock;
    if (statusValue.includes("aprovado") || statusValue.includes("concluido") || statusValue.includes("entregue") || statusValue.includes("publicado") || statusValue.includes("enviado") || statusValue.includes("publicada")) {
      return CheckCircle;
    }
    if (statusValue.includes("revisao") || statusValue.includes("aguardando") || statusValue.includes("analise")) {
      return Eye;
    }
    if (statusValue.includes("ativa") || statusValue.includes("em_andamento")) {
      return Play;
    }
    if (statusValue.includes("execucao") || statusValue.includes("desenvolvimento") || statusValue.includes("producao")) {
      return Rocket;
    }
    if (statusValue.includes("criacao") || statusValue.includes("briefing")) {
      return FileText;
    }
    if (statusValue.includes("pausada")) {
      return Pause;
    }
    if (statusValue.includes("encerrada") || statusValue.includes("finalizada")) {
      return XCircle;
    }
    if (statusValue.includes("configuracao") || statusValue.includes("planejamento") || statusValue.includes("agendado")) {
      return Settings;
    }
    return Clock;
  };

  const isTaskOverdue = (task: Task) => {
    if (!task.due_date) return false;
    // Skip completed/finalized statuses
    if (task.status.includes("concluido") || task.status.includes("aprovado") || 
        task.status.includes("entregue") || task.status.includes("publicado") || 
        task.status.includes("enviado") || task.status.includes("publicada") ||
        task.status.includes("finalizada") || task.status.includes("encerrada")) {
      return false;
    }
    const today = startOfDay(new Date());
    const dueDate = startOfDay(parseISO(task.due_date));
    return isAfter(today, dueDate);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {statuses.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status.value);
        const overdueTasks = columnTasks.filter(isTaskOverdue);
        const isDragOver = dragOverStatus === status.value;
        const StatusIcon = getStatusIcon(status.value);
        
        return (
          <div 
            key={status.value} 
            className={`rounded-lg border ${getColumnColor(status.value)} overflow-hidden`}
            onDragOver={(e) => handleDragOver(e, status.value)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status.value)}
          >
            <div className={`flex items-center justify-between px-3 py-2 ${getHeaderColor(status.value)}`}>
              <div className="flex items-center gap-2">
                <StatusIcon className="h-4 w-4" />
                <h3 className="font-semibold text-sm">{status.label}</h3>
              </div>
              <div className="flex items-center gap-1.5">
                {overdueTasks.length > 0 && (
                  <Badge variant="destructive" className="text-xs bg-red-600 text-white border-0 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {overdueTasks.length}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
                  {columnTasks.length}
                </Badge>
              </div>
            </div>
            
            <div 
              className={`space-y-3 min-h-[100px] p-3 transition-colors ${
                isDragOver ? "bg-primary/20 border-2 border-dashed border-primary/50" : ""
              }`}
            >
              {columnTasks.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-4">
                  {isDragOver ? "Solte aqui" : "Nenhuma atividade"}
                </div>
              ) : (
                columnTasks.map((task) => {
                  const overdue = isTaskOverdue(task);
                  return (
                    <Card 
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      className={`cursor-grab hover:shadow-md transition-all ${
                        draggingTask?.id === task.id ? "opacity-50 scale-95" : ""
                      } ${overdue ? "border-red-500 border-2 bg-red-50 dark:bg-red-950/20" : ""}`}
                      onClick={() => onTaskClick?.(task)}
                    >
                      <CardHeader className="p-3 pb-2">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <CardTitle className="text-sm font-medium line-clamp-2">
                              {task.title}
                            </CardTitle>
                          </div>
                          <Badge className={getPriorityColor(task.priority)} variant="outline">
                            {getPriorityLabel(task.priority)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-2">
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex flex-col gap-1 text-xs">
                          {task.due_date && (
                            <span className={`flex items-center gap-1 ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                              {overdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                              {new Date(task.due_date).toLocaleDateString("pt-BR")}
                              {overdue && " (Atrasada)"}
                            </span>
                          )}
                          {task.assigned_profile && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <User className="h-3 w-3" />
                              {task.assigned_profile.full_name}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}