import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BriefingEditor } from "./BriefingEditor";
import { MeetingViewer } from "@/components/meeting-editor/MeetingViewer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, User, X, Pencil, Trash2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { TaskComments } from "./TaskComments";
import { ShareTaskDialog } from "./ShareTaskDialog";
import {
  TASK_CATEGORIES,
  TaskCategory,
  getCategoryStatuses,
  getStatusLabel,
  getStatusColor,
  getPriorityColor,
  getPriorityLabel,
} from "@/lib/taskCategories";

interface Profile {
  id: string;
  full_name: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  category: string;
  assigned_to?: string;
  share_token?: string;
  slug?: string;
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
  onDelete?: () => void;
}

export function TaskDetailDialog({
  open,
  onOpenChange,
  task,
  canEdit = false,
  onUpdate,
  onDelete,
}: TaskDetailDialogProps) {
  const [status, setStatus] = useState(task?.status || "");
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  
  // Form state for editing
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "",
    due_date: "",
    assigned_to: "",
    status: "",
  });

  useEffect(() => {
    setStatus(task?.status || "");
    if (task) {
      setEditForm({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "medium",
        due_date: task.due_date || "",
        assigned_to: task.assigned_to || "",
        status: task.status || "",
      });
    }
    setIsEditing(false);
  }, [task]);

  useEffect(() => {
    if (isEditing) {
      fetchProfiles();
    }
  }, [isEditing]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .order("full_name");

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Erro ao buscar perfis:", error);
    }
  };

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

  const handleSaveEdit = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: editForm.title,
          description: editForm.description || null,
          priority: editForm.priority as any,
          due_date: editForm.due_date || null,
          assigned_to: editForm.assigned_to || null,
          status: editForm.status as any,
        })
        .eq("id", task.id);

      if (error) throw error;

      toast.success("Atividade atualizada!");
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error("Erro ao atualizar atividade:", error);
      toast.error("Erro ao atualizar atividade");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", task.id);

      if (error) throw error;

      toast.success("Atividade excluída!");
      setShowDeleteConfirm(false);
      onOpenChange(false);
      onDelete?.();
      onUpdate?.();
    } catch (error) {
      console.error("Erro ao excluir atividade:", error);
      toast.error("Erro ao excluir atividade");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1 pr-8">
                {isEditing ? (
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="text-xl font-semibold"
                    placeholder="Título da atividade"
                  />
                ) : (
                  <DialogTitle className="text-2xl">{task.title}</DialogTitle>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {TASK_CATEGORIES[category]}
                  </Badge>
                  {!isEditing && (
                    <>
                      <Badge className={getPriorityColor(task.priority)} variant="outline">
                        {getPriorityLabel(task.priority)}
                      </Badge>
                      <Badge className={getStatusColor(task.status)} variant="outline">
                        {getStatusLabel(category, task.status)}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowShareDialog(true)}
                  title="Compartilhar"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                {canEdit && !isEditing && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditing(true)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowDeleteConfirm(true)}
                      title="Excluir"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {isEditing ? (
              // Edit mode
              <div className="space-y-4">
                <div>
                  <Label>Briefing / Descrição</Label>
                  <BriefingEditor
                    content={editForm.description}
                    onChange={(html) => setEditForm({ ...editForm, description: html })}
                    placeholder="Descreva o briefing da atividade com formatação, links e imagens..."
                    minHeight="200px"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={editForm.status}
                      onValueChange={(v) => setEditForm({ ...editForm, status: v })}
                    >
                      <SelectTrigger>
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
                  </div>
                  <div>
                    <Label>Prioridade</Label>
                    <Select
                      value={editForm.priority}
                      onValueChange={(v) => setEditForm({ ...editForm, priority: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Prazo</Label>
                    <Input
                      type="date"
                      value={editForm.due_date}
                      onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Responsável</Label>
                    <Select
                      value={editForm.assigned_to}
                      onValueChange={(v) => setEditForm({ ...editForm, assigned_to: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={updating || !editForm.title}
                    className="flex-1"
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            ) : (
              // View mode
              <>
                {task.description && (
                  <div>
                    <Label className="text-base font-semibold">Briefing</Label>
                    <div className="mt-2 prose prose-sm max-w-none text-muted-foreground">
                      <MeetingViewer content={task.description} />
                    </div>
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
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A atividade "{task.title}" será
              permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {task && (
        <ShareTaskDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          taskSlug={task.slug}
          shareToken={task.share_token || task.id}
          taskTitle={task.title}
        />
      )}
    </>
  );
}
