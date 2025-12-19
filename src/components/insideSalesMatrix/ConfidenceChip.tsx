import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { ConfidenceScoreResult } from '@/lib/insideSalesMatrix/confidenceScore';
import { cn } from '@/lib/utils';

interface ConfidenceChipProps {
  confidence: ConfidenceScoreResult;
  showScore?: boolean;
  size?: 'sm' | 'default';
}

const levelConfig = {
  baixa: {
    icon: AlertTriangle,
    bgClass: 'bg-destructive/10 text-destructive border-destructive/30',
    barColor: 'bg-destructive',
  },
  media: {
    icon: Info,
    bgClass: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
    barColor: 'bg-yellow-500',
  },
  alta: {
    icon: CheckCircle2,
    bgClass: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
    barColor: 'bg-green-500',
  },
};

export function ConfidenceChip({ confidence, showScore = true, size = 'default' }: ConfidenceChipProps) {
  const config = levelConfig[confidence.level];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'cursor-help gap-1.5 border',
              config.bgClass,
              size === 'sm' && 'text-xs px-2 py-0.5'
            )}
          >
            <Icon className={cn('shrink-0', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
            {showScore && <span className="font-mono font-medium">{confidence.score}</span>}
            <span className={size === 'sm' ? 'sr-only' : ''}>{confidence.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs p-3">
          <div className="space-y-2">
            {/* Score bar */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confiança</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', config.barColor)}
                  style={{ width: `${confidence.score}%` }}
                />
              </div>
              <span className="font-mono text-xs font-medium">{confidence.score}/100</span>
            </div>

            {/* Top penalties */}
            {confidence.topPenalties.length > 0 && (
              <div className="space-y-1 pt-1 border-t">
                <p className="text-xs font-medium text-muted-foreground">Principais fatores:</p>
                {confidence.topPenalties.map((p, i) => (
                  <p key={i} className="text-xs flex items-start gap-1.5">
                    <span className="text-destructive shrink-0">−{p.penalty}</span>
                    <span>{p.reason}</span>
                  </p>
                ))}
              </div>
            )}

            {confidence.hasInconsistency && (
              <p className="text-xs text-destructive pt-1 border-t">
                ⚠ Dados inconsistentes detectados
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
