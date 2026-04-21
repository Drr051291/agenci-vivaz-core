import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar as CalendarIcon, MoreVertical, ExternalLink, Trash2, Building2, User } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { ActionPlanTask, bucketStatus } from "@/hooks/useMeetingActionPlan";
import { TASK_CATEGORIES, getPriorityColor, getPriorityLabel } from "@/lib/taskCategories";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ActionCardProps {
  task: ActionPlanTask;
  onOpen?: (task: ActionPlanTask) => void;
  onRemove?: (task: ActionPlanTask) => void;
  onDeleteTask?: (task: ActionPlanTask) => void;
  readOnly?: boolean;
  compact?: boolean;
  dragHandleProps?: any;
  isDragging?: boolean;
}

const PRIORITY_BAR: Record<string, string> = {
  low: "bg-blue-500",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function ActionCard({ task, onOpen, onRemove, onDeleteTask, readOnly, compact, dragHandleProps, isDragging }: ActionCardProps) {
  const priorityKey = (task.priority || "medium").toLowerCase();
  const barColor = PRIORITY_BAR[priorityKey] || PRIORITY_BAR.medium;

  let dueLabel: string | null = null;
  let dueClass = "text-muted-foreground";
  if (task.due_date) {
    try {
      const d = parseLocalDate(task.due_date);
      dueLabel = format(d, "dd MMM", { locale: ptBR });
      const bucket = bucketStatus(task.status);
      if (bucket !== "concluido") {
        if (isPast(d) && !isToday(d)) dueClass = "text-destructive font-medium";
        else if (isToday(d)) dueClass = "text-amber-600 font-medium";
      }
    } catch {}
  }

  const categoryLabel = task.category ? TASK_CATEGORIES[task.category as keyof typeof TASK_CATEGORIES] || task.category : null;

  return (
    <Card
      className={cn(
        "relative overflow-hidden group transition-all",
        "hover:shadow-md hover:border-primary/30",
        isDragging && "opacity-50 rotate-2",
        bucketStatus(task.status) === "concluido" && "opacity-75"
      )}
    >
      {/* Priority bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", barColor)} />

      <div className={cn("p-3 pl-4", compact && "p-2 pl-3")}>
        {/* Top row: badges + menu */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-1 min-w-0">
            {task.owner_type && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 font-normal">
                {task.owner_type === "client" ? (
                  <>
                    <User className="h-2.5 w-2.5" />
                    Cliente
                  </>
                ) : (
                  <>
                    <Building2 className="h-2.5 w-2.5" />
                    Vivaz
                  </>
                )}
              </Badge>
            )}
            {categoryLabel && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                {categoryLabel}
              </Badge>
            )}
            {task.priority && (
              <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 font-normal", getPriorityColor(priorityKey))}>
                {getPriorityLabel(priorityKey)}
              </Badge>
            )}
          </div>
          {!readOnly && (
            <div className="flex items-center gap-0.5 shrink-0">
              {dragHandleProps && (
                <button
                  {...dragHandleProps}
                  className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Arrastar"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onOpen && (
                    <DropdownMenuItem onClick={() => onOpen(task)}>
                      <ExternalLink className="h-3.5 w-3.5 mr-2" />
                      Abrir atividade
                    </DropdownMenuItem>
                  )}
                  {onRemove && (
                    <DropdownMenuItem onClick={() => onRemove(task)}>
                      Remover do plano
                    </DropdownMenuItem>
                  )}
                  {onDeleteTask && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onDeleteTask(task)} className="text-destructive">
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Excluir atividade
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Title */}
        <button
          onClick={() => onOpen?.(task)}
          className={cn(
            "text-left text-sm font-medium leading-snug w-full hover:text-primary transition-colors",
            bucketStatus(task.status) === "concluido" && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </button>

        {/* Bottom row: due + assignee */}
        {(dueLabel || task.assignee_name) && (
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/50">
            {dueLabel ? (
              <span className={cn("text-xs flex items-center gap-1", dueClass)}>
                <CalendarIcon className="h-3 w-3" />
                {dueLabel}
              </span>
            ) : (
              <span />
            )}
            {task.assignee_name && (
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {getInitials(task.assignee_name)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
