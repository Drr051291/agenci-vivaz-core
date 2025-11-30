import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, PieChart, LayoutGrid, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  id: string;
  name: string;
  type: string;
  embedUrl?: string;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

const getDashboardConfig = (type: string) => {
  const configs = {
    reportei: {
      icon: BarChart3,
      color: "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30",
      badgeColor: "bg-emerald-500/20 text-emerald-700",
      iconColor: "text-emerald-600",
    },
    pipedrive: {
      icon: PieChart,
      color: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30",
      badgeColor: "bg-blue-500/20 text-blue-700",
      iconColor: "text-blue-600",
    },
  };

  return configs[type.toLowerCase()] || {
    icon: LayoutGrid,
    color: "bg-primary/10 hover:bg-primary/20 border-primary/30",
    badgeColor: "bg-primary/20 text-primary",
    iconColor: "text-primary",
  };
};

export function DashboardCard({
  id,
  name,
  type,
  embedUrl,
  isSelected,
  onToggle,
}: DashboardCardProps) {
  const config = getDashboardConfig(type);
  const Icon = config.icon;

  const handleOpenDashboard = () => {
    if (embedUrl) {
      window.open(embedUrl, "_blank");
    }
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200 cursor-pointer border-2",
        config.color,
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
      onClick={() => onToggle(id)}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={cn("p-2 rounded-lg bg-background/50", config.iconColor)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">{name}</h4>
              <Badge variant="secondary" className={cn("text-xs mt-1", config.badgeColor)}>
                {type}
              </Badge>
            </div>
          </div>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggle(id)}
            onClick={(e) => e.stopPropagation()}
            className="mt-1"
          />
        </div>

        <div className="bg-background/80 rounded-lg p-6 flex items-center justify-center min-h-[100px]">
          <Icon className={cn("h-12 w-12 opacity-30", config.iconColor)} />
        </div>

        {embedUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDashboard();
            }}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Abrir Dashboard
          </Button>
        )}
      </div>
    </Card>
  );
}
