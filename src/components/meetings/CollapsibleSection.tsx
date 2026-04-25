import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
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
  description?: string;
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
  description,
}: CollapsibleSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultOpen ? false : isCollapsed);

  const handleToggle = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    onToggle?.(newState);
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md",
        className
      )}
    >
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none"
        onClick={handleToggle}
      >
        {icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base leading-tight">{title}</h3>
            {badge && (
              <span className="text-[10px] uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {description}
            </p>
          )}
        </div>
        {headerActions && (
          <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
            {headerActions}
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 p-0 text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          aria-label={collapsed ? "Expandir seção" : "Recolher seção"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>
      {!collapsed && (
        <div className="px-5 pb-5 pt-1 border-t border-border/60">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}
