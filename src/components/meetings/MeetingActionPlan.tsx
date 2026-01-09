import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle2, Clock, Circle, GripVertical, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ActionPlanItem {
  id: string;
  title: string;
  responsible: string;
  deadline?: string;
  status: "pending" | "in_progress" | "completed";
  category: string;
}

interface MeetingActionPlanProps {
  items: ActionPlanItem[];
  onChange: (items: ActionPlanItem[]) => void;
  isEditing?: boolean;
}

const STATUS_CONFIG = {
  pending: { label: "Pendente", icon: Circle, color: "bg-muted text-muted-foreground" },
  in_progress: { label: "Em andamento", icon: Clock, color: "bg-blue-100 text-blue-700" },
  completed: { label: "Concluída", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700" },
};

const CATEGORY_OPTIONS = [
  { value: "criativo", label: "Criativo", color: "bg-purple-100 text-purple-700" },
  { value: "comercial", label: "Comercial", color: "bg-blue-100 text-blue-700" },
  { value: "tecnico", label: "Técnico", color: "bg-amber-100 text-amber-700" },
  { value: "estrategia", label: "Estratégia", color: "bg-emerald-100 text-emerald-700" },
  { value: "conteudo", label: "Conteúdo", color: "bg-pink-100 text-pink-700" },
  { value: "processos", label: "Processos", color: "bg-gray-100 text-gray-700" },
  { value: "outro", label: "Outro", color: "bg-muted text-muted-foreground" },
];

export function MeetingActionPlan({ items, onChange, isEditing = false }: MeetingActionPlanProps) {
  const [localItems, setLocalItems] = useState<ActionPlanItem[]>(items);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleChange = (index: number, field: keyof ActionPlanItem, value: string) => {
    const updated = [...localItems];
    updated[index] = { ...updated[index], [field]: value };
    setLocalItems(updated);
    onChange(updated);
  };

  const addItem = () => {
    const newItem: ActionPlanItem = {
      id: `action_${Date.now()}`,
      title: "",
      responsible: "",
      status: "pending",
      category: "outro",
    };
    const updated = [...localItems, newItem];
    setLocalItems(updated);
    onChange(updated);
  };

  const removeItem = (index: number) => {
    const updated = localItems.filter((_, i) => i !== index);
    setLocalItems(updated);
    onChange(updated);
  };

  const getCategoryConfig = (category: string) => {
    return CATEGORY_OPTIONS.find(c => c.value === category) || CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 1];
  };

  const completedCount = localItems.filter(i => i.status === "completed").length;
  const totalCount = localItems.length;

  if (!isEditing && localItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Wrench className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nenhuma ação definida</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      {totalCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <div className="flex-1">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  completedCount === totalCount ? "bg-emerald-500" : "bg-primary"
                )}
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {completedCount}/{totalCount} concluídas
          </span>
        </div>
      )}

      {/* Items */}
      <div className="space-y-2">
        {localItems.map((item, index) => {
          const statusConfig = STATUS_CONFIG[item.status];
          const StatusIcon = statusConfig.icon;
          const categoryConfig = getCategoryConfig(item.category);

          return (
            <div 
              key={item.id}
              className={cn(
                "p-3 rounded-lg border group transition-all",
                item.status === "completed" && "bg-muted/50 opacity-70"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Status indicator */}
                {isEditing ? (
                  <Select
                    value={item.status}
                    onValueChange={(value) => handleChange(index, "status", value)}
                  >
                    <SelectTrigger className="h-7 w-7 p-0 border-0 bg-transparent flex-shrink-0">
                      <StatusIcon className={cn("h-4 w-4", statusConfig.color.split(" ")[1])} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <config.icon className="h-4 w-4" />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <StatusIcon className={cn("h-4 w-4 flex-shrink-0 mt-0.5", statusConfig.color.split(" ")[1])} />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    {/* Category badge */}
                    {isEditing ? (
                      <Select
                        value={item.category}
                        onValueChange={(value) => handleChange(index, "category", value)}
                      >
                        <SelectTrigger className="h-6 w-auto text-xs border-0 px-2">
                          <Badge variant="outline" className={cn("text-xs", categoryConfig.color)}>
                            {categoryConfig.label}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              <Badge variant="outline" className={cn("text-xs", cat.color)}>
                                {cat.label}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className={cn("text-xs", categoryConfig.color)}>
                        {categoryConfig.label}
                      </Badge>
                    )}
                  </div>

                  {/* Title */}
                  {isEditing ? (
                    <Input
                      value={item.title}
                      onChange={(e) => handleChange(index, "title", e.target.value)}
                      placeholder="Descreva a ação... Ex: Desenvolver 3 criativos para campanha de remarketing"
                      className={cn(
                        "text-sm border-0 bg-transparent px-0 focus-visible:ring-0 h-8",
                        item.status === "completed" && "line-through text-muted-foreground"
                      )}
                    />
                  ) : (
                    <p className={cn(
                      "text-sm",
                      item.status === "completed" && "line-through text-muted-foreground"
                    )}>
                      {item.title || "Sem título"}
                    </p>
                  )}

                  {/* Responsible + Deadline */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Resp:</span>
                      {isEditing ? (
                        <Input
                          value={item.responsible}
                          onChange={(e) => handleChange(index, "responsible", e.target.value)}
                          placeholder="Nome..."
                          className="h-6 text-xs w-28 px-1.5"
                        />
                      ) : (
                        <span className="text-xs font-medium">
                          {item.responsible || "—"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Prazo:</span>
                      {isEditing ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-6 text-xs font-normal px-1.5"
                            >
                              {item.deadline 
                                ? format(new Date(item.deadline), "dd/MM/yy", { locale: ptBR })
                                : "Definir"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={item.deadline ? new Date(item.deadline) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  handleChange(index, "deadline", format(date, "yyyy-MM-dd"));
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <span className="text-xs font-medium">
                          {item.deadline 
                            ? format(new Date(item.deadline), "dd/MM/yy", { locale: ptBR })
                            : "—"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Remove */}
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add item */}
      {isEditing && (
        <Button
          variant="outline"
          size="sm"
          onClick={addItem}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Adicionar ação
        </Button>
      )}
    </div>
  );
}
