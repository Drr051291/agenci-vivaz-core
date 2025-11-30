import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckSquare, User, Calendar } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  assigned_profile?: {
    full_name: string;
  };
}

const ClientTasks = () => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const navigate = useNavigate();
  const { toast } = useToast();

  usePageMeta({
    title: "Atividades - Área do Cliente",
    description: "Acompanhe suas tarefas e atividades",
    keywords: "atividades, tarefas, área do cliente, vivaz",
  });

  useEffect(() => {
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

    checkAuthAndLoadTasks();
  }, [navigate, toast]);

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-gray-500/10 text-gray-500 border-gray-500/20",
      in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      review: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      completed: "bg-green-500/10 text-green-500 border-green-500/20",
      cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      urgent: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: "Pendente",
      in_progress: "Em Progresso",
      review: "Em Revisão",
      completed: "Concluída",
      cancelled: "Cancelada",
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      low: "Baixa",
      medium: "Média",
      high: "Alta",
      urgent: "Urgente",
    };
    return labels[priority as keyof typeof labels] || priority;
  };

  const filteredTasks = tasks.filter(task => 
    statusFilter === "all" || task.status === statusFilter
  );

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Atividades</h1>
          <p className="text-muted-foreground">
            Acompanhe suas tarefas e atividades
          </p>
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
            <div className="flex justify-between items-center">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="review">Em Revisão</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredTasks.map((task) => (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <div className="flex gap-2">
                        <Badge className={getPriorityColor(task.priority)}>
                          {getPriorityLabel(task.priority)}
                        </Badge>
                        <Badge className={getStatusColor(task.status)}>
                          {getStatusLabel(task.status)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {task.description && (
                      <p className="text-sm text-muted-foreground">
                        {task.description}
                      </p>
                    )}
                    <div className="flex gap-4 text-sm">
                      {task.due_date && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Vencimento: {new Date(task.due_date).toLocaleDateString("pt-BR")}
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
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClientTasks;
