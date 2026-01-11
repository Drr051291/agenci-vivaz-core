import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Metric {
  id?: string;
  metric_key: string;
  metric_label: string;
  target_value: number | null;
  actual_value: number | null;
  unit: string;
}

interface MetricsSectionProps {
  metrics: Metric[];
  onChange: (metrics: Metric[]) => void;
  isEditing?: boolean;
}

const UNIT_OPTIONS = [
  { value: "", label: "Número" },
  { value: "R$", label: "R$ (Moeda)" },
  { value: "%", label: "% (Percentual)" },
  { value: "x", label: "x (Multiplicador)" },
  { value: "un", label: "un (Unidades)" },
  { value: "h", label: "h (Horas)" },
  { value: "dias", label: "dias" },
];

const DEFAULT_METRICS = [
  { metric_key: "investimento", metric_label: "Investimento", unit: "R$" },
  { metric_key: "leads", metric_label: "Leads", unit: "" },
  { metric_key: "cpl", metric_label: "CPL", unit: "R$" },
  { metric_key: "conversao", metric_label: "Taxa de Conversão", unit: "%" },
  { metric_key: "roas", metric_label: "ROAS", unit: "x" },
  { metric_key: "receita", metric_label: "Receita", unit: "R$" },
];

export function MetricsSection({ metrics, onChange, isEditing = false }: MetricsSectionProps) {
  const [localMetrics, setLocalMetrics] = useState<Metric[]>(metrics);

  useEffect(() => {
    if (metrics.length === 0 && isEditing) {
      const initial = DEFAULT_METRICS.map(m => ({
        ...m,
        target_value: null,
        actual_value: null,
      }));
      setLocalMetrics(initial);
      onChange(initial);
    } else {
      setLocalMetrics(metrics);
    }
  }, [metrics]);

  const handleChange = (index: number, field: keyof Metric, value: string | number | null) => {
    const updated = [...localMetrics];
    if (field === "target_value" || field === "actual_value") {
      updated[index][field] = value === "" ? null : Number(value);
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setLocalMetrics(updated);
    onChange(updated);
  };

  const addMetric = () => {
    const newMetric: Metric = {
      metric_key: `custom_${Date.now()}`,
      metric_label: "Novo KPI",
      target_value: null,
      actual_value: null,
      unit: "",
    };
    const updated = [...localMetrics, newMetric];
    setLocalMetrics(updated);
    onChange(updated);
  };

  const removeMetric = (index: number) => {
    const updated = localMetrics.filter((_, i) => i !== index);
    setLocalMetrics(updated);
    onChange(updated);
  };

  const calculateVariation = (target: number | null, actual: number | null) => {
    if (target === null || actual === null || target === 0) return null;
    return ((actual - target) / target * 100).toFixed(1);
  };

  if (!isEditing && localMetrics.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Nenhum KPI definido</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className={cn(
        "grid gap-2 text-xs font-medium text-muted-foreground px-2",
        isEditing ? "grid-cols-[1fr_80px_100px_100px_80px_40px]" : "grid-cols-12"
      )}>
        <div className={isEditing ? "" : "col-span-4"}>KPI</div>
        {isEditing && <div className="text-center">Unidade</div>}
        <div className={isEditing ? "text-right" : "col-span-2 text-right"}>Meta</div>
        <div className={isEditing ? "text-right" : "col-span-2 text-right"}>Realizado</div>
        <div className={isEditing ? "text-right" : "col-span-2 text-right"}>Variação</div>
        {isEditing && <div></div>}
      </div>

      {/* Rows */}
      {localMetrics.map((metric, index) => {
        const variation = calculateVariation(metric.target_value, metric.actual_value);
        const isPositive = variation !== null && parseFloat(variation) > 0;
        const isNegative = variation !== null && parseFloat(variation) < 0;

        const formatValue = (value: number | null) => {
          if (value === null) return "—";
          const formatted = value.toLocaleString('pt-BR');
          if (metric.unit === "R$") return `R$ ${formatted}`;
          if (metric.unit === "%") return `${formatted}%`;
          if (metric.unit === "x") return `${formatted}x`;
          if (metric.unit) return `${formatted} ${metric.unit}`;
          return formatted;
        };

        return (
          <div 
            key={metric.metric_key} 
            className={cn(
              "grid gap-2 items-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors",
              isEditing ? "grid-cols-[1fr_80px_100px_100px_80px_40px]" : "grid-cols-12"
            )}
          >
            {/* Label */}
            <div className={isEditing ? "" : "col-span-4"}>
              {isEditing ? (
                <Input
                  value={metric.metric_label}
                  onChange={(e) => handleChange(index, "metric_label", e.target.value)}
                  className="h-8 text-sm"
                />
              ) : (
                <span className="text-sm font-medium">{metric.metric_label}</span>
              )}
            </div>

            {/* Unit Selector - only in edit mode */}
            {isEditing && (
              <div>
                <Select
                  value={metric.unit}
                  onValueChange={(value) => handleChange(index, "unit", value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Un." />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value || "none"}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Target */}
            <div className={isEditing ? "" : "col-span-2"}>
              {isEditing ? (
                <Input
                  type="number"
                  value={metric.target_value ?? ""}
                  onChange={(e) => handleChange(index, "target_value", e.target.value)}
                  className="h-8 text-sm text-right"
                  placeholder="—"
                />
              ) : (
                <span className="text-sm text-right block text-muted-foreground">
                  {formatValue(metric.target_value)}
                </span>
              )}
            </div>

            {/* Actual */}
            <div className={isEditing ? "" : "col-span-2"}>
              {isEditing ? (
                <Input
                  type="number"
                  value={metric.actual_value ?? ""}
                  onChange={(e) => handleChange(index, "actual_value", e.target.value)}
                  className="h-8 text-sm text-right"
                  placeholder="—"
                />
              ) : (
                <span className="text-sm text-right block font-medium">
                  {formatValue(metric.actual_value)}
                </span>
              )}
            </div>

            {/* Variation */}
            <div className={cn(
              "flex items-center justify-end gap-1",
              !isEditing && "col-span-2"
            )}>
              {variation !== null ? (
                <span className={cn(
                  "text-sm font-medium flex items-center gap-1",
                  isPositive && "text-emerald-600",
                  isNegative && "text-red-600",
                  !isPositive && !isNegative && "text-muted-foreground"
                )}>
                  {isPositive && <TrendingUp className="h-3.5 w-3.5" />}
                  {isNegative && <TrendingDown className="h-3.5 w-3.5" />}
                  {!isPositive && !isNegative && <Minus className="h-3.5 w-3.5" />}
                  {isPositive && "+"}{variation}%
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>

            {/* Actions */}
            {isEditing && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeMetric(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {/* Add Button */}
      {isEditing && (
        <Button
          variant="outline"
          size="sm"
          onClick={addMetric}
          className="w-full mt-2"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Adicionar KPI
        </Button>
      )}
    </div>
  );
}
