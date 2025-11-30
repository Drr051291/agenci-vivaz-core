import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, User, X } from "lucide-react";
import { toast } from "sonner";
import { TaskComments } from "./TaskComments";
import {
  TASK_CATEGORIES,
  TaskCategory,
  getCategoryStatuses,
  getStatusLabel,
  getStatusColor,
  getPriorityColor,
  getPriorityLabel,
} from "@/lib/taskCategories";

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

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  canEdit?: boolean;
  onUpdate?: () => void;
}

export function TaskDetailDialog({
  open,
  onOpenChange,
  task,
  canEdit = false,
  onUpdate,
}: TaskDetailDialogProps) {
  const [status, setStatus] = useState(task?.status || "");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setStatus(task?.status || "");
  }, [task]);

  if (!task) return null;

  const category = task.category as TaskCategory;
  const categoryStatuses = getCategoryStatuses(category);

  const handleStatusUpdate = async () => {
    if (status === task.status) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: status as any })
        .eq("id", task.id);

      if (error) throw error;

      toast.success("Status atualizado!");
      onUpdate?.();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1 pr-8">
              <DialogTitle className="text-2xl">{task.title}</DialogTitle>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {TASK_CATEGORIES[category]}
                </Badge>
                <Badge className={getPriorityColor(task.priority)} variant="outline">
                  {getPriorityLabel(task.priority)}
                </Badge>
                <Badge className={getStatusColor(task.status)} variant="outline">
                  {getStatusLabel(category, task.status)}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {task.description && (
            <div>
              <Label className="text-base font-semibold">Descrição</Label>
              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {task.due_date && (
              <div>
                <Label className="text-sm font-semibold">Vencimento</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {new Date(task.due_date).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            )}
            {task.assigned_profile && (
              <div>
                <Label className="text-sm font-semibold">Responsável</Label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{task.assigned_profile.full_name}</span>
                </div>
              </div>
            )}
          </div>

          {canEdit && (
            <div className="space-y-2">
              <Label htmlFor="status">Atualizar Status</Label>
              <div className="flex gap-2">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryStatuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={updating || status === task.status}
                >
                  Salvar
                </Button>
              </div>
            </div>
          )}

          <TaskComments taskId={task.id} canComment={true} />
        </div>
      </DialogContent>
    </Dialog>
  );
}