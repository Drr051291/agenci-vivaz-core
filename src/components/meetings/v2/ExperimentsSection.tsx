import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ListTodo, ArrowUpDown, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface Experiment {
  id?: string;
  idea: string;
  objective: string;
  how_to_measure: string;
  effort: "P" | "M" | "G" | "";
  impact: "low" | "medium" | "high" | "";
  responsible_name?: string;
  deadline?: string;
  task_id?: string;
}

interface ExperimentsSectionProps {
  experiments: Experiment[];
  onChange: (experiments: Experiment[]) => void;
  onCreateTask?: (experiment: Experiment) => void;
  isEditing?: boolean;
}

const EFFORT_OPTIONS = [
  { value: "P", label: "P", description: "Pequeno" },
  { value: "M", label: "M", description: "Médio" },
  { value: "G", label: "G", description: "Grande" },
];

const IMPACT_OPTIONS = [
  { value: "low", label: "Baixo", color: "bg-blue-100 text-blue-700" },
  { value: "medium", label: "Médio", color: "bg-amber-100 text-amber-700" },
  { value: "high", label: "Alto", color: "bg-emerald-100 text-emerald-700" },
];

export function ExperimentsSection({ 
  experiments, 
  onChange, 
  onCreateTask,
  isEditing = false 
}: ExperimentsSectionProps) {
  const [localExperiments, setLocalExperiments] = useState<Experiment[]>(experiments);
  const [sortBy, setSortBy] = useState<"impact" | "effort" | null>(null);

  useEffect(() => {
    setLocalExperiments(experiments);
  }, [experiments]);

  const handleChange = (index: number, field: keyof Experiment, value: string) => {
    const updated = [...localExperiments];
    updated[index] = { ...updated[index], [field]: value };
    setLocalExperiments(updated);
    onChange(updated);
  };

  const addExperiment = () => {
    const newExperiment: Experiment = {
      idea: "",
      objective: "",
      how_to_measure: "",
      effort: "",
      impact: "",
    };
    const updated = [...localExperiments, newExperiment];
    setLocalExperiments(updated);
    onChange(updated);
  };

  const removeExperiment = (index: number) => {
    const updated = localExperiments.filter((_, i) => i !== index);
    setLocalExperiments(updated);
    onChange(updated);
  };

  const getSortedExperiments = () => {
    if (!sortBy) return localExperiments;
    
    return [...localExperiments].sort((a, b) => {
      if (sortBy === "impact") {
        const impactOrder = { high: 0, medium: 1, low: 2, "": 3 };
        return impactOrder[a.impact || ""] - impactOrder[b.impact || ""];
      }
      if (sortBy === "effort") {
        const effortOrder = { P: 0, M: 1, G: 2, "": 3 };
        return effortOrder[a.effort || ""] - effortOrder[b.effort || ""];
      }
      return 0;
    });
  };

  const getImpactConfig = (impact: string) => {
    return IMPACT_OPTIONS.find(o => o.value === impact);
  };

  if (!isEditing && localExperiments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FlaskConical className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nenhum experimento planejado</p>
      </div>
    );
  }

  const displayExperiments = getSortedExperiments();

  return (
    <div className="space-y-4">
      {/* Sort controls */}
      {localExperiments.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Ordenar por:</span>
          <Button
            variant={sortBy === "impact" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSortBy(sortBy === "impact" ? null : "impact")}
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            Impacto
          </Button>
          <Button
            variant={sortBy === "effort" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSortBy(sortBy === "effort" ? null : "effort")}
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            Esforço
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
          <div className="col-span-3">Ideia / Experimento</div>
          <div className="col-span-2">Objetivo</div>
          <div className="col-span-2">Como medir</div>
          <div className="col-span-1 text-center">Esforço</div>
          <div className="col-span-1 text-center">Impacto</div>
          <div className="col-span-1">Resp.</div>
          <div className="col-span-1">Prazo</div>
          {isEditing && <div className="col-span-1"></div>}
        </div>

        {/* Rows */}
        <div className="divide-y">
          {displayExperiments.map((exp, index) => {
            const impactConfig = getImpactConfig(exp.impact);

            return (
              <div 
                key={index} 
                className="grid grid-cols-12 gap-1 px-3 py-2 items-center text-sm group"
              >
                {/* Idea */}
                <div className="col-span-3">
                  {isEditing ? (
                    <Input
                      value={exp.idea}
                      onChange={(e) => handleChange(index, "idea", e.target.value)}
                      placeholder="Ex: Testar vídeos curtos..."
                      className="h-8 text-sm"
                    />
                  ) : (
                    <span className="font-medium">{exp.idea || "—"}</span>
                  )}
                </div>

                {/* Objective */}
                <div className="col-span-2">
                  {isEditing ? (
                    <Input
                      value={exp.objective}
                      onChange={(e) => handleChange(index, "objective", e.target.value)}
                      placeholder="Aumentar CTR..."
                      className="h-8 text-xs"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">{exp.objective || "—"}</span>
                  )}
                </div>

                {/* How to measure */}
                <div className="col-span-2">
                  {isEditing ? (
                    <Input
                      value={exp.how_to_measure}
                      onChange={(e) => handleChange(index, "how_to_measure", e.target.value)}
                      placeholder="CTR > 2%..."
                      className="h-8 text-xs"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">{exp.how_to_measure || "—"}</span>
                  )}
                </div>

                {/* Effort */}
                <div className="col-span-1 text-center">
                  {isEditing ? (
                    <Select
                      value={exp.effort}
                      onValueChange={(value) => handleChange(index, "effort", value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {EFFORT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded",
                      exp.effort === "P" && "bg-green-100 text-green-700",
                      exp.effort === "M" && "bg-amber-100 text-amber-700",
                      exp.effort === "G" && "bg-red-100 text-red-700"
                    )}>
                      {exp.effort || "—"}
                    </span>
                  )}
                </div>

                {/* Impact */}
                <div className="col-span-1 text-center">
                  {isEditing ? (
                    <Select
                      value={exp.impact}
                      onValueChange={(value) => handleChange(index, "impact", value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {IMPACT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    impactConfig ? (
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded", impactConfig.color)}>
                        {impactConfig.label}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )
                  )}
                </div>

                {/* Responsible */}
                <div className="col-span-1">
                  {isEditing ? (
                    <Input
                      value={exp.responsible_name || ""}
                      onChange={(e) => handleChange(index, "responsible_name", e.target.value)}
                      placeholder="Nome..."
                      className="h-8 text-xs"
                    />
                  ) : (
                    <span className="text-xs">{exp.responsible_name || "—"}</span>
                  )}
                </div>

                {/* Deadline */}
                <div className="col-span-1">
                  {isEditing ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-8 w-full justify-start text-xs font-normal"
                        >
                          {exp.deadline 
                            ? format(new Date(exp.deadline), "dd/MM", { locale: ptBR })
                            : "—"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={exp.deadline ? new Date(exp.deadline) : undefined}
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
                    <span className="text-xs">
                      {exp.deadline 
                        ? format(new Date(exp.deadline), "dd/MM", { locale: ptBR })
                        : "—"}
                    </span>
                  )}
                </div>

                {/* Actions */}
                {isEditing && (
                  <div className="col-span-1 flex justify-end gap-1">
                    {onCreateTask && exp.idea && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                        onClick={() => onCreateTask(exp)}
                        title="Criar atividade"
                      >
                        <ListTodo className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => removeExperiment(index)}
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
              onClick={addExperiment}
              className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar experimento
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
