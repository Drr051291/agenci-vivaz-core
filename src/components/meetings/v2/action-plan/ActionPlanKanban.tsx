import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { ActionCard } from "./ActionCard";
import { ActionPlanTask, bucketStatus, COLUMN_STATUSES, ColumnStatus } from "@/hooks/useMeetingActionPlan";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ActionPlanKanbanProps {
  tasks: ActionPlanTask[];
  onUpdateStatus: (taskId: string, newStatus: ColumnStatus) => void;
  onOpenTask?: (task: ActionPlanTask) => void;
  onRemove?: (task: ActionPlanTask) => void;
  onDeleteTask?: (task: ActionPlanTask) => void;
  readOnly?: boolean;
}

function DraggableCard({ task, ...rest }: { task: ActionPlanTask } & React.ComponentProps<typeof ActionCard>) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled: rest.readOnly,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn("touch-none", !rest.readOnly && "cursor-grab active:cursor-grabbing")}
    >
      <ActionCard task={task} {...rest} isDragging={isDragging} />
    </div>
  );
}

function KanbanColumn({
  status,
  label,
  color,
  tasks,
  children,
}: {
  status: ColumnStatus;
  label: string;
  color: string;
  tasks: ActionPlanTask[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col min-w-[280px] flex-1">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-xs font-medium", color)}>
            {label}
          </Badge>
          <span className="text-xs text-muted-foreground">{tasks.length}</span>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-lg p-2 space-y-2 min-h-[200px] transition-colors",
          "bg-muted/30 border border-dashed border-transparent",
          isOver && "bg-primary/5 border-primary/30"
        )}
      >
        {children}
        {tasks.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8 italic">Sem atividades</p>
        )}
      </div>
    </div>
  );
}

export function ActionPlanKanban({ tasks, onUpdateStatus, onOpenTask, onRemove, onDeleteTask, readOnly }: ActionPlanKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(() => {
    const acc: Record<ColumnStatus, ActionPlanTask[]> = { pendente: [], em_andamento: [], concluido: [] };
    tasks.forEach((t) => {
      acc[bucketStatus(t.status)].push(t);
    });
    return acc;
  }, [tasks]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const newStatus = e.over.id as ColumnStatus;
    const taskId = String(e.active.id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (bucketStatus(task.status) !== newStatus) {
      onUpdateStatus(taskId, newStatus);
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMN_STATUSES.map((col) => (
          <KanbanColumn key={col.value} status={col.value} label={col.label} color={col.color} tasks={grouped[col.value]}>
            {grouped[col.value].map((t) => (
              <DraggableCard
                key={t.id}
                task={t}
                onOpen={onOpenTask}
                onRemove={onRemove}
                onDeleteTask={onDeleteTask}
                readOnly={readOnly}
              />
            ))}
          </KanbanColumn>
        ))}
      </div>
      <DragOverlay>{activeTask && <ActionCard task={activeTask} readOnly />}</DragOverlay>
    </DndContext>
  );
}
