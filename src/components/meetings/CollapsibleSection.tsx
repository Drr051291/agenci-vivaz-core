import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  isCollapsed?: boolean;
  defaultOpen?: boolean;
  onToggle?: (collapsed: boolean) => void;
  children: React.ReactNode;
  className?: string;
  headerActions?: React.ReactNode;
  badge?: string;
}

export function CollapsibleSection({
  title,
  icon,
  isCollapsed = false,
  defaultOpen = true,
  onToggle,
  children,
  className,
  headerActions,
  badge,
}: CollapsibleSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultOpen ? false : isCollapsed);

  const handleToggle = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    onToggle?.(newState);
  };

  return (
    <div className={cn("border rounded-lg bg-card overflow-hidden", className)}>
      <div 
        className="flex items-center gap-2 px-4 py-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={handleToggle}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        {icon && <div className="text-primary">{icon}</div>}
        <h3 className="font-medium flex-1">{title}</h3>
        {badge && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {badge}
          </span>
        )}
        {headerActions && (
          <div onClick={(e) => e.stopPropagation()}>
            {headerActions}
          </div>
        )}
      </div>
      {!collapsed && (
        <div className="p-4 border-t">
          {children}
        </div>
      )}
    </div>
  );
}
