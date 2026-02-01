import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { StageInfo, ViewMode, FunnelData } from './types';
import { VariationBadge } from './VariationBadge';
import { calculateVariation, calculatePointsVariation } from './comparisonUtils';

interface FunnelStepperProps {
  conversions: Record<string, number>;
  stageCounts?: Record<number, number>;
  stageArrivals?: Record<number, number>;
  allStages?: StageInfo[];
  leadsCount?: number;
  viewMode?: ViewMode;
  loading?: boolean;
  // Comparison data
  comparisonData?: FunnelData | null;
  comparisonLoading?: boolean;
  comparisonLabel?: string;
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
  const simplified = name.replace(/\s*\(.*?\)/g, '').trim();
  return simplified.length > 12 ? simplified.substring(0, 10) + '...' : simplified;
}

export function FunnelStepper({ 
  conversions, 
  stageCounts = {}, 
  stageArrivals = {}, 
  allStages = [], 
  leadsCount = 0, 
  viewMode = 'period', 
  loading = false,
  comparisonData,
  comparisonLoading = false,
  comparisonLabel,
}: FunnelStepperProps) {
  const displayStages = allStages;
  
  const transitions = displayStages.slice(0, -1).map((stage, index) => ({
    from: stage,
    to: displayStages[index + 1],
    key: `${stage.id}_${displayStages[index + 1].id}`,
  }));

  const totalActiveDeals = useMemo(() => {
    return Object.values(stageCounts).reduce((sum, count) => sum + (count || 0), 0);
  }, [stageCounts]);

  const isPeriodMode = viewMode === 'period';
  const showComparison = !!comparisonData && isPeriodMode;

  // Calculate lead count variation
  const leadsVariation = useMemo(() => {
    if (!showComparison) return null;
    return calculateVariation(leadsCount, comparisonData?.leads_count || 0);
  }, [showComparison, leadsCount, comparisonData?.leads_count]);

  const getStageCount = (stageId: number): number => {
    if (isPeriodMode) {
      return stageArrivals[stageId] ?? stageArrivals[String(stageId) as unknown as number] ?? 0;
    } else {
      return stageCounts[stageId] ?? stageCounts[String(stageId) as unknown as number] ?? 0;
    }
  };

  // Get comparison stage count
  const getComparisonStageCount = (stageId: number): number => {
    if (!comparisonData) return 0;
    const arrivals = comparisonData.stage_arrivals || {};
    return arrivals[stageId] ?? arrivals[String(stageId) as unknown as number] ?? 0;
  };

  const hasStages = displayStages.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {/* KPI principal */}
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">
              {isPeriodMode ? 'Leads no período' : 'Deals ativos'}
            </span>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">
                  {isPeriodMode ? leadsCount : totalActiveDeals}
                </span>
                {showComparison && !comparisonLoading && (
                  <VariationBadge 
                    variation={leadsVariation} 
                    periodLabel={comparisonLabel}
                    size="md"
                  />
                )}
              </div>
            )}
          </div>
          <div className="h-8 w-px bg-border" />
          <h3 className="text-sm font-semibold flex items-center gap-2">
            {isPeriodMode ? 'Funil de Conversão' : 'Pipeline Atual'}
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs">
                  {isPeriodMode 
                    ? 'Taxa de conversão entre etapas consecutivas no período selecionado. Deals podem pular etapas; a conversão considera movimentações registradas.'
                    : 'Quantidade atual de deals abertos em cada etapa do pipeline. Representa o estado atual, não o fluxo do período.'}
                </p>
              </TooltipContent>
            </Tooltip>
          </h3>
        </div>
      </div>

      {/* Horizontal funnel stepper */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
        {hasStages ? displayStages.map((stage, index) => {
          const transition = transitions[index];
          let conversionRate: number | null = null;
          let comparisonConversionRate: number | null = null;
          
          if (transition) {
            conversionRate = conversions[transition.key] ?? null;
            
            if (conversionRate === null) {
              const fromName = stage.name.toLowerCase().split(' ')[0].split('(')[0];
              const toName = transition.to.name.toLowerCase().split(' ')[0].split('(')[0];
              const namedKey = `${fromName}_to_${toName}`;
              conversionRate = conversions[namedKey] ?? 0;
            }

            // Get comparison conversion rate
            if (showComparison && comparisonData?.conversions) {
              comparisonConversionRate = comparisonData.conversions[transition.key] ?? null;
              
              if (comparisonConversionRate === null) {
                const fromName = stage.name.toLowerCase().split(' ')[0].split('(')[0];
                const toName = transition.to.name.toLowerCase().split(' ')[0].split('(')[0];
                const namedKey = `${fromName}_to_${toName}`;
                comparisonConversionRate = comparisonData.conversions[namedKey] ?? 0;
              }
            }
          }
          
          const isLast = index === displayStages.length - 1;
          const stageCount = getStageCount(stage.id);
          const comparisonStageCount = getComparisonStageCount(stage.id);
          const stageVariation = showComparison ? calculateVariation(stageCount, comparisonStageCount) : null;
          
          // Calculate conversion rate variation in percentage points
          const conversionVariation = showComparison && conversionRate !== null && comparisonConversionRate !== null
            ? calculatePointsVariation(conversionRate, comparisonConversionRate)
            : null;

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
                            {stageCount} {isPeriodMode ? 'chegaram' : 'deals'}
                          </span>
                          {showComparison && !comparisonLoading && stageVariation !== null && (
                            <span className={cn(
                              'text-[9px] font-medium px-1 rounded',
                              stageVariation > 2 && 'bg-white/20',
                              stageVariation < -2 && 'bg-black/20',
                            )}>
                              {stageVariation > 0 ? '+' : ''}{Math.round(stageVariation)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1">
                      <p className="font-semibold">{stage.name}</p>
                      <p className="text-muted-foreground">
                        {isPeriodMode 
                          ? `${stageCount} chegaram no período` 
                          : `${stageCount} negócios ativos`}
                      </p>
                      {showComparison && (
                        <p className="text-muted-foreground">
                          Anterior: {comparisonStageCount}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Conversion arrow between stages */}
              {!isLast && (
                <div className="flex flex-col items-center justify-center px-1 min-w-[50px]">
                  {loading ? (
                    <Skeleton className="h-5 w-10" />
                  ) : isPeriodMode ? (
                    <div className="flex flex-col items-center">
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
                      {showComparison && !comparisonLoading && conversionVariation !== null && (
                        <VariationBadge 
                          variation={conversionVariation}
                          isPercentagePoints={true}
                          size="sm"
                          showIcon={false}
                        />
                      )}
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              )}
            </div>
          );
        }) : (
          Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="flex items-center flex-1 min-w-0">
              <Skeleton className="h-10 flex-1 min-w-[60px]" />
              {index < 6 && <Skeleton className="h-5 w-8 mx-1" />}
            </div>
          ))
        )}
      </div>

      {/* Mobile-friendly vertical list - only show in period mode */}
      {isPeriodMode && (
        <div className="md:hidden space-y-2 mt-4">
          {hasStages ? transitions.map((transition) => {
            const fromName = transition.from.name.toLowerCase().split(' ')[0].split('(')[0];
            const toName = transition.to.name.toLowerCase().split(' ')[0].split('(')[0];
            const namedKey = `${fromName}_to_${toName}`;
            const rate = conversions[transition.key] ?? conversions[namedKey] ?? 0;
            
            const comparisonRate = showComparison && comparisonData?.conversions
              ? comparisonData.conversions[transition.key] ?? comparisonData.conversions[namedKey] ?? 0
              : null;
            
            const rateVariation = comparisonRate !== null 
              ? calculatePointsVariation(rate, comparisonRate) 
              : null;
            
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
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-sm font-semibold',
                      rate > 0 ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {rate.toFixed(1)}%
                    </span>
                    {showComparison && rateVariation !== null && (
                      <VariationBadge 
                        variation={rateVariation}
                        isPercentagePoints={true}
                        size="sm"
                      />
                    )}
                  </div>
                )}
              </div>
            );
          }) : null}
        </div>
      )}

      {/* Mobile-friendly list for snapshot mode */}
      {!isPeriodMode && (
        <div className="md:hidden space-y-2 mt-4">
          {hasStages ? displayStages.map((stage) => {
            return (
              <div 
                key={stage.id}
                className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg"
              >
                <span className="text-xs text-muted-foreground">
                  {stage.name}
                </span>
                {loading ? (
                  <Skeleton className="h-4 w-12" />
                ) : (
                  <span className="text-sm font-semibold">
                    {getStageCount(stage.id)} deals
                  </span>
                )}
              </div>
            );
          }) : null}
        </div>
      )}
    </div>
  );
}
