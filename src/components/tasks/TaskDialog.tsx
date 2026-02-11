import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BriefingEditor } from "./BriefingEditor";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  ACTIVITY_TYPES, 
  getActivityTypeById, 
  getActivityTypesByCategory,
  CATEGORY_LABELS,
  ActivityType,
  ActivityField 
} from "@/lib/activityTypes";
import { getCategoryStatuses } from "@/lib/taskCategories";
import { ChevronLeft, Zap } from "lucide-react";
import { createNotification } from "@/lib/notifications";

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
  const [step, setStep] = useState<"select" | "form">("select");
  const [selectedType, setSelectedType] = useState<ActivityType | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [assigned_to, setAssignedTo] = useState("");
  const [due_date, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchProfiles();
      // Reset state when opening
      setStep("select");
      setSelectedType(null);
      setFormData({});
      setAssignedTo("");
      setDueDate("");
      setPriority("medium");
    }
  }, [open]);

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

  const handleSelectType = (type: ActivityType) => {
    setSelectedType(type);
    setFormData({});
    setStep("form");
  };

  const generateTitle = () => {
    if (!selectedType) return "";
    
    // Para "outra_atividade", usar o título do formulário
    if (selectedType.id === "outra_atividade") {
      return formData.titulo || "Nova atividade";
    }
    
    // Gerar título baseado no tipo e campos preenchidos
    let title = selectedType.label;
    
    // Adicionar detalhes específicos ao título
    if (formData.objetivo) {
      const field = selectedType.fields.find(f => f.key === "objetivo");
      const option = field?.options?.find(o => o.value === formData.objetivo);
      if (option) title += ` - ${option.label}`;
    }
    if (formData.tipo) {
      const field = selectedType.fields.find(f => f.key === "tipo");
      const option = field?.options?.find(o => o.value === formData.tipo);
      if (option) title += ` - ${option.label}`;
    }
    if (formData.formato) {
      const field = selectedType.fields.find(f => f.key === "formato");
      const option = field?.options?.find(o => o.value === formData.formato);
      if (option) title += ` - ${option.label}`;
    }
    if (formData.ferramenta) {
      const field = selectedType.fields.find(f => f.key === "ferramenta");
      const option = field?.options?.find(o => o.value === formData.ferramenta);
      if (option) title += ` - ${option.label}`;
    }
    if (formData.campanha) {
      title += ` - ${formData.campanha}`;
    }
    
    return title;
  };

  const generateDescription = () => {
    if (!selectedType) return "";
    
    const parts: string[] = [];
    
    selectedType.fields.forEach(field => {
      const value = formData[field.key];
      if (value && field.key !== "titulo" && field.key !== "descricao") {
        if (field.type === "select" && field.options) {
          const option = field.options.find(o => o.value === value);
          parts.push(`${field.label}: ${option?.label || value}`);
        } else {
          parts.push(`${field.label}: ${value}`);
        }
      }
    });
    
    // Adicionar descrição do formulário se existir
    if (formData.descricao || formData.briefing) {
      parts.push("");
      parts.push(formData.descricao || formData.briefing);
    }
    
    return parts.join("\n");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const title = generateTitle();
      const description = generateDescription();
      
      const { data: taskData, error } = await supabase.from("tasks").insert({
        client_id: clientId,
        title,
        description: description || null,
        category: selectedType.category,
        status: "pendente",
        priority: priority as any,
        due_date: due_date || null,
        assigned_to: assigned_to || null,
        created_by: user?.id || null,
      } as any).select("id").single();

      if (error) throw error;

      // Send notification to assigned user (always send, even if self-assigned)
      if (assigned_to) {
        await createNotification({
          userId: assigned_to,
          title: "Nova atividade atribuída",
          message: `Você foi designado para a atividade: ${title}`,
          category: "task",
          referenceId: taskData?.id,
          referenceType: "task",
          sendEmail: true,
        });
      }

      toast.success("Atividade criada com sucesso!");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Erro ao criar task:", error);
      toast.error("Erro ao criar atividade");
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: ActivityField) => {
    const value = formData[field.key] || "";
    
    switch (field.type) {
      case "select":
        return (
          <Select
            value={value}
            onValueChange={(v) => setFormData({ ...formData, [field.key]: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "textarea":
        return (
          <BriefingEditor
            content={value}
            onChange={(html) => setFormData({ ...formData, [field.key]: html })}
            placeholder={field.placeholder}
            minHeight="120px"
          />
        );
      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
            placeholder={field.placeholder}
          />
        );
      default:
        return (
          <Input
            value={value}
            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
            placeholder={field.placeholder}
          />
        );
    }
  };

  const groupedTypes = getActivityTypesByCategory();

  const isFormValid = () => {
    if (!selectedType) return false;
    if (!assigned_to) return false;
    
    // Verificar campos obrigatórios do tipo
    for (const field of selectedType.fields) {
      if (field.required && !formData[field.key]) {
        return false;
      }
    }
    
    // Para "outra_atividade", título é obrigatório
    if (selectedType.id === "outra_atividade" && !formData.titulo) {
      return false;
    }
    
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "form" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setStep("select")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            {step === "select" ? "Nova Atividade" : selectedType?.label}
          </DialogTitle>
        </DialogHeader>

        {step === "select" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione o tipo de atividade que deseja criar:
            </p>
            <div className="space-y-4">
              {Object.entries(groupedTypes).map(([category, types]) => (
                <div key={category}>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {CATEGORY_LABELS[category] || category}
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {types.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => handleSelectType(type)}
                        className="flex items-center gap-3 p-3 text-left rounded-lg border border-border hover:bg-accent hover:border-primary/30 transition-all group"
                      >
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Zap className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campos específicos do tipo */}
            {selectedType?.fields.map((field) => (
              <div key={field.key}>
                <Label>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {renderField(field)}
              </div>
            ))}

            {/* Campos padrão */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <Label>Responsável <span className="text-destructive">*</span></Label>
                <Select value={assigned_to} onValueChange={setAssignedTo}>
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
              <div>
                <Label>Prioridade</Label>
                <Select value={priority} onValueChange={setPriority}>
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
              <Label>Prazo</Label>
              <Input
                type="date"
                value={due_date}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            {/* Preview do título */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Título gerado:</p>
              <p className="font-medium text-sm">{generateTitle() || "..."}</p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("select")}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                disabled={submitting || !isFormValid()}
                className="flex-1"
              >
                Criar Atividade
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
