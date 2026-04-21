import { useMemo } from "react";
import { ActionCard } from "./ActionCard";
import { ActionPlanTask } from "@/hooks/useMeetingActionPlan";
import { Building2, User } from "lucide-react";

interface ActionPlanListProps {
  tasks: ActionPlanTask[];
  onOpenTask?: (task: ActionPlanTask) => void;
  onRemove?: (task: ActionPlanTask) => void;
  onDeleteTask?: (task: ActionPlanTask) => void;
  readOnly?: boolean;
}

export function ActionPlanList({ tasks, onOpenTask, onRemove, onDeleteTask, readOnly }: ActionPlanListProps) {
  const { vivaz, client } = useMemo(() => {
    const v: ActionPlanTask[] = [];
    const c: ActionPlanTask[] = [];
    tasks.forEach((t) => {
      if (t.owner_type === "client") c.push(t);
      else v.push(t);
    });
    return { vivaz: v, client: c };
  }, [tasks]);

  const Group = ({ title, icon, items }: { title: string; icon: React.ReactNode; items: ActionPlanTask[] }) => (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic px-2 py-3">Sem atividades</p>
      ) : (
        <div className="space-y-2">
          {items.map((t) => (
            <ActionCard
              key={t.id}
              task={t}
              onOpen={onOpenTask}
              onRemove={onRemove}
              onDeleteTask={onDeleteTask}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Group title="Da Vivaz" icon={<Building2 className="h-4 w-4 text-primary" />} items={vivaz} />
      <Group title="Do Cliente" icon={<User className="h-4 w-4 text-muted-foreground" />} items={client} />
    </div>
  );
}
