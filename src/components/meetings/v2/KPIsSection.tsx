import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Metric {
  metric_key: string;
  metric_label: string;
  target_value: number | null;
  actual_value: number | null;
  unit: string;
  quick_note?: string;
}

interface KPIsSectionProps {
  metrics: Metric[];
  highlight: string;
  lowlight: string;
  onChange: (data: { metrics: Metric[]; highlight: string; lowlight: string }) => void;
  isEditing?: boolean;
}

const UNIT_OPTIONS = [
  { value: "", label: "Número" },
  { value: "R$", label: "R$" },
  { value: "%", label: "%" },
  { value: "x", label: "x (multiplicador)" },
  { value: "un", label: "Unidades" },
  { value: "dias", label: "Dias" },
  { value: "h", label: "Horas" },
];

const DEFAULT_KPIS: Metric[] = [
  { metric_key: "investimento", metric_label: "Investimento", target_value: null, actual_value: null, unit: "R$" },
  { metric_key: "leads", metric_label: "Leads", target_value: null, actual_value: null, unit: "" },
  { metric_key: "cpl", metric_label: "CPL", target_value: null, actual_value: null, unit: "R$" },
  { metric_key: "conversoes", metric_label: "Conversões", target_value: null, actual_value: null, unit: "" },
  { metric_key: "cpa", metric_label: "CPA", target_value: null, actual_value: null, unit: "R$" },
  { metric_key: "roas", metric_label: "ROAS", target_value: null, actual_value: null, unit: "x" },
  { metric_key: "receita", metric_label: "Receita", target_value: null, actual_value: null, unit: "R$" },
];

