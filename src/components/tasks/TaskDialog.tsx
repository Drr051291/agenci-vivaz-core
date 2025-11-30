import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { TASK_CATEGORIES, TaskCategory, getCategoryStatuses } from "@/lib/taskCategories";

interface Profile {
  id: string;
  full_name: string;
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onSuccess: () => void;
}

export function TaskDialog({ open, onOpenChange, clientId, onSuccess }: TaskDialogProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "outros" as TaskCategory,
    status: "",
    priority: "medium",
    due_date: "",
    assigned_to: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchProfiles();
    }
  }, [open]);

  useEffect(() => {
    // Atualizar status quando a categoria mudar
    const statuses = getCategoryStatuses(formData.category);
    if (statuses.length > 0) {
      setFormData(prev => ({ ...prev, status: statuses[0].value }));
    }
  }, [formData.category]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("tasks").insert({
        client_id: clientId,
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        status: formData.status as any,
        priority: formData.priority as any,
        due_date: formData.due_date || null,
        assigned_to: formData.assigned_to || null,
        created_by: user?.id || null,
      } as any);

      if (error) throw error;

      toast.success("Atividade criada com sucesso!");
      onOpenChange(false);
      setFormData({
        title: "",
        description: "",
        category: "outros",
        status: "",
        priority: "medium",
        due_date: "",
        assigned_to: "",
      });
      onSuccess();
    } catch (error) {
      console.error("Erro ao criar task:", error);
      toast.error("Erro ao criar atividade");
    } finally {
      setSubmitting(false);
    }
  };

  const categoryStatuses = getCategoryStatuses(formData.category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Atividade</DialogTitle>
          <DialogDescription>
            Crie uma nova atividade para este cliente
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="category">Categoria *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData({ ...formData, category: value as TaskCategory })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TASK_CATEGORIES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData({ ...formData, priority: value })
                }
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

          <div>
            <Label htmlFor="due_date">Data de Vencimento</Label>
            <Input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) =>
                setFormData({ ...formData, due_date: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="assigned_to">Atribuir para *</Label>
            <Select
              value={formData.assigned_to}
              onValueChange={(value) =>
                setFormData({ ...formData, assigned_to: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um responsável" />
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

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting || !formData.title || !formData.status || !formData.assigned_to}
              className="flex-1"
            >
              Criar Atividade
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}