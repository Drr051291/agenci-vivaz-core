import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, AlertTriangle, Trophy, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutiveSummarySectionProps {
  periodHighlights: string[];
  mainWins: string[];
  mainRisks: string[];
  nextPriority: string;
  onChange: (data: {
    periodHighlights: string[];
    mainWins: string[];
    mainRisks: string[];
    nextPriority: string;
  }) => void;
  isEditing?: boolean;
}

const PRIORITY_OPTIONS = [
  { value: "crescimento", label: "Crescimento" },
  { value: "eficiencia", label: "Eficiência" },
  { value: "retencao", label: "Retenção" },
  { value: "aquisicao", label: "Aquisição" },
  { value: "conversao", label: "Conversão" },
  { value: "receita", label: "Receita" },
];

interface BulletListProps {
  items: string[];
  onChange: (items: string[]) => void;
  isEditing: boolean;
  max: number;
  placeholder: string;
  emptyText: string;
  icon?: React.ReactNode;
  iconColor?: string;
}

function BulletList({ items, onChange, isEditing, max, placeholder, emptyText, icon, iconColor }: BulletListProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  };

  const addItem = () => {
    if (items.length >= max) return;
    const updated = [...items, ""];
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
      if (items.length < max) addItem();
    }
    if (e.key === "Backspace" && items[index] === "" && index > 0) {
      e.preventDefault();
      removeItem(index);
      inputRefs.current[index - 1]?.focus();
    }
  };

  if (!isEditing) {
    const filtered = items.filter(Boolean);
    if (filtered.length === 0) {
      return <p className="text-sm text-muted-foreground italic">{emptyText}</p>;
    }
    return (
      <ul className="space-y-1.5">
        {filtered.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm">
            <span className={cn("mt-0.5", iconColor)}>{icon}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-1.5">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2 group">
          <span className={cn("flex-shrink-0", iconColor)}>{icon}</span>
          <Input
            ref={(el) => { inputRefs.current[index] = el; }}
            value={item}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            placeholder={placeholder}
            className="flex-1 h-8 text-sm"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            onClick={() => removeItem(index)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      {items.length < max && (
        <Button
          variant="ghost"
          size="sm"
          onClick={addItem}
          className="h-7 text-xs text-muted-foreground hover:text-foreground w-full justify-start pl-7"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Adicionar ({items.length}/{max})
        </Button>
      )}
    </div>
  );
}

export function ExecutiveSummarySection({
  periodHighlights,
  mainWins,
  mainRisks,
  nextPriority,
  onChange,
  isEditing = false,
}: ExecutiveSummarySectionProps) {
  const totalItems = periodHighlights.filter(Boolean).length + mainWins.filter(Boolean).length + mainRisks.filter(Boolean).length;
  const maxItems = 7;
  const progress = Math.round((totalItems / maxItems) * 100);

  return (
    <div className="space-y-5">
      {/* Progress indicator */}
      {isEditing && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <div className="flex-1">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  progress >= 70 ? "bg-emerald-500" : progress >= 40 ? "bg-amber-500" : "bg-muted-foreground/30"
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {totalItems}/{maxItems} pontos
          </span>
        </div>
      )}

      {/* O que aconteceu no período */}
      <div>
        <label className="text-sm font-medium mb-2 block flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          O que aconteceu no período
          <span className="text-xs text-muted-foreground font-normal">(max 3)</span>
        </label>
        <BulletList
          items={periodHighlights}
          onChange={(items) => onChange({ periodHighlights: items, mainWins, mainRisks, nextPriority })}
          isEditing={isEditing}
          max={3}
          placeholder="Ex: Lançamos nova campanha de remarketing..."
          emptyText="Adicione os principais acontecimentos do período"
          icon={<div className="h-1.5 w-1.5 rounded-full bg-primary" />}
          iconColor="text-primary"
        />
      </div>

      {/* Principais vitórias */}
      <div>
        <label className="text-sm font-medium mb-2 block flex items-center gap-2">
          <Trophy className="h-4 w-4 text-emerald-600" />
          Principais vitórias
          <span className="text-xs text-muted-foreground font-normal">(max 2)</span>
        </label>
        <BulletList
          items={mainWins}
          onChange={(items) => onChange({ periodHighlights, mainWins: items, mainRisks, nextPriority })}
          isEditing={isEditing}
          max={2}
          placeholder="Ex: Redução de 30% no CPL..."
          emptyText="Destaque as principais conquistas"
          icon={<Trophy className="h-3.5 w-3.5" />}
          iconColor="text-emerald-600"
        />
      </div>

      {/* Principais riscos */}
      <div>
        <label className="text-sm font-medium mb-2 block flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Principais riscos / atenção
          <span className="text-xs text-muted-foreground font-normal">(max 2)</span>
        </label>
        <BulletList
          items={mainRisks}
          onChange={(items) => onChange({ periodHighlights, mainWins, mainRisks: items, nextPriority })}
          isEditing={isEditing}
          max={2}
          placeholder="Ex: Taxa de conversão do site abaixo da meta..."
          emptyText="Aponte riscos e pontos de atenção"
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          iconColor="text-amber-600"
        />
      </div>

      {/* Prioridade do próximo período */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Prioridade do próximo período
        </label>
        {isEditing ? (
          <Select
            value={nextPriority}
            onValueChange={(value) => onChange({ periodHighlights, mainWins, mainRisks, nextPriority: value })}
          >
            <SelectTrigger className="w-full max-w-xs h-9">
              <SelectValue placeholder="Selecione a prioridade..." />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm">
            {PRIORITY_OPTIONS.find(p => p.value === nextPriority)?.label || (
              <span className="text-muted-foreground italic">Não definida</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
