import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  LayoutGrid,
  List as ListIcon,
  Calendar as CalendarIcon,
  ListChecks,
  Loader2,
  CheckCircle2,
  Zap,
  MoreVertical,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { TaskKanbanView } from "@/components/tasks/TaskKanbanView";
import { TaskCalendarView } from "@/components/tasks/TaskCalendarView";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TASK_CATEGORIES,
  TaskCategory,
  getStatusLabel,
  getPriorityLabel,
} from "@/lib/taskCategories";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  category: string;
  created_at?: string;
  assigned_to?: string;
  assigned_profile?: { full_name: string };
}

interface ClientTasksProps {
  clientId: string;
}

type ViewMode = "list" | "kanban" | "calendar";
type SortMode = "recent" | "oldest" | "due_asc" | "priority";

const PAGE_SIZE = 5;

// Soft pastel palette per category (matches reference)
const CATEGORY_BADGE: Record<string, string> = {
  campanhas: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  meta_ads: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  google_ads: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  criativo: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  landing_page: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  ajuste: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  seo: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  email_marketing: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  conteudo: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  outros: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
};

const PRIORITY_DOT: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-amber-400",
  high: "bg-rose-500",
  urgent: "bg-red-600",
};

function statusPillClass(status: string) {
  const s = status.toLowerCase();
  if (
    s.includes("aprovado") || s.includes("concluido") || s.includes("entregue") ||
    s.includes("publicado") || s.includes("enviado") || s.includes("finalizada") ||
    s.includes("publicada")
  ) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
  }
  if (s.includes("pendente") || s.includes("aguardando") || s.includes("solicitado")) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
  }
  if (
    s.includes("ativa") || s.includes("execucao") || s.includes("criacao") ||
    s.includes("desenvolvimento") || s.includes("producao") || s.includes("em_andamento")
  ) {
    return "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300";
  }
  if (s.includes("pausada") || s.includes("encerrada")) {
    return "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300";
  }
  return "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300";
}

function isCompleted(status: string) {
  const s = status.toLowerCase();
  return (
    s.includes("aprovado") ||
    s.includes("concluido") ||
    s.includes("entregue") ||
    s.includes("publicado") ||
    s.includes("enviado") ||
    s.includes("finalizada") ||
    s.includes("publicada") ||
    s === "done"
  );
}

