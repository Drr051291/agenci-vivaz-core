import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
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
import {
  ChevronLeft,
  X,
  Search,
  CheckCircle2,
  Megaphone,
  Target,
  Mail,
  Sparkles,
  LayoutTemplate,
  Globe,
  FileText,
  Wrench,
  MoreHorizontal,
  Info,
  AlignLeft,
  Calendar as CalendarIcon,
  AlertTriangle,
  Lightbulb,
  Lock,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { createNotification } from "@/lib/notifications";
import { cn } from "@/lib/utils";

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

// Visual config per category — icons + accent gradients
const CATEGORY_VISUALS: Record<
  string,
  { icon: LucideIcon; gradient: string; tint: string; subtitle: string }
> = {
  meta_ads: {
    icon: Megaphone,
    gradient: "from-fuchsia-500 to-purple-600",
    tint: "bg-fuchsia-100 text-fuchsia-700",
    subtitle: "Campanhas Facebook & Instagram",
  },
  google_ads: {
    icon: Target,
    gradient: "from-sky-500 to-blue-600",
    tint: "bg-sky-100 text-sky-700",
    subtitle: "Search, Display, Shopping & YouTube",
  },
  email_marketing: {
    icon: Mail,
    gradient: "from-amber-500 to-orange-600",
    tint: "bg-amber-100 text-amber-700",
    subtitle: "Disparos e automações",
  },
  criativo: {
    icon: Sparkles,
    gradient: "from-pink-500 to-rose-600",
    tint: "bg-pink-100 text-pink-700",
    subtitle: "Peças, vídeos e design",
  },
  landing_page: {
    icon: LayoutTemplate,
    gradient: "from-indigo-500 to-violet-600",
    tint: "bg-indigo-100 text-indigo-700",
    subtitle: "Páginas de conversão",
  },
  seo: {
    icon: Globe,
    gradient: "from-emerald-500 to-teal-600",
    tint: "bg-emerald-100 text-emerald-700",
    subtitle: "Tráfego orgânico",
  },
  conteudo: {
    icon: FileText,
    gradient: "from-cyan-500 to-sky-600",
    tint: "bg-cyan-100 text-cyan-700",
    subtitle: "Posts, artigos e materiais",
  },
  ajuste: {
    icon: Wrench,
    gradient: "from-slate-500 to-slate-700",
    tint: "bg-slate-100 text-slate-700",
    subtitle: "Setup e correções técnicas",
  },
  outros: {
    icon: MoreHorizontal,
    gradient: "from-purple-500 to-fuchsia-600",
    tint: "bg-purple-100 text-purple-700",
    subtitle: "Atividades gerais",
  },
};

const PRIORITY_OPTIONS = [
  { value: "low", label: "Baixa", dot: "bg-emerald-500" },
  { value: "medium", label: "Média", dot: "bg-amber-500" },
  { value: "high", label: "Alta", dot: "bg-orange-500" },
  { value: "urgent", label: "Urgente", dot: "bg-rose-500" },
];

const TIPS: Record<string, string> = {
  meta_ads: "Defina um orçamento e público realistas para garantir aprendizagem da campanha.",
  google_ads: "Selecione o tipo de campanha mais aderente ao objetivo de negócio.",
  email_marketing: "Personalize o assunto para aumentar a taxa de abertura.",
  criativo: "Briefings claros = entregas mais rápidas e assertivas.",
  landing_page: "Foque em uma única chamada para ação por página.",
  seo: "Use palavras-chave alinhadas à intenção do usuário.",
  conteudo: "Conteúdo de valor gera autoridade e conversão.",
  ajuste: "Documente o passo-a-passo do ajuste para futuras referências.",
  outros: "Defina prazos realistas e atribua um responsável claro.",
};

export function TaskDialog({ open, onOpenChange, clientId, onSuccess }: TaskDialogProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [step, setStep] = useState<"select" | "form">("select");
  const [selectedType, setSelectedType] = useState<ActivityType | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [assigned_to, setAssignedTo] = useState("");
  const [due_date, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
      setSearchQuery("");
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

  // Filter types by search query
  const filteredGroupedTypes = (() => {
    if (!searchQuery.trim()) return groupedTypes;
    const q = searchQuery.toLowerCase();
    const result: Record<string, ActivityType[]> = {};
    Object.entries(groupedTypes).forEach(([cat, types]) => {
      const filtered = types.filter(
        (t) =>
          t.label.toLowerCase().includes(q) ||
          (CATEGORY_LABELS[cat] || cat).toLowerCase().includes(q)
      );
      if (filtered.length > 0) result[cat] = filtered;
    });
    return result;
  })();

  const totalFilteredTypes = Object.values(filteredGroupedTypes).reduce(
    (acc, arr) => acc + arr.length,
    0
  );

  const selectedVisual = selectedType
    ? CATEGORY_VISUALS[selectedType.category] || CATEGORY_VISUALS.outros
    : null;

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
      <DialogContent
        className="max-w-4xl p-0 gap-0 overflow-hidden border-border/60 [&>button]:hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border/60 bg-gradient-to-br from-background to-muted/30">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
              <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Nova Atividade</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  {step === "select" ? "Etapa 1: Categoria" : "Etapa 2: Detalhamento"}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto">
          {step === "select" ? (
            <div className="px-6 py-5 space-y-5">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar tipo de atividade..."
                  className="pl-9 h-10 bg-muted/40 border-border/60"
                  autoFocus
                />
              </div>

              {/* Categories */}
              {totalFilteredTypes === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Nenhuma atividade encontrada para "{searchQuery}"
                </div>
              ) : (
                <div className="space-y-5">
                  {Object.entries(filteredGroupedTypes).map(([category, types]) => {
                    const visual = CATEGORY_VISUALS[category] || CATEGORY_VISUALS.outros;
                    const Icon = visual.icon;
                    return (
                      <div key={category}>
                        <div className="flex items-center gap-2 mb-2.5">
                          <div
                            className={cn(
                              "h-6 w-6 rounded-md flex items-center justify-center",
                              visual.tint
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                            {CATEGORY_LABELS[category] || category}
                          </h4>
                          <span className="text-[10px] text-muted-foreground">
                            {types.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {types.map((type) => (
                            <button
                              key={type.id}
                              onClick={() => handleSelectType(type)}
                              className="group flex items-center gap-3 p-3 text-left rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:shadow-sm hover:bg-accent/30 transition-all"
                            >
                              <div
                                className={cn(
                                  "h-9 w-9 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm",
                                  visual.gradient
                                )}
                              >
                                <Icon className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm leading-tight truncate">
                                  {type.label}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                  {type.fields.length} campos
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} id="task-form" className="px-6 py-5">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
                {/* LEFT — Form fields */}
                <div className="space-y-4">
                  {/* Informações Básicas */}
                  <div className="rounded-xl border border-border/60 bg-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold">Informações Básicas</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedType?.fields
                        .filter((f) => f.type !== "textarea")
                        .map((field) => (
                          <div
                            key={field.key}
                            className={
                              field.type === "text" || field.type === "number"
                                ? "sm:col-span-1"
                                : "sm:col-span-1"
                            }
                          >
                            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                              {field.label}
                              {field.required && (
                                <span className="text-destructive ml-0.5">*</span>
                              )}
                            </Label>
                            {renderField(field)}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Descrição / Briefing */}
                  {selectedType?.fields.some((f) => f.type === "textarea") && (
                    <div className="rounded-xl border border-border/60 bg-card p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlignLeft className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold">Descrição e Observações</h3>
                      </div>
                      {selectedType.fields
                        .filter((f) => f.type === "textarea")
                        .map((field) => (
                          <div key={field.key}>{renderField(field)}</div>
                        ))}
                    </div>
                  )}

                  {/* Preview do título */}
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/10">
                    <RefreshCw className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">
                        Título gerado automaticamente
                      </p>
                      <p className="text-sm font-medium truncate">
                        {generateTitle() || "Preencha os campos..."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* RIGHT — Sidebar */}
                <div className="space-y-3">
                  {/* Selected Category Card */}
                  {selectedVisual && selectedType && (
                    <div
                      className={cn(
                        "relative rounded-xl p-4 text-white overflow-hidden bg-gradient-to-br shadow-md",
                        selectedVisual.gradient
                      )}
                    >
                      <div className="absolute -right-4 -bottom-4 opacity-20">
                        <selectedVisual.icon className="h-24 w-24" />
                      </div>
                      <div className="relative">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Lock className="h-3 w-3" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            Selecionado
                          </span>
                        </div>
                        <h4 className="text-base font-bold leading-tight">
                          {CATEGORY_LABELS[selectedType.category] || selectedType.category}
                        </h4>
                        <p className="text-[11px] text-white/80 mt-0.5">
                          {selectedVisual.subtitle}
                        </p>
                        <button
                          type="button"
                          onClick={() => setStep("select")}
                          className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Alterar categoria
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Responsável */}
                  <div className="rounded-xl border border-border/60 bg-card p-3">
                    <Label className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                      <span className="text-primary">●</span>
                      Responsável <span className="text-destructive">*</span>
                    </Label>
                    <Select value={assigned_to} onValueChange={setAssignedTo}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Selecione um membro" />
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

                  {/* Prioridade */}
                  <div className="rounded-xl border border-border/60 bg-card p-3">
                    <Label className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      Prioridade
                    </Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PRIORITY_OPTIONS.map((opt) => {
                        const isActive = priority === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setPriority(opt.value)}
                            className={cn(
                              "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all",
                              isActive
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border/60 bg-background hover:bg-accent/40 text-foreground"
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full", opt.dot)} />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Prazo */}
                  <div className="rounded-xl border border-border/60 bg-card p-3">
                    <Label className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                      <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                      Prazo de Entrega
                    </Label>
                    <Input
                      type="date"
                      value={due_date}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Tip */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <div className="flex items-start gap-2">
                      <div className="h-6 w-6 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
                        <Lightbulb className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-primary">Dica Vivaz</p>
                        <p className="text-[11px] text-foreground/70 mt-0.5 leading-relaxed">
                          {selectedType ? TIPS[selectedType.category] || TIPS.outros : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border/60 bg-muted/20">
          {step === "form" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep("select")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              {totalFilteredTypes} tipo{totalFilteredTypes !== 1 ? "s" : ""} disponíve
              {totalFilteredTypes !== 1 ? "is" : "l"}
            </span>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            {step === "form" && (
              <Button
                type="submit"
                form="task-form"
                size="sm"
                disabled={submitting || !isFormValid()}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                {submitting ? "Criando..." : "Criar Atividade"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
