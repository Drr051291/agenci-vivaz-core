import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  CheckCircle2, 
  Clock, 
  Circle, 
  ListTodo,
  RefreshCw,
  X,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, isYesterday } from "date-fns";
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
  pendente: { label: "Pendente", icon: Circle, className: "text-amber-600" },
  em_andamento: { label: "Em andamento", icon: Clock, className: "text-blue-600" },
  concluido: { label: "Concluída", icon: CheckCircle2, className: "text-emerald-600" },
  solicitado: { label: "Solicitado", icon: Circle, className: "text-gray-600" },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
  urgent: "bg-red-200 text-red-800",
};

const MAX_VISIBLE_ITEMS = 8;

export function RetrovisorSection({ 
  clientId, 
  meetingId, 
  isEditing = false,
  onTasksUpdated 
}: RetrovisorSectionProps) {
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [excludingIds, setExcludingIds] = useState<Set<string>>(new Set());
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [showAllPending, setShowAllPending] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("tasks")
        .select(`
          id,
          title,
          status,
          priority,
          due_date,
          category,
          assigned_to,
          meeting_excluded_from,
          assigned_profile:profiles!tasks_assigned_to_fkey(full_name)
        `)
        .eq("client_id", clientId)
        .in("status", ["pendente", "em_andamento", "concluido", "solicitado"])
        .order("due_date", { ascending: true, nullsFirst: false });

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter out tasks excluded from this meeting
      const filteredData = (data || []).filter(task => {
        const excludedFrom = task.meeting_excluded_from as string[] | null;
        return !excludedFrom || !meetingId || !excludedFrom.includes(meetingId);
      });

      // Separate by status
      const completed = filteredData.filter(t => t.status === "concluido");
      const pending = filteredData.filter(t => t.status !== "concluido");
      
      setCompletedTasks(completed);
      setPendingTasks(pending);
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
  }, [clientId, meetingId]);

  const handleExcludeTask = async (taskId: string) => {
    if (!meetingId) {
      toast.error("ID da reunião não disponível");
      return;
    }

    setExcludingIds(prev => new Set(prev).add(taskId));
    try {
      const { data: task, error: fetchError } = await supabase
        .from("tasks")
        .select("meeting_excluded_from")
        .eq("id", taskId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const currentExcluded = (task?.meeting_excluded_from as string[]) || [];
      const newExcluded = [...currentExcluded, meetingId];

      const { error } = await supabase
        .from("tasks")
        .update({ meeting_excluded_from: newExcluded })
        .eq("id", taskId);

      if (error) throw error;

      setCompletedTasks(prev => prev.filter(t => t.id !== taskId));
      setPendingTasks(prev => prev.filter(t => t.id !== taskId));

      toast.success("Removida da lista");
      onTasksUpdated?.();
    } catch (error) {
      console.error("Error excluding task:", error);
      toast.error("Erro ao remover tarefa");
    } finally {
      setExcludingIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    if (isYesterday(date)) return "Ontem";
    return format(date, "dd/MM", { locale: ptBR });
  };

  const totalCount = completedTasks.length + pendingTasks.length;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="text-center py-8 border rounded-lg bg-muted/30">
        <ListTodo className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Nenhuma atividade encontrada
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

  const renderTaskItem = (task: Task, showExcludeButton: boolean = true) => {
    const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.pendente;
    const StatusIcon = statusConfig.icon;
    const isExcluding = excludingIds.has(task.id);
    const isCompleted = task.status === "concluido";
    const dueDateFormatted = formatDueDate(task.due_date);
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isCompleted;

    return (
      <div
        key={task.id}
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-md border bg-background transition-all group",
          isCompleted && "bg-muted/30",
          isExcluding && "opacity-50 pointer-events-none"
        )}
      >
        <StatusIcon className={cn("h-4 w-4 flex-shrink-0", statusConfig.className)} />
        
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className={cn(
            "text-sm truncate",
            isCompleted && "line-through text-muted-foreground"
          )}>
            {task.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {task.assigned_profile?.full_name && (
            <span className="text-xs text-muted-foreground hidden sm:inline max-w-[80px] truncate">
              {task.assigned_profile.full_name.split(" ")[0]}
            </span>
          )}
          
          {dueDateFormatted && (
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded",
              isOverdue ? "bg-red-100 text-red-700" : "text-muted-foreground"
            )}>
              {dueDateFormatted}
            </span>
          )}
          
          <Badge 
            variant="outline" 
            className={cn("text-[10px] h-5 px-1.5", PRIORITY_COLORS[task.priority] || "")}
          >
            {task.priority === "urgent" ? "Urg" : task.priority === "high" ? "Alta" : task.priority === "medium" ? "Méd" : "Bx"}
          </Badge>

          {isEditing && showExcludeButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleExcludeTask(task.id)}
              disabled={isExcluding}
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              title="Remover da lista"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const visiblePending = showAllPending ? pendingTasks : pendingTasks.slice(0, MAX_VISIBLE_ITEMS);
  const visibleCompleted = showAllCompleted ? completedTasks : completedTasks.slice(0, MAX_VISIBLE_ITEMS);
  const hiddenPendingCount = pendingTasks.length - MAX_VISIBLE_ITEMS;
  const hiddenCompletedCount = completedTasks.length - MAX_VISIBLE_ITEMS;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ListTodo className="h-4 w-4" />
          <span>{totalCount} atividade{totalCount !== 1 ? 's' : ''}</span>
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

      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium">Pendentes ({pendingTasks.length})</span>
          </div>
          <div className="space-y-1.5">
            {visiblePending.map(task => renderTaskItem(task))}
            {hiddenPendingCount > 0 && !showAllPending && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllPending(true)}
                className="w-full text-xs h-8 text-muted-foreground"
              >
                Ver mais {hiddenPendingCount} pendentes
              </Button>
            )}
            {showAllPending && pendingTasks.length > MAX_VISIBLE_ITEMS && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllPending(false)}
                className="w-full text-xs h-8 text-muted-foreground"
              >
                Mostrar menos
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <Collapsible open={completedExpanded} onOpenChange={setCompletedExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between h-9 px-2 hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium">Concluídas ({completedTasks.length})</span>
              </div>
              {completedExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1.5 mt-2">
            {visibleCompleted.map(task => renderTaskItem(task))}
            {hiddenCompletedCount > 0 && !showAllCompleted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllCompleted(true)}
                className="w-full text-xs h-8 text-muted-foreground"
              >
                Ver mais {hiddenCompletedCount} concluídas
              </Button>
            )}
            {showAllCompleted && completedTasks.length > MAX_VISIBLE_ITEMS && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllCompleted(false)}
                className="w-full text-xs h-8 text-muted-foreground"
              >
                Mostrar menos
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
