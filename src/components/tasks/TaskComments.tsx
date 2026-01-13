import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createNotification } from "@/lib/notifications";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_profile: {
    full_name: string;
  };
}

interface TaskCommentsProps {
  taskId: string;
  canComment?: boolean;
}

export function TaskComments({ taskId, canComment = true }: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
    getCurrentUser();
  }, [taskId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("task_comments")
        .select(`
          *,
          user_profile:profiles!task_comments_user_id_fkey (
            full_name
          )
        `)
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Erro ao buscar comentários:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("task_comments").insert({
        task_id: taskId,
        user_id: user?.id,
        content: newComment.trim(),
      });

      if (error) throw error;

      // Notify task creator and assignee
      const { data: task } = await supabase
        .from("tasks")
        .select("title, created_by, assigned_to")
        .eq("id", taskId)
        .single();

      if (task) {
        const usersToNotify = new Set<string>();
        if (task.created_by && task.created_by !== user?.id) usersToNotify.add(task.created_by);
        if (task.assigned_to && task.assigned_to !== user?.id) usersToNotify.add(task.assigned_to);

        for (const userId of usersToNotify) {
          await createNotification({
            userId,
            title: "Novo comentário em tarefa",
            message: `Novo comentário na tarefa: ${task.title}`,
            category: "comment",
            referenceId: taskId,
            referenceType: "task",
            sendEmail: true,
          });
        }
      }

      toast.success("Comentário adicionado!");
      setNewComment("");
      fetchComments();
    } catch (error) {
      console.error("Erro ao adicionar comentário:", error);
      toast.error("Erro ao adicionar comentário");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("task_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      toast.success("Comentário removido!");
      fetchComments();
    } catch (error) {
      console.error("Erro ao deletar comentário:", error);
      toast.error("Erro ao remover comentário");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comentários ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum comentário ainda. Seja o primeiro a comentar!
          </p>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {comment.user_profile.full_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {comment.user_profile.full_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    {currentUserId === comment.user_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(comment.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {canComment && (
          <form onSubmit={handleSubmit} className="space-y-2 pt-2">
            <Textarea
              placeholder="Adicionar comentário..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px]"
            />
            <Button
              type="submit"
              disabled={submitting || !newComment.trim()}
              size="sm"
              className="ml-auto flex gap-2"
            >
              <Send className="h-4 w-4" />
              Enviar
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}