import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { 
  CheckSquare, 
  MessageSquare, 
  Paperclip, 
  Plus, 
  Calendar as CalendarIcon,
  Flag,
  X,
  Check
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { parseLocalDate } from "@/lib/dateUtils";

interface Task {
  id: string;
  title: string;
  status: string;
  priority?: string;
  due_date?: string;
  owner_type?: string;
  assigned_to?: string;
}

interface MeetingSidebarProps {
  tasks: Task[];
  selectedTasks: string[];
  onTaskToggle: (taskId: string) => void;
  isEditing: boolean;
  onSelectPending?: () => void;
  onClear?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-amber-50 text-amber-700" },
  in_progress: { label: "Em andamento", className: "bg-blue-50 text-blue-700" },
  completed: { label: "Concluída", className: "bg-emerald-50 text-emerald-700" },
  review: { label: "Revisão", className: "bg-violet-50 text-violet-700" },
  cancelled: { label: "Cancelada", className: "bg-gray-50 text-gray-500" },
};

export function MeetingSidebar({
  tasks,
  selectedTasks,
  onTaskToggle,
  isEditing,
  onSelectPending,
  onClear,
}: MeetingSidebarProps) {
  return (
    <Card className="p-4 h-fit lg:sticky lg:top-24">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Atividades</h3>
        </div>
        {selectedTasks.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {selectedTasks.length}
          </Badge>
        )}
      </div>
      
      {isEditing && tasks.length > 0 && (
        <div className="flex gap-2 mb-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 flex-1"
            onClick={onSelectPending}
          >
            Pendentes
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={onClear}
          >
            Limpar
          </Button>
        </div>
      )}
      
      <div className="space-y-2 max-h-[350px] overflow-y-auto">
        {tasks.length > 0 ? (
          tasks.map((task) => {
            const isSelected = selectedTasks.includes(task.id);
            const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
            
            return (
              <div
                key={task.id}
                onClick={() => isEditing && onTaskToggle(task.id)}
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  isEditing && "cursor-pointer hover:border-primary/50",
                  isSelected ? "bg-primary/5 border-primary/30" : "bg-background"
                )}
              >
                <div className="flex items-start gap-2">
                  {isEditing && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onTaskToggle(task.id)}
                      className="mt-0.5"
                    />
                  )}
                  {!isEditing && isSelected && (
                    <Check className="h-4 w-4 text-primary mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      !isSelected && !isEditing && "text-muted-foreground"
                    )}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn("text-xs px-1.5 py-0.5 rounded", statusConfig.className)}>
                        {statusConfig.label}
                      </span>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">
                          {format(parseLocalDate(task.due_date), "dd/MM", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma atividade</p>
          </div>
        )}
      </div>
    </Card>
  );
}
