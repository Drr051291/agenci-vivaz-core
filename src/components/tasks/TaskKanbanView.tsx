import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User } from "lucide-react";
import { TaskCategory, getCategoryStatuses, getStatusLabel, getStatusColor, getPriorityColor, getPriorityLabel } from "@/lib/taskCategories";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  category: string;
  assigned_profile?: {
    full_name: string;
  };
}

interface TaskKanbanViewProps {
  tasks: Task[];
  category: TaskCategory;
  onTaskClick?: (task: Task) => void;
}

export function TaskKanbanView({ tasks, category, onTaskClick }: TaskKanbanViewProps) {
  const statuses = getCategoryStatuses(category);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {statuses.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status.value);
        
        return (
          <div key={status.value} className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-semibold text-sm">{status.label}</h3>
              <Badge variant="secondary" className="text-xs">
                {columnTasks.length}
              </Badge>
            </div>
            
            <div className="space-y-3">
              {columnTasks.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-4 text-center text-sm text-muted-foreground">
                    Nenhuma atividade
                  </CardContent>
                </Card>
              ) : (
                columnTasks.map((task) => (
                  <Card 
                    key={task.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onTaskClick?.(task)}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-sm font-medium line-clamp-2">
                          {task.title}
                        </CardTitle>
                        <Badge className={getPriorityColor(task.priority)} variant="outline">
                          {getPriorityLabel(task.priority)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-2">
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex flex-col gap-1 text-xs">
                        {task.due_date && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.due_date).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        {task.assigned_profile && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <User className="h-3 w-3" />
                            {task.assigned_profile.full_name}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}