export function KPIsSection({ metrics, highlight, lowlight, onChange, isEditing = false }: KPIsSectionProps) {
  const [localMetrics, setLocalMetrics] = useState<Metric[]>(metrics.length > 0 ? metrics : DEFAULT_KPIS);

  useEffect(() => {
    if (metrics.length === 0 && isEditing) {
      setLocalMetrics(DEFAULT_KPIS);
      onChange({ metrics: DEFAULT_KPIS, highlight, lowlight });
    } else if (metrics.length > 0) {
      setLocalMetrics(metrics);
    }
  }, [metrics]);

  const handleMetricChange = (index: number, field: keyof Metric, value: string | number | null) => {
    const updated = [...localMetrics];
    if (field === "target_value" || field === "actual_value") {
      updated[index][field] = value === "" ? null : Number(value);
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setLocalMetrics(updated);
    onChange({ metrics: updated, highlight, lowlight });
  };

  const addMetric = () => {
    const newMetric: Metric = {
      metric_key: `custom_${Date.now()}`,
      metric_label: "",
      target_value: null,
      actual_value: null,
      unit: "",
    };
    const updated = [...localMetrics, newMetric];
    setLocalMetrics(updated);
    onChange({ metrics: updated, highlight, lowlight });
  };

  const removeMetric = (index: number) => {
    const updated = localMetrics.filter((_, i) => i !== index);
    setLocalMetrics(updated);
    onChange({ metrics: updated, highlight, lowlight });
  };

  const calculateVariation = (target: number | null, actual: number | null) => {
    if (target === null || actual === null || target === 0) return null;
    return ((actual - target) / target * 100);
  };

  const getTrend = (variation: number | null) => {
    if (variation === null) return null;
    if (variation > 2) return "up";
    if (variation < -2) return "down";
    return "stable";
  };

  const formatValue = (value: number | null, unit: string) => {
    if (value === null) return "—";
    const formatted = value.toLocaleString('pt-BR', { 
      minimumFractionDigits: unit === 'x' || unit === '%' ? 2 : 0,
      maximumFractionDigits: unit === 'x' || unit === '%' ? 2 : 0 
    });
    if (unit === 'R$') return `R$ ${formatted}`;
    if (unit === 'x') return `${formatted}x`;
    if (unit === '%') return `${formatted}%`;
    return unit ? `${formatted} ${unit}` : formatted;
  };

  // Identify best and worst performing metrics
  const metricsWithVariation = localMetrics
    .map((m, idx) => ({ ...m, idx, variation: calculateVariation(m.target_value, m.actual_value) }))
    .filter(m => m.variation !== null);
  
  const bestMetric = metricsWithVariation.length > 0 
    ? metricsWithVariation.reduce((a, b) => (a.variation! > b.variation! ? a : b))
    : null;
  const worstMetric = metricsWithVariation.length > 0
    ? metricsWithVariation.reduce((a, b) => (a.variation! < b.variation! ? a : b))
    : null;

  return (
    <div className="space-y-4">
      {/* KPI Table */}
      <div className="rounded-lg border overflow-hidden">
        {/* Header */}
        <div className={cn(
          "grid gap-1 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground",
          isEditing ? "grid-cols-13" : "grid-cols-12"
        )}>
          <div className="col-span-2">Métrica</div>
          {isEditing && <div className="col-span-1">Unidade</div>}
          <div className="col-span-2 text-right">Meta</div>
          <div className="col-span-2 text-right">Realizado</div>
          <div className="col-span-2 text-center">Var.</div>
          <div className="col-span-2">Tend.</div>
          {isEditing && <div className="col-span-1"></div>}
        </div>

        {/* Rows */}
        <div className="divide-y">
          {localMetrics.map((metric, index) => {
            const variation = calculateVariation(metric.target_value, metric.actual_value);
            const trend = getTrend(variation);
            const isBest = bestMetric && bestMetric.idx === index && variation !== null && variation > 0;
            const isWorst = worstMetric && worstMetric.idx === index && variation !== null && variation < 0;

            return (
              <div 
                key={metric.metric_key}
                className={cn(
                  "grid gap-1 px-3 py-2 items-center text-sm transition-colors",
                  isEditing ? "grid-cols-13" : "grid-cols-12",
                  isBest && "bg-emerald-50/50",
                  isWorst && "bg-red-50/50"
                )}
              >
                {/* Label */}
                <div className="col-span-2">
                  {isEditing ? (
                    <Input
                      value={metric.metric_label}
                      onChange={(e) => handleMetricChange(index, "metric_label", e.target.value)}
                      className="h-7 text-sm"
                      placeholder="Nome..."
                    />
                  ) : (
                    <span className="font-medium">{metric.metric_label}</span>
                  )}
                </div>

                {/* Unit Selector (only in edit mode) */}
                {isEditing && (
                  <div className="col-span-1">
                    <Select
                      value={metric.unit}
                      onValueChange={(value) => handleMetricChange(index, "unit", value)}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Target */}
                <div className="col-span-2 text-right">
                  {isEditing ? (
                    <Input
                      type="number"
                      value={metric.target_value ?? ""}
                      onChange={(e) => handleMetricChange(index, "target_value", e.target.value)}
                      className="h-7 text-sm text-right"
                      placeholder="—"
                    />
                  ) : (
                    <span className="text-muted-foreground">
                      {formatValue(metric.target_value, metric.unit)}
                    </span>
                  )}
                </div>

                {/* Actual */}
                <div className="col-span-2 text-right">
                  {isEditing ? (
                    <Input
                      type="number"
                      value={metric.actual_value ?? ""}
                      onChange={(e) => handleMetricChange(index, "actual_value", e.target.value)}
                      className="h-7 text-sm text-right font-medium"
                      placeholder="—"
                    />
                  ) : (
                    <span className="font-medium">
                      {formatValue(metric.actual_value, metric.unit)}
                    </span>
                  )}
                </div>

                {/* Variation */}
                <div className="col-span-2 text-center">
                  {variation !== null ? (
                    <span className={cn(
                      "text-xs font-medium px-1.5 py-0.5 rounded",
                      variation > 0 && "text-emerald-700 bg-emerald-100",
                      variation < 0 && "text-red-700 bg-red-100",
                      variation === 0 && "text-muted-foreground"
                    )}>
                      {variation > 0 && "+"}{variation.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </div>

                {/* Trend */}
                <div className="col-span-2 flex items-center gap-1">
                  {trend === "up" && <TrendingUp className="h-4 w-4 text-emerald-600" />}
                  {trend === "down" && <TrendingDown className="h-4 w-4 text-red-600" />}
                  {trend === "stable" && <Minus className="h-4 w-4 text-muted-foreground" />}
                  {trend === null && <span className="text-muted-foreground text-xs">—</span>}
                </div>

                {/* Actions */}
                {isEditing && (
                  <div className="col-span-1 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeMetric(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add row */}
        {isEditing && (
          <div className="px-3 py-2 border-t bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={addMetric}
              className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar KPI
            </Button>
          </div>
        )}
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <label className="text-xs font-medium text-emerald-800">Maior destaque</label>
          </div>
          {isEditing ? (
            <Input
              value={highlight}
              onChange={(e) => onChange({ metrics: localMetrics, highlight: e.target.value, lowlight })}
              placeholder="Ex: ROAS superou meta em 45%..."
              className="h-8 text-sm bg-white/80 border-emerald-200"
            />
          ) : (
            <p className="text-sm text-emerald-900">
              {highlight || <span className="text-emerald-600 italic">Não informado</span>}
            </p>
          )}
        </div>

        <div className="p-3 rounded-lg bg-red-50 border border-red-100">
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <label className="text-xs font-medium text-red-800">Maior queda</label>
          </div>
          {isEditing ? (
            <Input
              value={lowlight}
              onChange={(e) => onChange({ metrics: localMetrics, highlight, lowlight: e.target.value })}
              placeholder="Ex: CPL subiu 20% vs mês anterior..."
              className="h-8 text-sm bg-white/80 border-red-200"
            />
          ) : (
            <p className="text-sm text-red-900">
              {lowlight || <span className="text-red-600 italic">Não informado</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
