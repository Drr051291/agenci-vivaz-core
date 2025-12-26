import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle2, Clock, Circle, Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface ActionTask {
  id?: string;
  title: string;
  responsible_name: string;
  deadline?: string;
  status: "pending" | "in_progress" | "completed";
  owner_type: "vivaz" | "client";
}

interface ActionPlanSectionProps {
  vivazTasks: ActionTask[];
  clientTasks: ActionTask[];
  onChange: (data: { vivazTasks: ActionTask[]; clientTasks: ActionTask[] }) => void;
  isEditing?: boolean;
  minTasks?: number;
}

const STATUS_CONFIG = {
  pending: { label: "Pendente", icon: Circle, color: "bg-muted text-muted-foreground" },
  in_progress: { label: "Em andamento", icon: Clock, color: "bg-blue-100 text-blue-700" },
  completed: { label: "Concluída", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700" },
};

interface TaskListProps {
  tasks: ActionTask[];
  onChange: (tasks: ActionTask[]) => void;
  isEditing: boolean;
  ownerType: "vivaz" | "client";
  emptyText: string;
}

function TaskList({ tasks, onChange, isEditing, ownerType, emptyText }: TaskListProps) {
  const handleChange = (index: number, field: keyof ActionTask, value: string) => {
    const updated = [...tasks];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addTask = () => {
    const newTask: ActionTask = {
      title: "",
      responsible_name: "",
      status: "pending",
      owner_type: ownerType,
    };
    onChange([...tasks, newTask]);
  };

  const removeTask = (index: number) => {
    onChange(tasks.filter((_, i) => i !== index));
  };

  if (!isEditing && tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic py-4 text-center">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task, index) => {
        const statusConfig = STATUS_CONFIG[task.status];
        const StatusIcon = statusConfig.icon;

        return (
          <div 
            key={index} 
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg border group transition-colors",
              task.status === "completed" && "bg-muted/50"
            )}
          >
            {/* Status indicator */}
            {isEditing ? (
              <Select
                value={task.status}
                onValueChange={(value) => handleChange(index, "status", value)}
              >
                <SelectTrigger className="h-7 w-7 p-0 border-0 bg-transparent">
                  <StatusIcon className={cn("h-4 w-4", statusConfig.color.split(" ")[1])} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <StatusIcon className={cn("h-4 w-4 flex-shrink-0", statusConfig.color.split(" ")[1])} />
            )}

            {/* Title */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <Input
                  value={task.title}
                  onChange={(e) => handleChange(index, "title", e.target.value)}
                  placeholder="Título da atividade..."
                  className={cn(
                    "h-8 text-sm border-0 bg-transparent px-0 focus-visible:ring-0",
                    task.status === "completed" && "line-through text-muted-foreground"
                  )}
                />
              ) : (
                <span className={cn(
                  "text-sm",
                  task.status === "completed" && "line-through text-muted-foreground"
                )}>
                  {task.title || "Sem título"}
                </span>
              )}
            </div>

            {/* Responsible */}
            <div className="w-24 flex-shrink-0">
              {isEditing ? (
                <Input
                  value={task.responsible_name}
                  onChange={(e) => handleChange(index, "responsible_name", e.target.value)}
                  placeholder="Resp."
                  className="h-7 text-xs"
                />
              ) : (
                task.responsible_name && (
                  <span className="text-xs text-muted-foreground">{task.responsible_name}</span>
                )
              )}
            </div>

            {/* Deadline */}
            <div className="w-20 flex-shrink-0">
              {isEditing ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-7 w-full justify-start text-xs font-normal px-2"
                    >
                      {task.deadline 
                        ? format(new Date(task.deadline), "dd/MM", { locale: ptBR })
                        : "Prazo"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={task.deadline ? new Date(task.deadline) : undefined}
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
                task.deadline && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(task.deadline), "dd/MM", { locale: ptBR })}
                  </span>
                )
              )}
            </div>

            {/* Status badge (view mode) */}
            {!isEditing && (
              <Badge variant="outline" className={cn("text-xs", statusConfig.color)}>
                {statusConfig.label}
              </Badge>
            )}

            {/* Remove */}
            {isEditing && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => removeTask(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      })}

      {isEditing && (
        <Button
          variant="ghost"
          size="sm"
          onClick={addTask}
          className="w-full h-8 text-xs text-muted-foreground hover:text-foreground border border-dashed"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Adicionar atividade
        </Button>
      )}
    </div>
  );
}

export function ActionPlanSection({
  vivazTasks,
  clientTasks,
  onChange,
  isEditing = false,
  minTasks = 1,
}: ActionPlanSectionProps) {
  const totalTasks = vivazTasks.length + clientTasks.length;
  const completedTasks = [...vivazTasks, ...clientTasks].filter(t => t.status === "completed").length;
  const hasMinimumTasks = totalTasks >= minTasks;

  return (
    <div className="space-y-6">
      {/* Progress */}
      {totalTasks > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <div className="flex-1">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {completedTasks}/{totalTasks} concluídas
          </span>
        </div>
      )}

      {/* Validation warning */}
      {isEditing && !hasMinimumTasks && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          ⚠️ Adicione pelo menos {minTasks} atividade(s) antes de enviar para aprovação.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Vivaz Tasks */}
        <div>
          <label className="text-sm font-medium mb-3 block flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Da Vivaz
            <span className="text-xs text-muted-foreground font-normal">
              ({vivazTasks.length})
            </span>
          </label>
          <TaskList
            tasks={vivazTasks}
            onChange={(tasks) => onChange({ vivazTasks: tasks, clientTasks })}
            isEditing={isEditing}
            ownerType="vivaz"
            emptyText="Nenhuma atividade da Vivaz"
          />
        </div>

        {/* Client Tasks */}
        <div>
          <label className="text-sm font-medium mb-3 block flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Do Cliente
            <span className="text-xs text-muted-foreground font-normal">
              ({clientTasks.length})
            </span>
          </label>
          <TaskList
            tasks={clientTasks}
            onChange={(tasks) => onChange({ vivazTasks, clientTasks: tasks })}
            isEditing={isEditing}
            ownerType="client"
            emptyText="Nenhuma atividade do cliente"
          />
        </div>
      </div>
    </div>
  );
}
