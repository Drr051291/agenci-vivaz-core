import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, CheckCircle, AlertCircle, ArrowRight, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiagnosisItem {
  text: string;
  reason?: string; // evidence or hypothesis
}

interface DiagnosisSectionProps {
  whatWorked: DiagnosisItem[];
  whatDidntWork: DiagnosisItem[];
  onChange: (data: { whatWorked: DiagnosisItem[]; whatDidntWork: DiagnosisItem[] }) => void;
  onCreateTask?: (text: string, type: "improvement" | "maintain") => void;
  isEditing?: boolean;
}

interface DiagnosisListProps {
  items: DiagnosisItem[];
  onChange: (items: DiagnosisItem[]) => void;
  isEditing: boolean;
  type: "worked" | "didnt_work";
  placeholder: string;
  reasonPlaceholder: string;
  onCreateTask?: (text: string) => void;
}

function DiagnosisList({ 
  items, 
  onChange, 
  isEditing, 
  type, 
  placeholder, 
  reasonPlaceholder,
  onCreateTask 
}: DiagnosisListProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleTextChange = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], text: value };
    onChange(updated);
  };

  const handleReasonChange = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], reason: value };
    onChange(updated);
  };

  const addItem = () => {
    const updated = [...items, { text: "", reason: "" }];
    onChange(updated);
    setTimeout(() => {
      inputRefs.current[updated.length - 1]?.focus();
    }, 0);
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addItem();
    }
  };

  const isWorked = type === "worked";
  const Icon = isWorked ? CheckCircle : AlertCircle;
  const iconColor = isWorked ? "text-emerald-600" : "text-amber-600";
  const bgColor = isWorked ? "bg-emerald-50" : "bg-amber-50";
  const borderColor = isWorked ? "border-emerald-200" : "border-amber-200";

  if (!isEditing) {
    const filtered = items.filter(i => i.text);
    if (filtered.length === 0) {
      return (
        <p className="text-sm text-muted-foreground italic py-4">
          Nenhum item registrado
        </p>
      );
    }
    return (
      <ul className="space-y-3">
        {filtered.map((item, idx) => (
          <li key={idx} className={cn("p-3 rounded-lg border", bgColor, borderColor)}>
            <div className="flex items-start gap-2">
              <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", iconColor)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.text}</p>
                {item.reason && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" />
                    {isWorked ? "Evidência:" : "Hipótese:"} {item.reason}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className={cn("p-3 rounded-lg border group", bgColor, borderColor)}>
          <div className="flex items-start gap-2">
            <Icon className={cn("h-4 w-4 mt-2 flex-shrink-0", iconColor)} />
            <div className="flex-1 space-y-2">
              <Input
                ref={(el) => { inputRefs.current[index] = el; }}
                value={item.text}
                onChange={(e) => handleTextChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                placeholder={placeholder}
                className="bg-white/80 text-sm"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {isWorked ? "Evidência:" : "Hipótese:"}
                </span>
                <Input
                  value={item.reason || ""}
                  onChange={(e) => handleReasonChange(index, e.target.value)}
                  placeholder={reasonPlaceholder}
                  className="bg-white/80 text-xs h-7 flex-1"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              {onCreateTask && item.text && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                  onClick={() => onCreateTask(item.text)}
                  title="Criar atividade"
                >
                  <ListTodo className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={addItem}
        className={cn(
          "w-full h-8 text-xs border border-dashed",
          isWorked ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : "border-amber-300 text-amber-700 hover:bg-amber-50"
        )}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Adicionar item
      </Button>
    </div>
  );
}

export function DiagnosisSection({
  whatWorked,
  whatDidntWork,
  onChange,
  onCreateTask,
  isEditing = false,
}: DiagnosisSectionProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* O que funcionou */}
      <div>
        <label className="text-sm font-medium mb-3 block flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          O que funcionou (por quê?)
        </label>
        <DiagnosisList
          items={whatWorked}
          onChange={(items) => onChange({ whatWorked: items, whatDidntWork })}
          isEditing={isEditing}
          type="worked"
          placeholder="Ex: Campanha de remarketing teve ótimo desempenho..."
          reasonPlaceholder="Ex: CTR 3x acima da média do segmento"
          onCreateTask={onCreateTask ? (text) => onCreateTask(text, "maintain") : undefined}
        />
      </div>

      {/* O que não funcionou */}
      <div>
        <label className="text-sm font-medium mb-3 block flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          O que não funcionou (por quê?)
        </label>
        <DiagnosisList
          items={whatDidntWork}
          onChange={(items) => onChange({ whatWorked, whatDidntWork: items })}
          isEditing={isEditing}
          type="didnt_work"
          placeholder="Ex: Público frio não converteu como esperado..."
          reasonPlaceholder="Ex: Possível saturação do público"
          onCreateTask={onCreateTask ? (text) => onCreateTask(text, "improvement") : undefined}
        />
      </div>
    </div>
  );
}
