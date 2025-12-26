import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulletsSectionProps {
  items: string[];
  onChange: (items: string[]) => void;
  isEditing?: boolean;
  placeholder?: string;
  maxItems?: number;
}

export function BulletsSection({ 
  items, 
  onChange, 
  isEditing = false, 
  placeholder = "Digite um item...",
  maxItems
}: BulletsSectionProps) {
  const [localItems, setLocalItems] = useState<string[]>(items);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleChange = (index: number, value: string) => {
    const updated = [...localItems];
    updated[index] = value;
    setLocalItems(updated);
    onChange(updated);
  };

  const addItem = () => {
    if (maxItems && localItems.length >= maxItems) return;
    const updated = [...localItems, ""];
    setLocalItems(updated);
    onChange(updated);
    // Focus new input after render
    setTimeout(() => {
      inputRefs.current[updated.length - 1]?.focus();
    }, 0);
  };

  const removeItem = (index: number) => {
    const updated = localItems.filter((_, i) => i !== index);
    setLocalItems(updated);
    onChange(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!maxItems || localItems.length < maxItems) {
        addItem();
      }
    }
    if (e.key === "Backspace" && localItems[index] === "" && index > 0) {
      e.preventDefault();
      removeItem(index);
      inputRefs.current[index - 1]?.focus();
    }
  };

  if (!isEditing) {
    if (localItems.filter(Boolean).length === 0) {
      return (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">Nenhum item adicionado</p>
        </div>
      );
    }

    return (
      <ul className="space-y-2">
        {localItems.filter(Boolean).map((item, index) => (
          <li key={index} className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">{index + 1}</span>
            </div>
            <span className="text-sm">{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-2">
      {localItems.map((item, index) => (
        <div key={index} className="flex items-center gap-2 group">
          <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
          <Input
            ref={(el) => { inputRefs.current[index] = el; }}
            value={item}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            placeholder={placeholder}
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            onClick={() => removeItem(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      
      {(!maxItems || localItems.length < maxItems) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={addItem}
          className="w-full mt-2 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Adicionar item
          {maxItems && <span className="ml-1 text-xs">({localItems.length}/{maxItems})</span>}
        </Button>
      )}
    </div>
  );
}
