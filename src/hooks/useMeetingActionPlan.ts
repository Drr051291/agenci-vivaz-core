import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ActionPlanTask {
  // From tasks table
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string | null;
  due_date: string | null;
  assigned_to: string | null;
  category: string | null;
  owner_type: string | null;
  client_id: string;
  // Profile info (joined)
  assignee_name?: string | null;
  // Link metadata
  link_id: string;
  is_task_created: boolean;
}

export type ColumnStatus = "pendente" | "em_andamento" | "concluido";

export const COLUMN_STATUSES: { value: ColumnStatus; label: string; color: string }[] = [
  { value: "pendente", label: "Pendente", color: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  { value: "em_andamento", label: "Em andamento", color: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  { value: "concluido", label: "Concluído", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
];

// Map any task status to one of the 3 columns
export function bucketStatus(status: string | null | undefined): ColumnStatus {
  if (!status) return "pendente";
  const s = status.toLowerCase();
  if (["concluido", "completed", "entregue", "finalizada", "publicada", "publicado", "aprovado", "enviado"].includes(s)) {
    return "concluido";
  }
  if (["pendente", "pending", "solicitado", "briefing", "planejamento"].includes(s)) {
    return "pendente";
  }
  return "em_andamento";
}

interface CreateTaskInput {
  title: string;
  assigned_to?: string | null;
  due_date?: string | null;
  priority?: string;
  category?: string;
  owner_type?: "vivaz" | "client";
}

export function useMeetingActionPlan(meetingId: string | undefined, clientId: string | undefined, opts?: { readOnly?: boolean }) {
  const [items, setItems] = useState<ActionPlanTask[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!meetingId || !clientId) return;
    setLoading(true);
    try {
      const { data: links, error: linksErr } = await supabase
        .from("meeting_action_links")
        .select("id, task_id, action_item, is_task_created, created_at")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: true });

      if (linksErr) throw linksErr;

      const taskIds = (links || []).map((l) => l.task_id).filter(Boolean) as string[];
      let tasksMap: Record<string, any> = {};
      let profilesMap: Record<string, string> = {};

      if (taskIds.length > 0) {
        const { data: tasksData } = await supabase
          .from("tasks")
          .select("id, title, description, status, priority, due_date, assigned_to, category, owner_type, client_id")
          .in("id", taskIds);
        tasksMap = (tasksData || []).reduce((acc, t) => ({ ...acc, [t.id]: t }), {});

        const assignedIds = [...new Set((tasksData || []).map((t) => t.assigned_to).filter(Boolean) as string[])];
        if (assignedIds.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", assignedIds);
          profilesMap = (profs || []).reduce((acc, p) => ({ ...acc, [p.id]: p.full_name }), {});
        }
      }

      const result: ActionPlanTask[] = (links || [])
        .filter((l) => l.task_id && tasksMap[l.task_id])
        .map((l) => {
          const t = tasksMap[l.task_id!];
          return {
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            due_date: t.due_date,
            assigned_to: t.assigned_to,
            category: t.category,
            owner_type: t.owner_type,
            client_id: t.client_id,
            assignee_name: t.assigned_to ? profilesMap[t.assigned_to] || null : null,
            link_id: l.id,
            is_task_created: l.is_task_created || false,
          };
        });

      setItems(result);
    } catch (err) {
      console.error("Erro ao carregar plano de ação:", err);
    } finally {
      setLoading(false);
    }
  }, [meetingId, clientId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime sync
  useEffect(() => {
    if (!meetingId) return;
    const channel = supabase
      .channel(`meeting-action-${meetingId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "meeting_action_links", filter: `meeting_id=eq.${meetingId}` }, () => {
        load();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tasks" }, (payload) => {
        const updated = payload.new as any;
        setItems((prev) =>
          prev.map((it) =>
            it.id === updated.id
              ? { ...it, status: updated.status, title: updated.title, priority: updated.priority, due_date: updated.due_date, assigned_to: updated.assigned_to, category: updated.category, owner_type: updated.owner_type }
              : it
          )
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId, load]);

  const createTaskAndLink = async (input: CreateTaskInput) => {
    if (!meetingId || !clientId || opts?.readOnly) return;
    try {
      const { data: userData } = await supabase.auth.getUser();
      const taskInsert: any = {
        client_id: clientId,
        title: input.title,
        priority: input.priority || "medium",
        category: input.category || "outros",
        owner_type: input.owner_type || "vivaz",
        status: "pendente",
        created_by: userData?.user?.id,
        source: "meeting",
        source_id: meetingId,
      };
      if (input.assigned_to) taskInsert.assigned_to = input.assigned_to;
      if (input.due_date) taskInsert.due_date = input.due_date;
      const { data: newTask, error: taskErr } = await supabase
        .from("tasks")
        .insert(taskInsert)
        .select("id")
        .single();

      if (taskErr) throw taskErr;

      await supabase.from("meeting_action_links").insert({
        meeting_id: meetingId,
        task_id: newTask.id,
        action_item: { title: input.title, source: "quick_create" },
        is_task_created: true,
      });

      toast.success("Atividade criada e vinculada");
      load();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar atividade");
    }
  };

  const linkExistingTask = async (taskId: string, taskTitle: string) => {
    if (!meetingId || opts?.readOnly) return;
    try {
      // Check if already linked
      const { data: existing } = await supabase
        .from("meeting_action_links")
        .select("id")
        .eq("meeting_id", meetingId)
        .eq("task_id", taskId)
        .maybeSingle();

      if (existing) {
        toast.info("Esta atividade já está vinculada");
        return;
      }

      await supabase.from("meeting_action_links").insert({
        meeting_id: meetingId,
        task_id: taskId,
        action_item: { title: taskTitle, source: "linked" },
        is_task_created: false,
      });

      toast.success("Atividade vinculada");
      load();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao vincular atividade");
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: ColumnStatus) => {
    if (opts?.readOnly) return;
    // Optimistic update
    setItems((prev) => prev.map((it) => (it.id === taskId ? { ...it, status: newStatus } : it)));
    try {
      const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
      if (error) throw error;
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar status");
      load();
    }
  };

  const removeFromPlan = async (linkId: string, deleteTask?: { taskId: string }) => {
    if (opts?.readOnly) return;
    try {
      await supabase.from("meeting_action_links").delete().eq("id", linkId);
      if (deleteTask) {
        await supabase.from("tasks").delete().eq("id", deleteTask.taskId);
      }
      toast.success(deleteTask ? "Removida do plano e excluída" : "Removida do plano");
      load();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover do plano");
    }
  };

  return {
    items,
    loading,
    refresh: load,
    createTaskAndLink,
    linkExistingTask,
    updateTaskStatus,
    removeFromPlan,
  };
}
