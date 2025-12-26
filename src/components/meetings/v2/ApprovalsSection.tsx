import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, ListTodo, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApprovalItem {
  id?: string;
  item_type: "budget" | "creatives" | "landing_page" | "tracking" | "other";
  label: string;
  details?: string;
  value?: number;
  is_approved: boolean;
  task_id?: string;
}

interface ApprovalsSectionProps {
  items: ApprovalItem[];
  onChange: (items: ApprovalItem[]) => void;
  onCreateTask?: (item: ApprovalItem) => void;
  isEditing?: boolean;
}

const DEFAULT_ITEMS: Partial<ApprovalItem>[] = [
  { item_type: "budget", label: "Aprovar orçamento do próximo período" },
  { item_type: "creatives", label: "Aprovar criativos" },
  { item_type: "landing_page", label: "Aprovar landing page" },
  { item_type: "tracking", label: "Aprovar tracking/pixel" },
];

const TYPE_CONFIG = {
  budget: { icon: "💰", color: "bg-emerald-50 border-emerald-200" },
  creatives: { icon: "🎨", color: "bg-purple-50 border-purple-200" },
  landing_page: { icon: "🌐", color: "bg-blue-50 border-blue-200" },
  tracking: { icon: "📊", color: "bg-amber-50 border-amber-200" },
  other: { icon: "📋", color: "bg-muted border-border" },
};

export function ApprovalsSection({
  items,
  onChange,
  onCreateTask,
  isEditing = false,
}: ApprovalsSectionProps) {
  const [localItems, setLocalItems] = useState<ApprovalItem[]>(items);

  useEffect(() => {
    // Initialize with defaults if empty and editing
    if (items.length === 0 && isEditing) {
      const defaults = DEFAULT_ITEMS.map(d => ({
        ...d,
        is_approved: false,
        details: "",
      } as ApprovalItem));
      setLocalItems(defaults);
      onChange(defaults);
    } else {
      setLocalItems(items);
    }
  }, [items]);

  const handleToggle = (index: number) => {
    const updated = [...localItems];
    updated[index] = { ...updated[index], is_approved: !updated[index].is_approved };
    setLocalItems(updated);
    onChange(updated);
  };

  const handleChange = (index: number, field: keyof ApprovalItem, value: string | number) => {
    const updated = [...localItems];
    updated[index] = { ...updated[index], [field]: value };
    setLocalItems(updated);
    onChange(updated);
  };

  const addItem = () => {
    const newItem: ApprovalItem = {
      item_type: "other",
      label: "",
      is_approved: false,
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

  const approvedCount = localItems.filter(i => i.is_approved).length;
  const totalCount = localItems.length;

  if (!isEditing && localItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nenhuma aprovação pendente</p>
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
                  approvedCount === totalCount ? "bg-emerald-500" : "bg-primary"
                )}
                style={{ width: `${(approvedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {approvedCount}/{totalCount} aprovados
          </span>
        </div>
      )}

      {/* Items */}
      <div className="space-y-2">
        {localItems.map((item, index) => {
          const config = TYPE_CONFIG[item.item_type];

          return (
            <div 
              key={index}
              className={cn(
                "p-3 rounded-lg border group transition-all",
                config.color,
                item.is_approved && "opacity-60"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <Checkbox
                  checked={item.is_approved}
                  onCheckedChange={() => handleToggle(index)}
                  className="mt-0.5"
                />

                {/* Icon */}
                <span className="text-lg flex-shrink-0">{config.icon}</span>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  {isEditing ? (
                    <>
                      <Input
                        value={item.label}
                        onChange={(e) => handleChange(index, "label", e.target.value)}
                        placeholder="Nome da aprovação..."
                        className={cn(
                          "bg-white/80 text-sm",
                          item.is_approved && "line-through"
                        )}
                      />
                      <div className="flex gap-2">
                        <Input
                          value={item.details || ""}
                          onChange={(e) => handleChange(index, "details", e.target.value)}
                          placeholder="Detalhes (opcional)..."
                          className="bg-white/80 text-xs h-8 flex-1"
                        />
                        {item.item_type === "budget" && (
                          <Input
                            type="number"
                            value={item.value || ""}
                            onChange={(e) => handleChange(index, "value", parseFloat(e.target.value) || 0)}
                            placeholder="Valor R$"
                            className="bg-white/80 text-xs h-8 w-28"
                          />
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className={cn(
                        "text-sm font-medium",
                        item.is_approved && "line-through text-muted-foreground"
                      )}>
                        {item.label}
                      </p>
                      {(item.details || item.value) && (
                        <p className="text-xs text-muted-foreground">
                          {item.details}
                          {item.value && ` • R$ ${item.value.toLocaleString('pt-BR')}`}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1">
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onCreateTask && item.label && !item.task_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                      onClick={() => onCreateTask(item)}
                      title="Criar atividade de aprovação"
                    >
                      <ListTodo className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
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
          Adicionar aprovação
        </Button>
      )}
    </div>
  );
}
