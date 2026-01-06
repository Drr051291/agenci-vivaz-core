import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InsideSalesInputs, InsideSalesOutputs, formatPercent } from "@/lib/insideSalesMatrix/calc";
import { StageImpact } from "@/lib/insideSalesMatrix/impact";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

interface FunnelVisualProps {
  inputs: InsideSalesInputs;
  outputs: InsideSalesOutputs;
  impacts: StageImpact[];
}

const statusConfig = {
  ok: { label: 'OK', color: 'bg-green-500', text: 'text-green-600', border: 'border-green-500/30', bg: 'bg-green-500/10' },
  atencao: { label: 'Atenção', color: 'bg-yellow-500', text: 'text-yellow-600', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10' },
  critico: { label: 'Crítico', color: 'bg-red-500', text: 'text-red-600', border: 'border-red-500/30', bg: 'bg-red-500/10' },
  sem_dados: { label: '—', color: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted', bg: 'bg-muted/30' },
  baixa_amostra: { label: 'N/A', color: 'bg-purple-500', text: 'text-purple-600', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
};

export function FunnelVisual({ inputs, outputs, impacts }: FunnelVisualProps) {
  const { cliques, leads = 0, mql = 0, sql = 0, contratos = 0 } = inputs;
  
  // Find biggest drop-off
  const biggestDropIdx = impacts.reduce((maxIdx, impact, idx, arr) => {
    if (impact.status === 'critico' && impact.gapPp !== undefined) {
      const currentGap = Math.abs(impact.gapPp);
      const maxGap = arr[maxIdx]?.gapPp !== undefined ? Math.abs(arr[maxIdx].gapPp) : 0;
      return currentGap > maxGap ? idx : maxIdx;
    }
    return maxIdx;
  }, 0);

  // Build funnel levels (simplificado: sem Reuniões)
  const levels = cliques ? [
    { label: 'Cliques', value: cliques, key: null },
    { label: 'Leads', value: leads, key: 'lead_to_mql' },
    { label: 'MQL', value: mql, key: 'mql_to_sql' },
    { label: 'SQL', value: sql, key: 'sql_to_win' },
    { label: 'Contratos', value: contratos, key: null },
  ] : [
    { label: 'Leads', value: leads, key: 'lead_to_mql' },
    { label: 'MQL', value: mql, key: 'mql_to_sql' },
    { label: 'SQL', value: sql, key: 'sql_to_win' },
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
    
    if (!impact) return null;
    
    const isEligible = impact.status !== 'baixa_amostra' && impact.status !== 'sem_dados';
    
    return {
      rate: impact.current.rate,
      target: impact.target.rate,
      status: impact.status,
      isBiggestDrop: impacts.indexOf(impact) === biggestDropIdx && impact.status === 'critico',
      isEligible,
    };
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Funil do Período</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="space-y-0.5">
            {levels.map((level, index) => {
              const widthPercent = Math.max((level.value / maxValue) * 100, 15);
              const conversion = getConversionInfo(index);
              const config = conversion ? statusConfig[conversion.status] : null;
              
              return (
                <div key={level.label}>
                  {/* 3-Value Strip: Atual | Meta | Bench + Status */}
                  {conversion && (
                    <div className="flex items-center justify-center py-1.5 gap-1">
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border",
                        config?.border,
                        config?.bg,
                      )}>
                        {conversion.isEligible && conversion.rate !== undefined ? (
                          <>
                            <span className="font-semibold">{formatPercent(conversion.rate)}</span>
                            <span className="text-muted-foreground/60">|</span>
                            <span className="text-muted-foreground">{formatPercent(conversion.target)}</span>
                          </>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Info className="h-3 w-3" />
                                {conversion.status === 'baixa_amostra' ? 'Amostra' : '—'}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              {conversion.status === 'baixa_amostra' 
                                ? 'Amostra insuficiente para análise' 
                                : 'Preencha os dados'}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      {/* Status pill */}
                      {conversion.isEligible && (
                        <Badge 
                          variant="outline" 
                          className={cn("text-[9px] h-4 px-1", config?.text, config?.border)}
                        >
                          {config?.label}
                        </Badge>
                      )}
                      {/* Biggest drop marker */}
                      {conversion.isBiggestDrop && (
                        <Badge variant="destructive" className="text-[9px] h-4 px-1">
                          Gargalo
                        </Badge>
                      )}
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
                        "h-9 rounded-lg flex items-center justify-center relative overflow-hidden",
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
                  <p className="text-center text-[11px] font-medium text-muted-foreground mt-0.5">
                    {level.label}
                  </p>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
        
        {/* Minimal legend */}
        <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t text-[10px] justify-center">
          <span className="text-muted-foreground">Atual | Meta</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />OK
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />Atenção
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />Crítico
          </span>
        </div>
      </CardContent>
    </Card>
  );
}