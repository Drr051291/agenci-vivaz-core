import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { CheckSquare, User, Calendar, Clock, Filter } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useClientUser } from "@/hooks/useClientUser";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LayoutGrid, List, Calendar as CalendarIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_CATEGORIES, TaskCategory, getStatusLabel, getStatusColor, getPriorityColor, getPriorityLabel } from "@/lib/taskCategories";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TaskKanbanView } from "@/components/tasks/TaskKanbanView";
import { TaskCalendarView } from "@/components/tasks/TaskCalendarView";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  category: string;
  assigned_to?: string;
  assigned_profile?: {
    full_name: string;
  };
}

const ClientTasks = () => {
  const [dataLoading, setDataLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "list" | "calendar">("list");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const taskIdFromUrl = searchParams.get("task");

  const { clientId, userId, loading: authLoading, error } = useClientUser();

  usePageMeta({
    title: "Atividades - Área do Cliente",
    description: "Acompanhe suas tarefas e atividades",
    keywords: "atividades, tarefas, área do cliente, vivaz",
  });

  useEffect(() => {
    if (!authLoading && clientId) {
      loadTasksData();
    }
  }, [authLoading, clientId]);

  // Handle deep link to specific task from email notification
  useEffect(() => {
    if (taskIdFromUrl && tasks.length > 0) {
      const taskToOpen = tasks.find(t => t.id === taskIdFromUrl);
      if (taskToOpen) {
        setSelectedTask(taskToOpen);
        // Clear the query param after opening
        setSearchParams({}, { replace: true });
      }
    }
  }, [taskIdFromUrl, tasks, setSearchParams]);

  const loadTasksData = async () => {
    if (!clientId) return;

    try {
      // Buscar tasks do cliente
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          *,
          assigned_profile:profiles!tasks_assigned_to_fkey (
            full_name
          )
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (tasksError) {
        console.error("Erro ao buscar tasks:", tasksError);
      } else {
        setTasks(tasksData || []);
      }
    } catch (err) {
      console.error("Erro ao carregar atividades:", err);
    } finally {
      setDataLoading(false);
    }
  };

  // Aplicar filtros
  const filteredTasks = tasks.filter(task => {
    const categoryMatch = categoryFilter === "all" || task.category === categoryFilter;
    const assignmentMatch = 
      assignmentFilter === "all" ||
      (assignmentFilter === "mine" && task.assigned_to === userId) ||
      (assignmentFilter === "others" && task.assigned_to !== userId);
    return categoryMatch && assignmentMatch;
  });

  // Separar tarefas por atribuição
  const myTasks = filteredTasks.filter(t => t.assigned_to === userId);
  const otherTasks = filteredTasks.filter(t => t.assigned_to !== userId);

  // Check if user can edit the selected task (only if they are the assignee)
  const canEditSelectedTask = selectedTask?.assigned_to === userId;

  // Estatísticas
  const stats = {
    total: tasks.length,
    myTasks: tasks.filter(t => t.assigned_to === userId).length,
    pending: tasks.filter(t => t.status === "pendente" || t.status === "em_andamento").length,
    completed: tasks.filter(t => t.status === "concluido").length,
  };

  if (authLoading || dataLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">{error}</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const renderTaskCard = (task: Task, isMyTask: boolean) => {
    const category = task.category as TaskCategory;
    
    return (
      <Card 
        key={task.id} 
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          isMyTask && "ring-2 ring-primary/30 bg-primary/5"
        )}
        onClick={() => setSelectedTask(task)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {isMyTask && (
                  <Badge variant="default" className="bg-primary text-primary-foreground text-xs">
                    Minha tarefa
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {TASK_CATEGORIES[category] || category}
                </Badge>
              </div>
              
              <h3 className="font-medium text-sm line-clamp-2 mb-2">{task.title}</h3>
              
              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {task.description}
                </p>
              )}
              
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn("text-xs", getStatusColor(task.status))} variant="outline">
                  {getStatusLabel(category, task.status)}
                </Badge>
                <Badge className={cn("text-xs", getPriorityColor(task.priority))} variant="outline">
                  {getPriorityLabel(task.priority)}
                </Badge>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground">
              {task.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(task.due_date).toLocaleDateString("pt-BR")}</span>
                </div>
              )}
              {task.assigned_profile && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className="truncate max-w-[100px]">{task.assigned_profile.full_name}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Atividades</h1>
          <p className="text-muted-foreground">
            Acompanhe as tarefas do seu projeto. Você pode alterar o status apenas das tarefas atribuídas a você.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <CheckSquare className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="ring-2 ring-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{stats.myTasks}</p>
                  <p className="text-xs text-muted-foreground">Minhas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckSquare className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                  <p className="text-xs text-muted-foreground">Concluídas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filtros:</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Atribuição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as tarefas</SelectItem>
                <SelectItem value="mine">Minhas tarefas</SelectItem>
                <SelectItem value="others">Da agência</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {Object.entries(TASK_CATEGORIES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as any)}>
              <ToggleGroupItem value="list" aria-label="Visualização em lista">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="kanban" aria-label="Visualização Kanban">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="calendar" aria-label="Visualização em calendário">
                <CalendarIcon className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Tasks Content */}
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhuma atividade disponível ainda.
              </p>
            </CardContent>
          </Card>
        ) : viewMode === "list" ? (
          <div className="space-y-6">
            {/* My Tasks Section */}
            {myTasks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-primary">Minhas Tarefas</h2>
                  <Badge variant="default" className="bg-primary">{myTasks.length}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {myTasks.map(task => renderTaskCard(task, true))}
                </div>
              </div>
            )}

            {/* Other Tasks Section */}
            {otherTasks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Tarefas da Agência</h2>
                  <Badge variant="secondary">{otherTasks.length}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {otherTasks.map(task => renderTaskCard(task, false))}
                </div>
              </div>
            )}

            {filteredTasks.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Filter className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Nenhuma atividade encontrada com os filtros selecionados.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : viewMode === "kanban" ? (
          <TaskKanbanView
            tasks={filteredTasks}
            category={(categoryFilter === "all" ? "outros" : categoryFilter) as TaskCategory}
            onTaskClick={(task) => setSelectedTask(task)}
          />
        ) : (
          <TaskCalendarView
            tasks={filteredTasks}
            onTaskClick={(task) => setSelectedTask(task)}
          />
        )}

        <TaskDetailDialog
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          task={selectedTask}
          canEdit={canEditSelectedTask}
          onUpdate={loadTasksData}
        />
      </div>
    </DashboardLayout>
  );
};

export default ClientTasks;
