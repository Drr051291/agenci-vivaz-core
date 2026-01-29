import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { StageInfo } from './types';

interface FunnelStepperProps {
  conversions: Record<string, number>;
  stageCounts?: Record<number, number>;
  allStages?: StageInfo[];
  loading?: boolean;
}

const STAGE_COLORS = [
  'bg-blue-500',
  'bg-cyan-500',
  'bg-teal-500',
  'bg-emerald-500',
  'bg-green-500',
  'bg-lime-500',
  'bg-amber-500',
];

// Simplify stage name for display
function simplifyName(name: string): string {
  // Remove parentheses content and truncate
  const simplified = name.replace(/\s*\(.*?\)/g, '').trim();
  return simplified.length > 12 ? simplified.substring(0, 10) + '...' : simplified;
}

export function FunnelStepper({ conversions, stageCounts = {}, allStages = [], loading = false }: FunnelStepperProps) {
  // Use ALL stages from the pipeline
  const displayStages = allStages;
  
  // Build transitions dynamically from actual stages
  const transitions = displayStages.slice(0, -1).map((stage, index) => ({
    from: stage,
    to: displayStages[index + 1],
    key: `${stage.id}_${displayStages[index + 1].id}`,
  }));

  // If no stages yet, show placeholder
  const hasStages = displayStages.length > 0;

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
        {hasStages ? displayStages.map((stage, index) => {
          const transition = transitions[index];
          // Try multiple key formats for conversion lookup
          let conversionRate: number | null = null;
          
          if (transition) {
            // First try the direct stage ID key
            conversionRate = conversions[transition.key] ?? null;
            
            // If not found, try the named key format (lead_to_mql, etc.)
            if (conversionRate === null) {
              const fromName = stage.name.toLowerCase().split(' ')[0].split('(')[0];
              const toName = transition.to.name.toLowerCase().split(' ')[0].split('(')[0];
              const namedKey = `${fromName}_to_${toName}`;
              conversionRate = conversions[namedKey] ?? 0;
            }
          }
          
          const isLast = index === displayStages.length - 1;

          return (
            <div key={stage.id} className="flex items-center flex-1 min-w-0">
              {/* Stage box */}
              <div className="flex flex-col items-center flex-1 min-w-[60px]">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'w-full py-2 px-2 rounded-lg text-white text-center relative cursor-help',
                        STAGE_COLORS[index % STAGE_COLORS.length]
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
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs font-semibold truncate block">
                            {simplifyName(stage.name)}
                          </span>
                          <span className="text-[10px] font-bold opacity-90">
                            {stageCounts[stage.id] ?? 0} deals
                          </span>
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <p className="font-semibold">{stage.name}</p>
                      <p className="text-muted-foreground">{stageCounts[stage.id] ?? 0} negócios ativos</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
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
        }) : (
          // Placeholder when loading
          Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="flex items-center flex-1 min-w-0">
              <Skeleton className="h-10 flex-1 min-w-[60px]" />
              {index < 6 && <Skeleton className="h-5 w-8 mx-1" />}
            </div>
          ))
        )}
      </div>

      {/* Mobile-friendly vertical list */}
      <div className="md:hidden space-y-2 mt-4">
        {hasStages ? transitions.map((transition) => {
          const fromName = transition.from.name.toLowerCase().split(' ')[0].split('(')[0];
          const toName = transition.to.name.toLowerCase().split(' ')[0].split('(')[0];
          const namedKey = `${fromName}_to_${toName}`;
          const rate = conversions[transition.key] ?? conversions[namedKey] ?? 0;
          
          return (
            <div 
              key={transition.key}
              className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg"
            >
              <span className="text-xs text-muted-foreground">
                {simplifyName(transition.from.name)} → {simplifyName(transition.to.name)}
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
        }) : null}
      </div>
    </div>
  );
}
