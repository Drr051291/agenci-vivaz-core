import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface Insight {
  text: string;
  impact: "high" | "medium" | "low";
  evidence?: string;
}

interface InsightsSectionProps {
  insights: Insight[];
  onChange: (insights: Insight[]) => void;
  isEditing?: boolean;
}

const IMPACT_CONFIG = {
  high: { label: "Alto impacto", className: "bg-red-50 text-red-700 border-red-200" },
  medium: { label: "Médio impacto", className: "bg-amber-50 text-amber-700 border-amber-200" },
  low: { label: "Baixo impacto", className: "bg-blue-50 text-blue-700 border-blue-200" },
};

export function InsightsSection({ insights, onChange, isEditing = false }: InsightsSectionProps) {
  const [localInsights, setLocalInsights] = useState<Insight[]>(insights);

  useEffect(() => {
    setLocalInsights(insights);
  }, [insights]);

  const handleChange = (index: number, field: keyof Insight, value: string) => {
    const updated = [...localInsights];
    updated[index] = { ...updated[index], [field]: value };
    setLocalInsights(updated);
    onChange(updated);
  };

  const addInsight = () => {
    const newInsight: Insight = {
      text: "",
      impact: "medium",
      evidence: "",
    };
    const updated = [...localInsights, newInsight];
    setLocalInsights(updated);
    onChange(updated);
  };

  const removeInsight = (index: number) => {
    const updated = localInsights.filter((_, i) => i !== index);
    setLocalInsights(updated);
    onChange(updated);
  };

  if (!isEditing && localInsights.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nenhum insight registrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {localInsights.map((insight, index) => (
        <div key={index} className="p-4 rounded-lg border bg-card">
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Textarea
                  value={insight.text}
                  onChange={(e) => handleChange(index, "text", e.target.value)}
                  placeholder="Descreva o insight..."
                  className="flex-1 min-h-[80px]"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => removeInsight(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Impacto</label>
                  <Select
                    value={insight.impact}
                    onValueChange={(value) => handleChange(index, "impact", value)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Alto impacto</SelectItem>
                      <SelectItem value="medium">Médio impacto</SelectItem>
                      <SelectItem value="low">Baixo impacto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Evidência (opcional)</label>
                  <Input
                    value={insight.evidence || ""}
                    onChange={(e) => handleChange(index, "evidence", e.target.value)}
                    placeholder="Ex: Relatório GA4, dados de CRM..."
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start gap-3 mb-2">
                <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm flex-1">{insight.text}</p>
              </div>
              <div className="flex items-center gap-2 ml-8">
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full border",
                  IMPACT_CONFIG[insight.impact]?.className
                )}>
                  {IMPACT_CONFIG[insight.impact]?.label}
                </span>
                {insight.evidence && (
                  <span className="text-xs text-muted-foreground">
                    Fonte: {insight.evidence}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {isEditing && (
        <Button variant="outline" size="sm" onClick={addInsight} className="w-full">
          <Plus className="h-4 w-4 mr-1.5" />
          Adicionar insight
        </Button>
      )}
    </div>
  );
}
