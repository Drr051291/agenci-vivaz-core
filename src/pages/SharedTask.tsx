import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";
import { MeetingViewer } from "@/components/meeting-editor/MeetingViewer";
import { TaskComments } from "@/components/tasks/TaskComments";
import { Calendar, User, Flag, Clock } from "lucide-react";
import {
  TASK_CATEGORIES,
  TaskCategory,
  getStatusLabel,
  getStatusColor,
  getPriorityColor,
  getPriorityLabel,
} from "@/lib/taskCategories";

interface TaskData {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  category: string;
  created_at: string;
  assigned_to?: string;
  share_token?: string;
  slug?: string;
}

export default function SharedTask() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskData | null>(null);
  const [assigneeName, setAssigneeName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  usePageMeta({
    title: task ? task.title : "Atividade Compartilhada",
    description: `Atividade compartilhada - ${task?.title || "HUB Vivaz"}`,
    keywords: "atividade, briefing, compartilhada, vivaz",
  });

  useEffect(() => {
    if (token) fetchTask();
  }, [token]);

  const fetchTask = async () => {
    try {
      // Try slug first, then share_token
      let taskData: TaskData | null = null;

      const { data: slugData } = await supabase
        .from("tasks")
        .select("*")
        .eq("slug", token)
        .single();

      if (slugData) {
        taskData = slugData as TaskData;
      } else {
        const { data: tokenData, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("share_token", token)
          .single();

        if (error) throw error;
        taskData = tokenData as TaskData;

        // Redirect to slug URL if available
        if (taskData?.slug && taskData.slug !== token) {
          navigate(`/atividades/${taskData.slug}`, { replace: true });
          return;
        }
      }

      if (!taskData) throw new Error("Task not found");
      setTask(taskData);

      // Fetch assignee name
      if (taskData.assigned_to) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", taskData.assigned_to)
          .single();
        setAssigneeName(profile?.full_name || null);
      }
    } catch (error) {
      console.error("Erro ao buscar atividade:", error);
      toast.error("Atividade não encontrada ou link inválido");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Atividade não encontrada</h2>
            <p className="text-muted-foreground">
              O link pode estar incorreto ou a atividade pode ter sido removida.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const category = task.category as TaskCategory;

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <img src="/logo-vivaz.png" alt="Vivaz" className="h-8" />
            <span className="text-sm text-muted-foreground">HUB Vivaz</span>
          </div>
          <h1 className="text-3xl font-bold mb-3">{task.title}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{TASK_CATEGORIES[category] || category}</Badge>
            <Badge className={getStatusColor(task.status)} variant="outline">
              {getStatusLabel(category, task.status)}
            </Badge>
            <Badge className={getPriorityColor(task.priority)} variant="outline">
              {getPriorityLabel(task.priority)}
            </Badge>
          </div>
        </div>

        {/* Meta info */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {assigneeName && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Responsável</p>
                    <p className="text-sm font-medium">{assigneeName}</p>
                  </div>
                </div>
              )}
              {task.due_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Prazo</p>
                    <p className="text-sm font-medium">
                      {new Date(task.due_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Criada em</p>
                  <p className="text-sm font-medium">
                    {new Date(task.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Briefing */}
        {task.description && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">📋 Briefing</h2>
              <div className="prose prose-sm max-w-none">
                <MeetingViewer content={task.description} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comments (read-only for public) */}
        <TaskComments taskId={task.id} canComment={false} />
      </div>
    </div>
  );
}
