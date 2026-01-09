import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, 
  Clock, 
  Circle, 
  ArchiveRestore,
  History,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  category: string;
  assigned_to: string | null;
  assigned_profile?: {
    full_name: string;
  } | null;
}

interface RetrovisorSectionProps {
  clientId: string;
  meetingId?: string;
  isEditing?: boolean;
  onTasksUpdated?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pending: { label: "Pendente", icon: Circle, className: "bg-amber-50 text-amber-700 border-amber-200" },
  in_progress: { label: "Em andamento", icon: Clock, className: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "Concluída", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  backlog: { label: "Backlog", icon: ArchiveRestore, className: "bg-muted text-muted-foreground border-muted" },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

export function RetrovisorSection({ 
  clientId, 
  meetingId, 
  isEditing = false,
  onTasksUpdated 
}: RetrovisorSectionProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          status,
          priority,
          due_date,
          category,
          assigned_to,
          assigned_profile:profiles!tasks_assigned_to_fkey(full_name)
        `)
        .eq("client_id", clientId)
        .gte("created_at", sevenDaysAgo)
        .in("status", ["pending", "in_progress"])
        .order("due_date", { ascending: true, nullsFirst: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Erro ao carregar tarefas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchTasks();
    }
  }, [clientId]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setUpdatingIds(prev => new Set(prev).add(taskId));
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", taskId);

      if (error) throw error;

      // Update local state
      setTasks(prev => 
        prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
          .filter(t => newStatus !== "completed" || t.id !== taskId)
      );

      toast.success(
        newStatus === "completed" 
          ? "Tarefa concluída!" 
          : newStatus === "backlog" 
            ? "Movida para backlog" 
            : "Status atualizado"
      );
      
      onTasksUpdated?.();
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Erro ao atualizar tarefa");
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const completedCount = tasks.filter(t => t.status === "completed").length;
  const totalCount = tasks.length;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg bg-muted/30">
        <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Nenhum compromisso pendente dos últimos 7 dias
        </p>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={fetchTasks}
          className="mt-2"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Atualizar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <History className="h-4 w-4" />
          <span>{tasks.length} compromissos pendentes</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={fetchTasks}
          className="h-7 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Atualizar
        </Button>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {tasks.map((task) => {
          const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
          const StatusIcon = statusConfig.icon;
          const isUpdating = updatingIds.has(task.id);

          return (
            <div
              key={task.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                task.status === "completed" && "bg-muted/50 opacity-70",
                isUpdating && "opacity-50 pointer-events-none"
              )}
            >
              {/* Checkbox for marking complete */}
              {isEditing && (
                <Checkbox
                  checked={task.status === "completed"}
                  onCheckedChange={(checked) => {
                    handleStatusChange(task.id, checked ? "completed" : "pending");
                  }}
                  disabled={isUpdating}
                  className="flex-shrink-0"
                />
              )}

              {/* Status icon (view mode) */}
              {!isEditing && (
                <StatusIcon className={cn(
                  "h-4 w-4 flex-shrink-0",
                  statusConfig.className.includes("text-") 
                    ? statusConfig.className.split(" ").find(c => c.startsWith("text-"))
                    : "text-muted-foreground"
                )} />
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium truncate",
                  task.status === "completed" && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {task.assigned_profile?.full_name && (
                    <span className="text-xs text-muted-foreground">
                      {task.assigned_profile.full_name}
                    </span>
                  )}
                  {task.due_date && (
                    <span className={cn(
                      "text-xs",
                      new Date(task.due_date) < new Date() 
                        ? "text-red-600" 
                        : "text-muted-foreground"
                    )}>
                      {format(new Date(task.due_date), "dd/MM", { locale: ptBR })}
                    </span>
                  )}
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs h-5", PRIORITY_COLORS[task.priority] || "")}
                  >
                    {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}
                  </Badge>
                </div>
              </div>

              {/* Quick Actions */}
              {isEditing && task.status !== "completed" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStatusChange(task.id, "backlog")}
                  disabled={isUpdating}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArchiveRestore className="h-3.5 w-3.5 mr-1" />
                  Backlog
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
