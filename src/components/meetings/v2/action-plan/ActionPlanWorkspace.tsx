import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, KanbanSquare, List as ListIcon, CalendarRange, Loader2 } from "lucide-react";
import { useMeetingActionPlan, ActionPlanTask, bucketStatus } from "@/hooks/useMeetingActionPlan";
import { ActionPlanKanban } from "./ActionPlanKanban";
import { ActionPlanList } from "./ActionPlanList";
import { ActionPlanTimeline } from "./ActionPlanTimeline";
import { QuickCreateTaskForm } from "./QuickCreateTaskForm";
import { LinkExistingTaskPopover } from "./LinkExistingTaskPopover";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Profile {
  id: string;
  full_name: string;
}

interface ActionPlanWorkspaceProps {
  meetingId: string | undefined;
  clientId: string | undefined;
  profiles: Profile[];
  readOnly?: boolean;
  defaultView?: "list" | "kanban" | "timeline";
}

export function ActionPlanWorkspace({ meetingId, clientId, profiles, readOnly, defaultView = "kanban" }: ActionPlanWorkspaceProps) {
  const { items, loading, createTaskAndLink, linkExistingTask, updateTaskStatus, removeFromPlan, refresh } =
    useMeetingActionPlan(meetingId, clientId, { readOnly });
  const [showQuick, setShowQuick] = useState(false);
  const [view, setView] = useState<string>(defaultView);
  const [openTask, setOpenTask] = useState<ActionPlanTask | null>(null);
  const [pendingRemove, setPendingRemove] = useState<ActionPlanTask | null>(null);

  const completed = items.filter((t) => bucketStatus(t.status) === "concluido").length;
  const total = items.length;

  // Map ActionPlanTask -> Task shape expected by TaskDetailDialog
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
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs value={view} onValueChange={setView} className="w-auto">
          <TabsList>
            <TabsTrigger value="list" className="text-xs gap-1.5">
              <ListIcon className="h-3.5 w-3.5" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="kanban" className="text-xs gap-1.5">
              <KanbanSquare className="h-3.5 w-3.5" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs gap-1.5">
              <CalendarRange className="h-3.5 w-3.5" />
              Timeline
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          {total > 0 && (
            <span className="text-xs text-muted-foreground mr-1">
              {completed}/{total} concluídas
            </span>
          )}
          {!readOnly && clientId && (
            <>
              <LinkExistingTaskPopover
                clientId={clientId}
                excludeIds={items.map((i) => i.id)}
                onLink={linkExistingTask}
              />
              <Button size="sm" className="h-8" onClick={() => setShowQuick((s) => !s)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Nova atividade
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Progress */}
      {total > 0 && (
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
      )}

      {/* Quick create form */}
      {showQuick && !readOnly && (
        <QuickCreateTaskForm
          profiles={profiles}
          onSubmit={async (data) => {
            await createTaskAndLink(data);
            setShowQuick(false);
          }}
          onCancel={() => setShowQuick(false)}
        />
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && !showQuick && (
        <div className="text-center py-10 border border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground mb-3">Nenhuma atividade no plano ainda</p>
          {!readOnly && (
            <Button size="sm" variant="outline" onClick={() => setShowQuick(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Adicionar primeira atividade
            </Button>
          )}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Views */}
      {!loading && items.length > 0 && (
        <Tabs value={view} onValueChange={setView}>
          <TabsContent value="list" className="mt-0">
            <ActionPlanList
              tasks={items}
              onOpenTask={(t) => setOpenTask(t)}
              onRemove={readOnly ? undefined : (t) => setPendingRemove(t)}
              readOnly={readOnly}
            />
          </TabsContent>
          <TabsContent value="kanban" className="mt-0">
            <ActionPlanKanban
              tasks={items}
              onUpdateStatus={updateTaskStatus}
              onOpenTask={(t) => setOpenTask(t)}
              onRemove={readOnly ? undefined : (t) => setPendingRemove(t)}
              readOnly={readOnly}
            />
          </TabsContent>
          <TabsContent value="timeline" className="mt-0">
            <ActionPlanTimeline
              tasks={items}
              onOpenTask={(t) => setOpenTask(t)}
              onRemove={readOnly ? undefined : (t) => setPendingRemove(t)}
              readOnly={readOnly}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Task detail dialog */}
      <TaskDetailDialog
        open={!!openTask}
        onOpenChange={(o) => !o && setOpenTask(null)}
        task={taskForDialog as any}
        canEdit={!readOnly}
        onUpdate={() => refresh()}
        onDelete={() => {
          setOpenTask(null);
          refresh();
        }}
      />

      {/* Remove from plan confirmation */}
      <AlertDialog open={!!pendingRemove} onOpenChange={(o) => !o && setPendingRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover do plano?</AlertDialogTitle>
            <AlertDialogDescription>
              A atividade será removida deste plano. Você pode optar por excluir também a atividade do módulo de Atividades.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={async () => {
                if (pendingRemove) {
                  await removeFromPlan(pendingRemove.link_id);
                  setPendingRemove(null);
                }
              }}
            >
              Apenas remover do plano
            </Button>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (pendingRemove) {
                  await removeFromPlan(pendingRemove.link_id, { taskId: pendingRemove.id });
                  setPendingRemove(null);
                }
              }}
            >
              Remover e excluir atividade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
