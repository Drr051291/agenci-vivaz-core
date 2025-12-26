import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Square, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  text: string;
  checked: boolean;
  notes?: string;
}

interface ChecklistSectionProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  isEditing?: boolean;
  placeholder?: string;
}

export function ChecklistSection({ 
  items, 
  onChange, 
  isEditing = false,
  placeholder = "Item a aprovar..."
}: ChecklistSectionProps) {
  const [localItems, setLocalItems] = useState<ChecklistItem[]>(items);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleChange = (index: number, field: keyof ChecklistItem, value: string | boolean) => {
    const updated = [...localItems];
    updated[index] = { ...updated[index], [field]: value };
    setLocalItems(updated);
    onChange(updated);
  };

  const addItem = () => {
    const newItem: ChecklistItem = {
      text: "",
      checked: false,
      notes: "",
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

  const checkedCount = localItems.filter(item => item.checked).length;

  if (!isEditing && localItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nenhuma aprovação necessária</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {localItems.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>Aprovações</span>
          <span>{checkedCount} de {localItems.length} concluídas</span>
        </div>
      )}

      {localItems.map((item, index) => (
        <div 
          key={index} 
          className={cn(
            "p-3 rounded-lg border transition-colors",
            item.checked ? "bg-emerald-50/50 border-emerald-200" : "bg-card"
          )}
        >
          <div className="flex items-start gap-3">
            <Checkbox
              checked={item.checked}
              onCheckedChange={(checked) => handleChange(index, "checked", !!checked)}
              className="mt-1"
            />
            <div className="flex-1 space-y-2">
              {isEditing ? (
                <>
                  <Input
                    value={item.text}
                    onChange={(e) => handleChange(index, "text", e.target.value)}
                    placeholder={placeholder}
                    className={cn(item.checked && "line-through text-muted-foreground")}
                  />
                  <Input
                    value={item.notes || ""}
                    onChange={(e) => handleChange(index, "notes", e.target.value)}
                    placeholder="Observações (opcional)"
                    className="text-sm h-8"
                  />
                </>
              ) : (
                <>
                  <p className={cn(
                    "text-sm font-medium",
                    item.checked && "line-through text-muted-foreground"
                  )}>
                    {item.text}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground">{item.notes}</p>
                  )}
                </>
              )}
            </div>
            {isEditing && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}

      {isEditing && (
        <Button variant="outline" size="sm" onClick={addItem} className="w-full">
          <Plus className="h-4 w-4 mr-1.5" />
          Adicionar aprovação
        </Button>
      )}
    </div>
  );
}
