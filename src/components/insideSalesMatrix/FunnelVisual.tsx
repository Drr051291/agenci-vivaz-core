import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InsideSalesInputs, InsideSalesOutputs, formatPercent } from "@/lib/insideSalesMatrix/calc";
import { StageImpact } from "@/lib/insideSalesMatrix/impact";
import { cn } from "@/lib/utils";

interface FunnelVisualProps {
  inputs: InsideSalesInputs;
  outputs: InsideSalesOutputs;
  impacts: StageImpact[];
}

const statusConfig = {
  ok: { label: 'OK', color: 'bg-green-500', text: 'text-green-600', border: 'border-green-500/30' },
  atencao: { label: 'Atenção', color: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-500/30' },
  critico: { label: 'Crítico', color: 'bg-red-500', text: 'text-red-600', border: 'border-red-500/30' },
  sem_dados: { label: 'Sem dados', color: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted' },
  baixa_amostra: { label: 'Baixa amostra', color: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-500/30' },
};

export function FunnelVisual({ inputs, outputs, impacts }: FunnelVisualProps) {
  const { cliques, leads = 0, mql = 0, sql = 0, reunioes = 0, contratos = 0 } = inputs;
  
  // Find biggest drop-off
  const biggestDropIdx = impacts.reduce((maxIdx, impact, idx, arr) => {
    if (impact.status === 'critico' && impact.gapPp !== undefined) {
      const currentGap = Math.abs(impact.gapPp);
      const maxGap = arr[maxIdx]?.gapPp !== undefined ? Math.abs(arr[maxIdx].gapPp) : 0;
      return currentGap > maxGap ? idx : maxIdx;
    }
    return maxIdx;
  }, 0);

  // Build funnel levels
  const levels = cliques ? [
    { label: 'Cliques', value: cliques, key: null },
    { label: 'Leads', value: leads, key: 'lead_to_mql' },
    { label: 'MQL', value: mql, key: 'mql_to_sql' },
    { label: 'SQL', value: sql, key: 'sql_to_meeting' },
    { label: 'Reuniões', value: reunioes, key: 'meeting_to_win' },
    { label: 'Contratos', value: contratos, key: null },
  ] : [
    { label: 'Leads', value: leads, key: 'lead_to_mql' },
    { label: 'MQL', value: mql, key: 'mql_to_sql' },
    { label: 'SQL', value: sql, key: 'sql_to_meeting' },
    { label: 'Reuniões', value: reunioes, key: 'meeting_to_win' },
    { label: 'Contratos', value: contratos, key: null },
  ];

  const maxValue = Math.max(...levels.map(l => l.value), 1);

  // Get conversion info for a level (converts TO this level from previous)
  const getConversionInfo = (index: number) => {
    if (index === 0) return null;
    
    const prevLevel = levels[index - 1];
    const currentLevel = levels[index];
    
    // Find impact for this conversion
    const stageId = currentLevel.key || prevLevel.key;
    const impact = impacts.find(i => i.stageId === stageId);
    
    if (!impact || impact.current.rate === undefined) return null;
    
    return {
      rate: impact.current.rate,
      target: impact.target.rate,
      status: impact.status,
      isBiggestDrop: impacts.indexOf(impact) === biggestDropIdx && impact.status === 'critico',
    };
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Funil do Período</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="space-y-1">
            {levels.map((level, index) => {
              const widthPercent = Math.max((level.value / maxValue) * 100, 15);
              const conversion = getConversionInfo(index);
              const config = conversion ? statusConfig[conversion.status] : null;
              
              return (
                <div key={level.label}>
                  {/* Conversion arrow between levels */}
                  {conversion && (
                    <div className="flex items-center justify-center py-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn(
                            "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border",
                            config?.text,
                            config?.border,
                            "bg-background/50",
                            conversion.isBiggestDrop && "ring-2 ring-red-500/50 ring-offset-1"
                          )}>
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                            <span className="font-semibold">{formatPercent(conversion.rate)}</span>
                            <span className="text-muted-foreground/70">/ {formatPercent(conversion.target)}</span>
                            {conversion.isBiggestDrop && (
                              <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 ml-1">
                                Maior queda
                              </Badge>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            {levels[index - 1].label} → {level.label}: {formatPercent(conversion.rate)}
                            <br />
                            Meta: {formatPercent(conversion.target)}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  
                  {/* Funnel bar */}
                  <motion.div
                    className="relative mx-auto"
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                    style={{ minWidth: '100px' }}
                  >
                    <div 
                      className={cn(
                        "h-10 rounded-lg flex items-center justify-center relative overflow-hidden",
                        index === 0 ? "bg-primary" : 
                        index === levels.length - 1 ? "bg-green-600" : 
                        "bg-primary/80"
                      )}
                      style={{
                        clipPath: index === 0 ? 'none' : 
                          `polygon(${3}% 0, ${100 - 3}% 0, 100% 100%, 0% 100%)`
                      }}
                    >
                      <span className="font-bold text-sm text-primary-foreground z-10">
                        {level.value.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </motion.div>
                  
                  {/* Label */}
                  <p className="text-center text-xs font-medium text-muted-foreground mt-0.5">
                    {level.label}
                  </p>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
        
        {/* Status legend */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t text-xs justify-center">
          {Object.entries(statusConfig).filter(([k]) => k !== 'sem_dados').map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1">
              <span className={cn("w-2 h-2 rounded-full", cfg.color)} />
              <span className="text-muted-foreground">{cfg.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
