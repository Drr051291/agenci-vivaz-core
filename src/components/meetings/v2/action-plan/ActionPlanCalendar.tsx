import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarX } from "lucide-react";
import { ActionPlanTask } from "@/hooks/useMeetingActionPlan";
import { parseLocalDate } from "@/lib/dateUtils";
import { format, isSameMonth, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";

interface ActionPlanCalendarProps {
  tasks: ActionPlanTask[];
  initialMonth?: Date;
  readOnly?: boolean;
  onTasksChanged?: () => void;
}

const STATUS_DOT: Record<string, string> = {
  concluido: "bg-emerald-500",
  completed: "bg-emerald-500",
  em_andamento: "bg-blue-500",
  in_progress: "bg-blue-500",
  pendente: "bg-amber-500",
  pending: "bg-amber-500",
};

function dotColor(status: string | null | undefined) {
  if (!status) return "bg-muted-foreground";
  return STATUS_DOT[status.toLowerCase()] || "bg-primary";
}

export function ActionPlanCalendar({ tasks, initialMonth, readOnly, onTasksChanged }: ActionPlanCalendarProps) {
  const [cursor, setCursor] = useState<Date>(() => {
    if (initialMonth) return new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1);
    return new Date();
  });
  const [openTask, setOpenTask] = useState<ActionPlanTask | null>(null);

  const { gridDays, tasksByDay, noDate } = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const startDow = first.getDay();

    const days: ({ day: number; date: Date } | null)[] = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= lastDay; d++) days.push({ day: d, date: new Date(year, month, d) });

    const map: Record<string, ActionPlanTask[]> = {};
    const noDateList: ActionPlanTask[] = [];
    tasks.forEach((t) => {
      if (!t.due_date) {
        noDateList.push(t);
        return;
      }
      try {
        const d = parseLocalDate(t.due_date);
        if (isNaN(d.getTime())) return;
        if (!isSameMonth(d, cursor)) return;
        const key = format(d, "yyyy-MM-dd");
        (map[key] ||= []).push(t);
      } catch {
        /* ignore */
      }
    });

    return { gridDays: days, tasksByDay: map, noDate: noDateList };
  }, [cursor, tasks]);

  const today = new Date();
  const monthLabel = format(cursor, "MMMM 'de' yyyy", { locale: ptBR });

  const taskForDialog = openTask
    ? {
        id: openTask.id,
        title: openTask.title,
        description: openTask.description || "",
        status: openTask.status,
        priority: openTask.priority || "medium",
        due_date: openTask.due_date || undefined,
        category: openTask.category || "outros",
        client_id: openTask.client_id,
        assigned_to: openTask.assigned_to || undefined,
        owner_type: (openTask.owner_type as "vivaz" | "client") || "vivaz",
        profiles: openTask.assignee_name ? { full_name: openTask.assignee_name } : undefined,
      }
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold capitalize">{monthLabel}</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
            {d}
          </div>
        ))}
        {gridDays.map((cell, idx) => {
          if (!cell) return <div key={`e-${idx}`} className="min-h-[110px]" />;
          const key = format(cell.date, "yyyy-MM-dd");
          const dayTasks = tasksByDay[key] || [];
          const isToday = isSameDay(cell.date, today);

          return (
            <Card
              key={key}
              className={cn(
                "min-h-[110px] p-2 flex flex-col gap-1.5 transition-colors hover:bg-accent/30",
                isToday && "ring-2 ring-primary/40 border-primary/40"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs font-semibold inline-flex items-center justify-center h-6 w-6 rounded-full",
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                  )}
                >
                  {cell.day}
                </span>
                {dayTasks.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                    {dayTasks.length}
                  </Badge>
                )}
              </div>
              <div className="flex-1 space-y-1 overflow-hidden">
                {dayTasks.slice(0, 3).map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setOpenTask(t)}
                    className="w-full text-left text-[11px] leading-tight px-1.5 py-1 rounded bg-muted/60 hover:bg-muted transition-colors flex items-start gap-1.5"
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full mt-1 flex-shrink-0", dotColor(t.status))} />
                    <span className="line-clamp-2 flex-1">{t.title}</span>
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <p className="text-[10px] text-muted-foreground text-center pt-0.5">
                    +{dayTasks.length - 3} mais
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Pendente
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" /> Em andamento
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Concluído
        </div>
      </div>

      {noDate.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5 text-muted-foreground">
            <CalendarX className="h-3.5 w-3.5" />
            Atividades sem prazo definido ({noDate.length})
          </h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {noDate.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setOpenTask(t)}
                className="text-left text-xs px-2.5 py-2 rounded border bg-card hover:bg-accent/50 transition-colors flex items-start gap-2"
              >
                <span className={cn("h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0", dotColor(t.status))} />
                <span className="line-clamp-2">{t.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <TaskDetailDialog
        open={!!openTask}
        onOpenChange={(o) => !o && setOpenTask(null)}
        task={taskForDialog as any}
        canEdit={!readOnly}
        onUpdate={() => onTasksChanged?.()}
        onDelete={() => {
          setOpenTask(null);
          onTasksChanged?.();
        }}
      />
    </div>
  );
}