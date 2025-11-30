import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckSquare } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { TaskKanbanView } from "@/components/tasks/TaskKanbanView";
import { TaskListView } from "@/components/tasks/TaskListView";
import { TaskCalendarView } from "@/components/tasks/TaskCalendarView";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LayoutGrid, List, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_CATEGORIES, TaskCategory } from "@/lib/taskCategories";
import { Card, CardContent } from "@/components/ui/card";

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

const ClientTasks = () => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "list" | "calendar">("list");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const navigate = useNavigate();
  const { toast } = useToast();

  usePageMeta({
    title: "Atividades - Área do Cliente",
    description: "Acompanhe suas tarefas e atividades",
    keywords: "atividades, tarefas, área do cliente, vivaz",
  });

  useEffect(() => {
    checkAuthAndLoadTasks();
  }, [navigate, toast]);

  const checkAuthAndLoadTasks = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      navigate("/auth");
      return;
    }

    // Verificar se é cliente
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .single();

    if (userRole?.role !== "client") {
      navigate("/dashboard");
      return;
    }

    // Buscar cliente vinculado
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", session.user.id)
      .single();

    if (!client) {
      toast({
        title: "Erro",
        description: "Cliente não encontrado",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Buscar tasks do cliente
    const { data: tasksData, error } = await supabase
      .from("tasks")
      .select(`
        *,
        assigned_profile:profiles!tasks_assigned_to_fkey (
          full_name
        )
      `)
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar tasks:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as atividades",
        variant: "destructive",
      });
    } else {
      setTasks(tasksData || []);
    }

    setLoading(false);
  };

  const filteredTasks = categoryFilter === "all" 
    ? tasks 
    : tasks.filter(task => task.category === categoryFilter);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Atividades</h1>
            <p className="text-muted-foreground">
              Acompanhe suas tarefas e atividades
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar categoria" />
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
                <Calendar className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {tasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhuma atividade disponível ainda.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {viewMode === "list" && (
              <TaskListView
                tasks={filteredTasks}
                onTaskClick={(task) => setSelectedTask(task)}
              />
            )}
            {viewMode === "kanban" && (
              <TaskKanbanView
                tasks={filteredTasks}
                category={(categoryFilter === "all" ? "outros" : categoryFilter) as TaskCategory}
                onTaskClick={(task) => setSelectedTask(task)}
              />
            )}
            {viewMode === "calendar" && (
              <TaskCalendarView
                tasks={filteredTasks}
                onTaskClick={(task) => setSelectedTask(task)}
              />
            )}
          </>
        )}

        <TaskDetailDialog
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          task={selectedTask}
          canEdit={true}
          onUpdate={checkAuthAndLoadTasks}
        />
      </div>
    </DashboardLayout>
  );
};

export default ClientTasks;