function isInProgress(status: string) {
  const s = status.toLowerCase();
  return (
    s.includes("ativa") ||
    s.includes("execucao") ||
    s.includes("criacao") ||
    s.includes("desenvolvimento") ||
    s.includes("producao") ||
    s.includes("em_andamento") ||
    s.includes("revisao") ||
    s.includes("ajustes") ||
    s.includes("planejamento") ||
    s.includes("briefing") ||
    s.includes("monitoramento")
  );
}

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export function ClientTasks({ clientId }: ClientTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, sortMode, viewMode]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select(
          `*, assigned_profile:profiles!tasks_assigned_to_fkey ( full_name )`
        )
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks((data as Task[]) || []);
    } catch (error) {
      console.error("Erro ao buscar tasks:", error);
      toast.error("Erro ao carregar atividades");
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = useMemo(() => {
    let arr = categoryFilter === "all" ? tasks : tasks.filter((t) => t.category === categoryFilter);
    arr = [...arr];
    switch (sortMode) {
      case "recent":
        arr.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
        break;
      case "oldest":
        arr.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
        break;
      case "due_asc":
        arr.sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return a.due_date.localeCompare(b.due_date);
        });
        break;
      case "priority":
        arr.sort(
          (a, b) =>
            (PRIORITY_RANK[a.priority] ?? 99) - (PRIORITY_RANK[b.priority] ?? 99)
        );
        break;
    }
    return arr;
  }, [tasks, categoryFilter, sortMode]);

  // KPI metrics (always over the unfiltered list to reflect the whole client)
  const kpis = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => isCompleted(t.status)).length;
    const inProgress = tasks.filter((t) => isInProgress(t.status)).length;
    const highPriority = tasks.filter(
      (t) => (t.priority === "high" || t.priority === "urgent") && !isCompleted(t.status)
    ).length;
    const efficiency = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, highPriority, efficiency };
  }, [tasks]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
  const pageItems = filteredTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-10 w-auto min-w-[180px] gap-2 rounded-xl bg-card border-border/60">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Filtrar por: Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Filtrar por: Todos</SelectItem>
              {Object.entries(TASK_CATEGORIES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="h-10 w-auto min-w-[180px] gap-2 rounded-xl bg-card border-border/60">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Data: Mais recentes</SelectItem>
              <SelectItem value="oldest">Data: Mais antigas</SelectItem>
              <SelectItem value="due_asc">Vencimento próximo</SelectItem>
              <SelectItem value="priority">Prioridade</SelectItem>
            </SelectContent>
          </Select>

          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
            className="border border-border/60 rounded-xl p-0.5 bg-card"
          >
            <ToggleGroupItem value="list" aria-label="Lista" className="h-9 w-9 rounded-lg">
              <ListIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="kanban" aria-label="Kanban" className="h-9 w-9 rounded-lg">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="calendar" aria-label="Calendário" className="h-9 w-9 rounded-lg">
              <CalendarIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Button
          onClick={() => setDialogOpen(true)}
          className="h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Atividade
        </Button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : viewMode === "list" ? (
        <Card className="border-border/60 rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                <p className="text-sm text-muted-foreground mb-3">
                  Nenhuma atividade encontrada
                </p>
                <Button onClick={() => setDialogOpen(true)} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar primeira atividade
                </Button>
              </div>
            ) : (
              <>
                {/* Header row */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border/60 bg-muted/30 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  <div className="col-span-5">Atividade</div>
                  <div className="col-span-2">Categoria</div>
                  <div className="col-span-2">Prioridade</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1 text-right">Ações</div>
                </div>

                {/* Rows */}
                <ul className="divide-y divide-border/60">
                  {pageItems.map((task) => {
                    const categoryLabel =
                      TASK_CATEGORIES[task.category as TaskCategory] || task.category;
                    const startedLabel = task.created_at
                      ? `Iniciado em ${format(parseISO(task.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}`
                      : "Sem data de início";
                    const author = task.assigned_profile?.full_name;

                    return (
                      <li
                        key={task.id}
                        className="grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedTask(task)}
                      >
                        <div className="col-span-5 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {startedLabel}
                            {author ? ` por ${author}` : ""}
                          </p>
                        </div>

                        <div className="col-span-2">
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                              CATEGORY_BADGE[task.category] || CATEGORY_BADGE.outros
                            )}
                          >
                            {categoryLabel}
                          </span>
                        </div>

                        <div className="col-span-2">
                          <span className="inline-flex items-center gap-2 text-sm text-foreground">
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                PRIORITY_DOT[task.priority] || "bg-slate-400"
                              )}
                            />
                            {getPriorityLabel(task.priority)}
                          </span>
                        </div>

                        <div className="col-span-2">
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                              statusPillClass(task.status)
                            )}
                          >
                            {getStatusLabel(task.category as TaskCategory, task.status)}
                          </span>
                        </div>

                        <div
                          className="col-span-1 flex justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedTask(task)}>
                                Abrir detalhes
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Footer / pagination */}
                <div className="flex items-center justify-between px-6 py-3 border-t border-border/60 bg-muted/20">
                  <span className="text-xs text-muted-foreground">
                    Exibindo {pageItems.length} de {filteredTasks.length}{" "}
                    {filteredTasks.length === 1 ? "atividade" : "atividades"}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <Button
                        key={p}
                        variant={p === page ? "default" : "ghost"}
                        size="icon"
                        className={cn(
                          "h-8 w-8 rounded-lg text-xs",
                          p === page && "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "kanban" ? (
        <TaskKanbanView
          tasks={filteredTasks}
          category={(categoryFilter === "all" ? "outros" : categoryFilter) as TaskCategory}
          onTaskClick={(task) => setSelectedTask(task)}
          onUpdate={fetchTasks}
        />
      ) : (
        <TaskCalendarView
          tasks={filteredTasks}
          onTaskClick={(task) => setSelectedTask(task)}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Atividades"
          value={kpis.total.toString().padStart(2, "0")}
          icon={ListChecks}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          footer={
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              {kpis.total > 0 ? "Atualizado" : "Sem registros"}
            </span>
          }
        />
        <KpiCard
          label="Em Andamento"
          value={kpis.inProgress.toString().padStart(2, "0")}
          icon={Loader2}
          iconBg="bg-amber-500/15"
          iconColor="text-amber-600 dark:text-amber-400"
          footer={
            <span className="text-xs text-muted-foreground">
              {kpis.highPriority} alta prioridade
            </span>
          }
        />
        <KpiCard
          label="Concluídas"
          value={kpis.completed.toString().padStart(2, "0")}
          icon={CheckCircle2}
          iconBg="bg-emerald-500/15"
          iconColor="text-emerald-600 dark:text-emerald-400"
          footer={<span className="text-xs text-muted-foreground">Meta trimestral: 80%</span>}
        />
        <KpiCard
          highlighted
          label="Eficiência"
          value={`${kpis.efficiency}%`}
          icon={Zap}
          iconBg="bg-primary/15"
          iconColor="text-primary"
          footer={
            <span className="text-xs text-primary/80 font-medium">
              {kpis.efficiency >= 80
                ? "Excelente performance"
                : kpis.efficiency >= 50
                ? "Boa performance"
                : "Pode melhorar"}
            </span>
          }
        />
      </div>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clientId={clientId}
        onSuccess={fetchTasks}
      />

      <TaskDetailDialog
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        task={selectedTask}
        canEdit={true}
        onUpdate={fetchTasks}
      />
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  footer?: React.ReactNode;
  highlighted?: boolean;
}

function KpiCard({ label, value, icon: Icon, iconBg, iconColor, footer, highlighted }: KpiCardProps) {
  return (
    <Card
      className={cn(
        "border-border/60 rounded-2xl",
        highlighted && "bg-primary/5 border-primary/20"
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {label}
          </p>
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", iconBg)}>
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
        </div>
        <p className="text-3xl font-bold text-foreground mt-3 leading-none">{value}</p>
        {footer && <div className="mt-3">{footer}</div>}
      </CardContent>
    </Card>
  );
}
