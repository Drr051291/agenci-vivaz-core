import { CheckSquare, Calendar, MessageSquare, DollarSign, FileText, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Notification } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: () => void;
}

const categoryConfig = {
  task: {
    icon: CheckSquare,
    colorClass: "text-info bg-info/10",
  },
  meeting: {
    icon: Calendar,
    colorClass: "text-primary bg-primary/10",
  },
  comment: {
    icon: MessageSquare,
    colorClass: "text-success bg-success/10",
  },
  payment: {
    icon: DollarSign,
    colorClass: "text-warning bg-warning/10",
  },
  invoice: {
    icon: FileText,
    colorClass: "text-[hsl(24_95%_53%)] bg-[hsl(24_95%_53%/0.1)]",
  },
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onClick,
}: NotificationItemProps) {
  const config = categoryConfig[notification.category] || categoryConfig.task;
  const Icon = config.icon;

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    onClick?.();
  };

  return (
    <div
      className={cn(
        "group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
        !notification.is_read && "bg-primary/5"
      )}
      onClick={handleClick}
    >
      <div className={cn("p-2 rounded-lg shrink-0", config.colorClass)}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium truncate",
              !notification.is_read && "text-foreground",
              notification.is_read && "text-muted-foreground"
            )}
          >
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
            locale: ptBR,
          })}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
