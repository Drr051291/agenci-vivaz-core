import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TaskCategory, TASK_CATEGORIES, getStatusColor, getPriorityColor } from "@/lib/taskCategories";

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

interface TaskCalendarViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export function TaskCalendarView({ tasks, onTaskClick }: TaskCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthName = currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getTasksForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return tasks.filter((task) => task.due_date?.startsWith(dateStr));
  };

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="min-h-[100px] p-2"></div>);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayTasks = getTasksForDate(day);
    const isToday =
      day === new Date().getDate() &&
      month === new Date().getMonth() &&
      year === new Date().getFullYear();

    days.push(
      <Card
        key={day}
        className={`min-h-[100px] p-2 ${isToday ? "border-primary border-2" : ""}`}
      >
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-start mb-2">
            <span className={`text-sm font-medium ${isToday ? "text-primary" : ""}`}>
              {day}
            </span>
            {dayTasks.length > 0 && (
              <Badge variant="secondary" className="text-xs h-5">
                {dayTasks.length}
              </Badge>
            )}
          </div>
          <div className="space-y-1 flex-1 overflow-y-auto">
            {dayTasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                className="text-xs p-1 rounded cursor-pointer hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full ${getStatusColor(task.status).split(" ")[0].replace("/10", "")}`}
                  />
                  <span className="line-clamp-1 flex-1">{task.title}</span>
                </div>
              </div>
            ))}
            {dayTasks.length > 3 && (
              <div className="text-xs text-muted-foreground text-center pt-1">
                +{dayTasks.length - 3} mais
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold capitalize">{monthName}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <div key={day} className="text-center font-medium text-sm p-2">
            {day}
          </div>
        ))}
        {days}
      </div>
    </div>
  );
}