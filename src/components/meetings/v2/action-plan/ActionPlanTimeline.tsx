import { useMemo } from "react";
import { ActionPlanTask } from "@/hooks/useMeetingActionPlan";
import { ActionCard } from "./ActionCard";
import { format, startOfWeek, addWeeks, isWithinInterval, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/dateUtils";
import { CalendarX } from "lucide-react";

interface ActionPlanTimelineProps {
  tasks: ActionPlanTask[];
  onOpenTask?: (task: ActionPlanTask) => void;
  onRemove?: (task: ActionPlanTask) => void;
  onDeleteTask?: (task: ActionPlanTask) => void;
  readOnly?: boolean;
}

export function ActionPlanTimeline({ tasks, onOpenTask, onRemove, onDeleteTask, readOnly }: ActionPlanTimelineProps) {
  const { weeks, noDate } = useMemo(() => {
    const dated = tasks
      .map((t) => {
        if (!t.due_date) return null;
        try {
          return { task: t, date: parseLocalDate(t.due_date) };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as { task: ActionPlanTask; date: Date }[];

    const noDate = tasks.filter((t) => !t.due_date);
    if (dated.length === 0) return { weeks: [], noDate };

    dated.sort((a, b) => a.date.getTime() - b.date.getTime());
    const minDate = dated[0].date;
    const maxDate = dated[dated.length - 1].date;
    const start = startOfWeek(minDate, { weekStartsOn: 1 });

    const weeksList: { label: string; start: Date; end: Date; tasks: ActionPlanTask[] }[] = [];
    let cursor = start;
    while (cursor <= maxDate) {
      const end = endOfWeek(cursor, { weekStartsOn: 1 });
      const tasksOfWeek = dated
        .filter(({ date }) => isWithinInterval(date, { start: cursor, end }))
        .map(({ task }) => task);
      weeksList.push({
        label: `${format(cursor, "dd MMM", { locale: ptBR })} - ${format(end, "dd MMM", { locale: ptBR })}`,
        start: cursor,
        end,
        tasks: tasksOfWeek,
      });
      cursor = addWeeks(cursor, 1);
    }
    return { weeks: weeksList, noDate };
  }, [tasks]);

  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground italic text-center py-8">Adicione atividades para visualizar a timeline</p>;
  }

  return (
    <div className="space-y-4">
      {weeks.map((w) => (
        <div key={w.label} className="border-l-2 border-primary/20 pl-4 relative">
          <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-primary" />
          <h4 className="text-sm font-medium mb-2">{w.label}</h4>
          {w.tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Sem atividades nessa semana</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {w.tasks.map((t) => (
                <ActionCard
                  key={t.id}
                  task={t}
                  onOpen={onOpenTask}
                  onRemove={onRemove}
                  onDeleteTask={onDeleteTask}
                  readOnly={readOnly}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {noDate.length > 0 && (
        <div className="border-l-2 border-muted pl-4 relative">
          <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-muted-foreground/40" />
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5 text-muted-foreground">
            <CalendarX className="h-3.5 w-3.5" />
            Sem prazo definido
          </h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {noDate.map((t) => (
              <ActionCard
                key={t.id}
                task={t}
                onOpen={onOpenTask}
                onRemove={onRemove}
                onDeleteTask={onDeleteTask}
                readOnly={readOnly}
                compact
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
