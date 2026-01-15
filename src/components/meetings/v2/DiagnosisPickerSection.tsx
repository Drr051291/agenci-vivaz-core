import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  X, 
  Plus, 
  AlertTriangle,
  TrendingDown,
  Target,
  Activity,
  Zap,
  Image,
  DollarSign,
  Users,
  BarChart3,
  Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";

// Predefined diagnosis tags for common agency issues
const PREDEFINED_TAGS = [
  { id: "creative_fatigue", label: "Fadiga de Criativos", icon: Image, color: "bg-purple-100 text-purple-700 border-purple-200" },
  { id: "low_conversion", label: "Baixa Conversão", icon: TrendingDown, color: "bg-red-100 text-red-700 border-red-200" },
  { id: "high_cpc", label: "CPC Alto", icon: DollarSign, color: "bg-amber-100 text-amber-700 border-amber-200" },
  { id: "tracking_issue", label: "Problema de Tracking", icon: Activity, color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "audience_saturation", label: "Saturação de Público", icon: Users, color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "budget_constraint", label: "Limite de Orçamento", icon: DollarSign, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { id: "low_ctr", label: "CTR Baixo", icon: Target, color: "bg-pink-100 text-pink-700 border-pink-200" },
  { id: "slow_landing", label: "Landing Page Lenta", icon: Zap, color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { id: "seasonality", label: "Sazonalidade", icon: BarChart3, color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { id: "competition", label: "Aumento de Concorrência", icon: AlertTriangle, color: "bg-slate-100 text-slate-700 border-slate-200" },
];

interface DiagnosisItem {
  tagId: string;
  tagLabel: string;
  context: string;
  solution: string;
}

interface DiagnosisPickerSectionProps {
  items: DiagnosisItem[];
  onChange: (items: DiagnosisItem[]) => void;
  isEditing?: boolean;
}

export function DiagnosisPickerSection({ 
  items, 
  onChange, 
  isEditing = false 
}: DiagnosisPickerSectionProps) {
  const [localItems, setLocalItems] = useState<DiagnosisItem[]>(items);
  const [showTagPicker, setShowTagPicker] = useState(false);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const getTagConfig = (tagId: string) => {
    return PREDEFINED_TAGS.find(t => t.id === tagId);
  };

  const addDiagnosis = (tag: typeof PREDEFINED_TAGS[0]) => {
    const newItem: DiagnosisItem = {
      tagId: tag.id,
      tagLabel: tag.label,
      context: "",
      solution: "",
    };
    const updated = [...localItems, newItem];
    setLocalItems(updated);
    onChange(updated);
    setShowTagPicker(false);
  };

  const removeDiagnosis = (index: number) => {
    const updated = localItems.filter((_, i) => i !== index);
    setLocalItems(updated);
    onChange(updated);
  };

  const updateDiagnosis = (index: number, field: keyof DiagnosisItem, value: string) => {
    const updated = [...localItems];
    updated[index] = { ...updated[index], [field]: value };
    setLocalItems(updated);
    onChange(updated);
  };

  // Get available tags (not yet selected)
  const availableTags = PREDEFINED_TAGS.filter(
    tag => !localItems.some(item => item.tagId === tag.id)
  );

  if (!isEditing && localItems.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg bg-muted/30">
        <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Nenhum diagnóstico registrado
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selected Diagnoses */}
      <div className="space-y-4">
        {localItems.map((item, index) => {
          const tagConfig = getTagConfig(item.tagId);
          const TagIcon = tagConfig?.icon || AlertTriangle;

          return (
            <div 
              key={`${item.tagId}-${index}`}
              className={cn(
                "p-4 rounded-lg border-2 transition-all",
                tagConfig?.color || "bg-muted border-muted"
              )}
            >
              {/* Tag Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TagIcon className="h-4 w-4" />
                  <span className="font-medium text-sm">{item.tagLabel}</span>
                </div>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-white/50"
                    onClick={() => removeDiagnosis(index)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* Context & Solution */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium opacity-80 mb-1 block">
                    Contexto Específico
                  </label>
                  {isEditing ? (
                    <Textarea
                      value={item.context}
                      onChange={(e) => updateDiagnosis(index, "context", e.target.value)}
                      placeholder="Descreva o problema específico observado..."
                      className="bg-white/80 text-sm min-h-[60px] resize-none"
                    />
                  ) : (
                    <p className="text-sm bg-white/50 rounded p-2 whitespace-pre-wrap">
                      {item.context || <span className="text-muted-foreground italic">Não especificado</span>}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium opacity-80 mb-1 block flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />
                    Solução Proposta
                  </label>
                  {isEditing ? (
                    <Textarea
                      value={item.solution}
                      onChange={(e) => updateDiagnosis(index, "solution", e.target.value)}
                      placeholder="Qual ação será tomada para resolver..."
                      className="bg-white/80 text-sm min-h-[60px] resize-none"
                    />
                  ) : (
                    <p className="text-sm bg-white/50 rounded p-2 whitespace-pre-wrap">
                      {item.solution || <span className="text-muted-foreground italic">Não definida</span>}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tag Picker */}
      {isEditing && (
        <div className="space-y-3">
          {showTagPicker ? (
            <div className="p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
              <p className="text-sm font-medium mb-3">Selecione um diagnóstico:</p>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => {
                  const TagIcon = tag.icon;
                  return (
                    <Button
                      key={tag.id}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 text-xs border-2 transition-all hover:scale-105",
                        tag.color
                      )}
                      onClick={() => addDiagnosis(tag)}
                    >
                      <TagIcon className="h-3.5 w-3.5 mr-1.5" />
                      {tag.label}
                    </Button>
                  );
                })}
                {availableTags.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    Todos os diagnósticos já foram selecionados
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => setShowTagPicker(false)}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed"
              onClick={() => setShowTagPicker(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Adicionar Diagnóstico
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
