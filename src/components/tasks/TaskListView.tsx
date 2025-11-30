import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User } from "lucide-react";
import { TaskCategory, getStatusLabel, getStatusColor, getPriorityColor, getPriorityLabel, TASK_CATEGORIES } from "@/lib/taskCategories";

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

interface TaskListViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export function TaskListView({ tasks, onTaskClick }: TaskListViewProps) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Nenhuma atividade encontrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <Card
          key={task.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onTaskClick?.(task)}
        >
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1 flex-1">
                <CardTitle className="text-lg">{task.title}</CardTitle>
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                <Badge variant="outline">
                  {TASK_CATEGORIES[task.category as TaskCategory]}
                </Badge>
                <Badge className={getPriorityColor(task.priority)} variant="outline">
                  {getPriorityLabel(task.priority)}
                </Badge>
                <Badge className={getStatusColor(task.status)} variant="outline">
                  {getStatusLabel(task.category as TaskCategory, task.status)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-4 text-sm text-muted-foreground">
              {task.due_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(task.due_date).toLocaleDateString("pt-BR")}
                </span>
              )}
              {task.assigned_profile && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {task.assigned_profile.full_name}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}