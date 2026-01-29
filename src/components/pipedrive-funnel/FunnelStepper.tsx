import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { STAGE_ORDER, STAGE_TRANSITIONS } from './types';

interface FunnelStepperProps {
  conversions: Record<string, number>;
  loading?: boolean;
}

const STAGE_COLORS = [
  'bg-blue-500',
  'bg-cyan-500',
  'bg-teal-500',
  'bg-emerald-500',
  'bg-green-500',
];

export function FunnelStepper({ conversions, loading = false }: FunnelStepperProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          Funil de Conversão
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="text-xs">
                Taxa de conversão entre etapas consecutivas no período selecionado. 
                Deals podem pular etapas; a conversão considera movimentações registradas.
              </p>
            </TooltipContent>
          </Tooltip>
        </h3>
      </div>

      {/* Horizontal funnel stepper */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
        {STAGE_ORDER.map((stage, index) => {
          const transition = STAGE_TRANSITIONS[index];
          const conversionRate = transition 
            ? conversions[transition.key] || 0 
            : null;
          const isLast = index === STAGE_ORDER.length - 1;

          return (
            <div key={stage} className="flex items-center flex-1 min-w-0">
              {/* Stage box */}
              <div className="flex flex-col items-center flex-1 min-w-[80px]">
                <div
                  className={cn(
                    'w-full py-3 px-2 rounded-lg text-white text-center relative',
                    STAGE_COLORS[index]
                  )}
                  style={{
                    clipPath: isLast 
                      ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 8px 50%)'
                      : 'polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%, 8px 50%)',
                  }}
                >
                  {loading ? (
                    <Skeleton className="h-4 w-16 mx-auto bg-white/30" />
                  ) : (
                    <span className="text-xs font-semibold truncate block">
                      {stage}
                    </span>
                  )}
                </div>
              </div>

              {/* Conversion arrow between stages */}
              {!isLast && (
                <div className="flex flex-col items-center justify-center px-1 min-w-[50px]">
                  {loading ? (
                    <Skeleton className="h-5 w-10" />
                  ) : (
                    <>
                      <span className={cn(
                        'text-sm font-bold',
                        conversionRate && conversionRate > 0 
                          ? 'text-foreground' 
                          : 'text-muted-foreground'
                      )}>
                        {conversionRate !== null 
                          ? `${conversionRate.toFixed(0)}%` 
                          : '—'}
                      </span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile-friendly vertical list */}
      <div className="md:hidden space-y-2 mt-4">
        {STAGE_TRANSITIONS.map((transition, index) => {
          const rate = conversions[transition.key] || 0;
          
          return (
            <div 
              key={transition.key}
              className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg"
            >
              <span className="text-xs text-muted-foreground">
                {transition.from} → {transition.to}
              </span>
              {loading ? (
                <Skeleton className="h-4 w-12" />
              ) : (
                <span className={cn(
                  'text-sm font-semibold',
                  rate > 0 ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {rate.toFixed(1)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
