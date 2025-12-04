import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TaskCategory, getCategoryStatuses, getStatusLabel, getStatusColor, getPriorityColor, getPriorityLabel } from "@/lib/taskCategories";

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {statuses.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status.value);
        const isDragOver = dragOverStatus === status.value;
        
        return (
          <div 
            key={status.value} 
            className="space-y-3"
            onDragOver={(e) => handleDragOver(e, status.value)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status.value)}
          >
            <div className="flex items-center justify-between px-2">
              <h3 className="font-semibold text-sm">{status.label}</h3>
              <Badge variant="secondary" className="text-xs">
                {columnTasks.length}
              </Badge>
            </div>
            
            <div 
              className={`space-y-3 min-h-[100px] p-2 rounded-lg transition-colors ${
                isDragOver ? "bg-primary/10 border-2 border-dashed border-primary/50" : "bg-muted/30"
              }`}
            >
              {columnTasks.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-4">
                  {isDragOver ? "Solte aqui" : "Nenhuma atividade"}
                </div>
              ) : (
                columnTasks.map((task) => (
                  <Card 
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    className={`cursor-grab hover:shadow-md transition-all ${
                      draggingTask?.id === task.id ? "opacity-50 scale-95" : ""
                    }`}
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
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.due_date).toLocaleDateString("pt-BR")}
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
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}