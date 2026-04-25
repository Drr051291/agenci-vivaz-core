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
import {
  Calendar,
  User,
  X,
  Pencil,
  Trash2,
  Share2,
  CheckCircle2,
  Clock,
  PlayCircle,
  Flag,
  Tag,
  AlignLeft,
  MessageSquare,
  Save,
  ArrowLeft,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

  // Pick 3 representative statuses (first / middle / last) for the visual pill switcher
  const pillStatuses = (() => {
    if (categoryStatuses.length <= 3) return categoryStatuses;
    const first = categoryStatuses[0];
    const last = categoryStatuses[categoryStatuses.length - 1];
    const mid = categoryStatuses[Math.floor(categoryStatuses.length / 2)];
    return [first, mid, last];
  })();

  const getStatusIcon = (value: string) => {
    if (["pendente", "briefing", "planejamento", "solicitado", "analise"].includes(value)) {
      return Clock;
    }
    if (
      [
        "concluido",
        "entregue",
        "publicada",
        "encerrada",
        "finalizada",
        "aprovado",
      ].includes(value)
    ) {
      return CheckCircle2;
    }
    return PlayCircle;
  };

  const dueDateInfo = (() => {
    if (!task.due_date) return null;
    const date = new Date(task.due_date);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let labelTone = "text-foreground";
    let helper = "";
    if (diffDays < 0) {
      labelTone = "text-destructive";
      helper = `${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? "dia em atraso" : "dias em atraso"}`;
    } else if (diffDays === 0) {
      labelTone = "text-destructive";
      helper = "Vence hoje";
    } else if (diffDays <= 3) {
      labelTone = "text-amber-600 dark:text-amber-400";
      helper = `Restam ${diffDays} ${diffDays === 1 ? "dia" : "dias"}`;
    } else {
      helper = `Restam ${diffDays} dias`;
    }
    return {
      formatted: format(date, "dd MMM, yyyy", { locale: ptBR }),
      labelTone,
      helper,
    };
  })();

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
        <DialogContent className="max-w-5xl max-h-[92vh] p-0 gap-0 overflow-hidden border-border/60 [&>button]:hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-border/60 bg-gradient-to-br from-background to-muted/30">
            <div className="flex items-center gap-3 min-w-0">
              {isEditing && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsEditing(false)}
                  title="Voltar"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  {TASK_CATEGORIES[category]}
                  <span className="text-foreground/30">·</span>
                  <span className={isEditing ? "text-primary" : "text-muted-foreground"}>
                    {isEditing ? "Modo edição" : "Visualização"}
                  </span>
                </div>
                {isEditing ? (
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="mt-1 h-9 text-lg font-semibold border-border/40 focus-visible:ring-1"
                    placeholder="Título da atividade"
                  />
                ) : (
                  <DialogTitle className="text-xl font-bold tracking-tight mt-0.5 truncate">
                    {task.title}
                  </DialogTitle>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShareDialog(true)}
                className="h-8 gap-1.5 hidden sm:inline-flex"
              >
                <Share2 className="h-3.5 w-3.5" />
                Compartilhar
              </Button>
              {canEdit && !isEditing && (
                <Button
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-8 gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Button>
              )}
              {canEdit && isEditing && (
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={updating || !editForm.title}
                  className="h-8 gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  {updating ? "Salvando..." : "Salvar"}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 max-h-[calc(92vh-80px)] overflow-hidden">
            {/* Main column */}
            <div className="lg:col-span-2 overflow-y-auto px-6 py-5 space-y-5 border-r border-border/60">
              {/* Status switcher (visual pills) — view mode only */}
              {!isEditing && (
                <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <PlayCircle className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold">Status da Atividade</h3>
                  </div>
                  <div className={cn(
                    "grid gap-2",
                    pillStatuses.length === 3 ? "grid-cols-3" : pillStatuses.length === 2 ? "grid-cols-2" : "grid-cols-1"
                  )}>
                    {pillStatuses.map((s) => {
                      const Icon = getStatusIcon(s.value);
                      const active = (canEdit ? status : task.status) === s.value;
                      return (
                        <button
                          key={s.value}
                          disabled={!canEdit || updating}
                          onClick={() => {
                            if (!canEdit) return;
                            setStatus(s.value);
                            // Optimistic save on click
                            (async () => {
                              setUpdating(true);
                              const { error } = await supabase
                                .from("tasks")
                                .update({ status: s.value as any })
                                .eq("id", task.id);
                              setUpdating(false);
                              if (error) {
                                toast.error("Erro ao atualizar status");
                                setStatus(task.status);
                              } else {
                                toast.success("Status atualizado");
                                onUpdate?.();
                              }
                            })();
                          }}
                          className={cn(
                            "flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-3 transition-all",
                            active
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border/60 bg-background hover:border-primary/30 hover:bg-accent/40",
                            !canEdit && "cursor-default opacity-90"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5",
                              active ? "text-primary" : "text-muted-foreground"
                            )}
                          />
                          <span
                            className={cn(
                              "text-[11px] font-semibold uppercase tracking-wider",
                              active ? "text-primary" : "text-muted-foreground"
                            )}
                          >
                            {s.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {canEdit && categoryStatuses.length > 3 && (
                    <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">Mais opções:</span>
                      <Select
                        value={status}
                        onValueChange={(v) => {
                          setStatus(v);
                          (async () => {
                            setUpdating(true);
                            const { error } = await supabase
                              .from("tasks")
                              .update({ status: v as any })
                              .eq("id", task.id);
                            setUpdating(false);
                            if (error) {
                              toast.error("Erro ao atualizar status");
                              setStatus(task.status);
                            } else {
                              toast.success("Status atualizado");
                              onUpdate?.();
                            }
                          })();
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
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
                  )}
                </div>
              )}

              {/* Briefing card */}
              <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <AlignLeft className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold">
                      {isEditing ? "Briefing / Descrição" : "Descrição do Escopo"}
                    </h3>
                  </div>
                </div>
                <div className="p-4">
                  {isEditing ? (
                    <BriefingEditor
                      content={editForm.description}
                      onChange={(html) => setEditForm({ ...editForm, description: html })}
                      placeholder="Descreva o briefing da atividade com formatação, links e imagens..."
                      minHeight="200px"
                    />
                  ) : task.description ? (
                    <div className="prose prose-sm max-w-none text-foreground/90 dark:prose-invert">
                      <MeetingViewer content={task.description} />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Nenhum briefing adicionado.
                    </p>
                  )}
                </div>
              </div>

              {/* Edit-mode form fields */}
              {isEditing && (
                <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Pencil className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold">Detalhes da Atividade</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Status
                      </Label>
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
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Prioridade
                      </Label>
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
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Prazo
                      </Label>
                      <Input
                        type="date"
                        value={editForm.due_date}
                        onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Responsável
                      </Label>
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
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Alterações
                    </Button>
                  </div>
                </div>
              )}

              {/* Comments / Timeline — view mode */}
              {!isEditing && (
                <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold">Interações e Timeline</h3>
                  </div>
                  <div className="p-4">
                    <TaskComments taskId={task.id} canComment={true} />
                  </div>
                </div>
              )}
            </div>

            {/* Right info panel */}
            <aside className="lg:col-span-1 overflow-y-auto bg-muted/20 px-5 py-5 space-y-4">
              <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm space-y-4">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Painel de Informações
                </h4>

                {/* Deadline */}
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                    <Calendar className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Prazo Final
                    </p>
                    {dueDateInfo ? (
                      <>
                        <p className={cn("text-sm font-semibold", dueDateInfo.labelTone)}>
                          {dueDateInfo.formatted}
                        </p>
                        <p className={cn("text-[11px] mt-0.5", dueDateInfo.labelTone)}>
                          {dueDateInfo.helper}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sem prazo definido</p>
                    )}
                  </div>
                </div>

                <div className="h-px bg-border/60" />

                {/* Responsible */}
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Responsável
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {task.assigned_profile?.full_name || "Não atribuído"}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-border/60" />

                {/* Priority */}
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Flag className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Prioridade
                    </p>
                    <Badge
                      className={cn("mt-0.5", getPriorityColor(task.priority))}
                      variant="outline"
                    >
                      {getPriorityLabel(task.priority)}
                    </Badge>
                  </div>
                </div>

                <div className="h-px bg-border/60" />

                {/* Current status */}
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Status Atual
                    </p>
                    <Badge
                      className={cn("mt-0.5", getStatusColor(task.status))}
                      variant="outline"
                    >
                      {getStatusLabel(category, task.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Ações Rápidas
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 sm:hidden"
                  onClick={() => setShowShareDialog(true)}
                >
                  <Share2 className="h-4 w-4" />
                  Compartilhar Atividade
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 hidden sm:inline-flex"
                  onClick={() => setShowShareDialog(true)}
                >
                  <Share2 className="h-4 w-4" />
                  Compartilhar
                </Button>
                {canEdit && (
                  <>
                    {!isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2"
                        onClick={() => setIsEditing(true)}
                      >
                        <Pencil className="h-4 w-4" />
                        Editar Atividade
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/5"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir Atividade
                    </Button>
                  </>
                )}
              </div>
            </aside>
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
