import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatVariation, getTrend } from './comparisonUtils';

interface VariationBadgeProps {
  variation: number | null;
  isPercentagePoints?: boolean;
  periodLabel?: string;
  className?: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  threshold?: number;
  invertColors?: boolean; // For metrics where down is good (e.g., CAC)
}

export function VariationBadge({
  variation,
  isPercentagePoints = false,
  periodLabel,
  className,
  size = 'sm',
  showIcon = true,
  threshold = 2,
  invertColors = false,
}: VariationBadgeProps) {
  if (variation === null) {
    return null;
  }

  const trend = getTrend(variation, threshold);
  const formattedValue = formatVariation(variation, isPercentagePoints);

  // Determine visual styling based on trend
  const isPositive = invertColors ? trend === 'down' : trend === 'up';
  const isNegative = invertColors ? trend === 'up' : trend === 'down';

  const Icon = trend === 'up' 
    ? TrendingUp 
    : trend === 'down' 
      ? TrendingDown 
      : Minus;

  const sizeClasses = size === 'sm' 
    ? 'text-[10px] px-1 py-0.5 gap-0.5' 
    : 'text-xs px-1.5 py-0.5 gap-1';

  const iconSize = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3';

  const badge = (
    <span
      className={cn(
        'inline-flex items-center rounded font-medium',
        sizeClasses,
        isPositive && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        isNegative && 'bg-red-500/10 text-red-600 dark:text-red-400',
        trend === 'stable' && 'bg-muted text-muted-foreground',
        className
      )}
    >
      {showIcon && <Icon className={iconSize} />}
      {formattedValue}
    </span>
  );

  if (periodLabel) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>{periodLabel}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}
