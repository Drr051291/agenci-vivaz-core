import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TrendingUp, Users, ArrowRight } from 'lucide-react';

interface FunnelKPICardProps {
  title: string;
  value: number | null;
  format?: 'number' | 'percent';
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  icon?: 'users' | 'arrow' | 'trending';
  helperText?: string;
}

export function FunnelKPICard({
  title,
  value,
  format = 'number',
  loading = false,
  variant = 'secondary',
  icon = 'trending',
  helperText,
}: FunnelKPICardProps) {
  const formattedValue = value !== null
    ? format === 'percent'
      ? `${value.toFixed(1)}%`
      : value.toLocaleString('pt-BR')
    : '—';

  const Icon = {
    users: Users,
    arrow: ArrowRight,
    trending: TrendingUp,
  }[icon];

  return (
    <Card className={cn(
      'transition-all duration-200',
      variant === 'primary' && 'border-primary/30 bg-primary/5'
    )}>
      <CardContent className="pt-4 pb-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground truncate">
              {title}
            </p>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className={cn(
                'text-2xl font-bold tracking-tight',
                variant === 'primary' && 'text-primary'
              )}>
                {formattedValue}
              </p>
            )}
            {helperText && (
              <p className="text-[10px] text-muted-foreground/70">
                {helperText}
              </p>
            )}
          </div>
          <div className={cn(
            'p-2 rounded-lg flex-shrink-0',
            variant === 'primary' 
              ? 'bg-primary/10 text-primary' 
              : 'bg-muted text-muted-foreground'
          )}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
