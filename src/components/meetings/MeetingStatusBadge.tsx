import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FileEdit, Clock, CheckCircle } from "lucide-react";

interface MeetingStatusBadgeProps {
  status: string;
  size?: "sm" | "default";
}

const statusConfig: Record<string, { 
  label: string; 
  variant: "default" | "secondary" | "outline"; 
  className: string;
  icon: typeof FileEdit;
}> = {
  rascunho: { 
    label: "Rascunho", 
    variant: "secondary", 
    className: "bg-muted text-muted-foreground",
    icon: FileEdit 
  },
  em_revisao: { 
    label: "Em revisão", 
    variant: "secondary", 
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock 
  },
  aprovado: { 
    label: "Aprovado", 
    variant: "secondary", 
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle 
  },
};

export function MeetingStatusBadge({ status, size = "default" }: MeetingStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.rascunho;
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={cn(
        "gap-1.5 font-medium border",
        config.className,
        size === "sm" && "text-xs px-2 py-0.5"
      )}
    >
      <Icon className={cn("h-3 w-3", size === "sm" && "h-2.5 w-2.5")} />
      {config.label}
    </Badge>
  );
}
