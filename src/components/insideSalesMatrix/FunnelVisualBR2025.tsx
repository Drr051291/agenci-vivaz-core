import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InsideSalesInputs, InsideSalesOutputs, formatPercent } from "@/lib/insideSalesMatrix/calc";
import { StageImpact } from "@/lib/insideSalesMatrix/impact";
import { BR2025Context, getBR2025Profile, formatBenchmarkRange } from "@/lib/insideSalesMatrix/benchmarksBR2025";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info, TrendingDown } from "lucide-react";

interface FunnelVisualBR2025Props {
  inputs: InsideSalesInputs;
  outputs: InsideSalesOutputs;
  impacts: StageImpact[];
  br2025Context?: BR2025Context;
}

const statusConfig = {
  ok: { label: 'OK', color: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  atencao: { label: 'Atenção', color: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
  critico: { label: 'Crítico', color: 'bg-red-500', text: 'text-red-600', border: 'border-red-500/30', bg: 'bg-red-500/10' },
  sem_dados: { label: '—', color: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted', bg: 'bg-muted/30' },
  baixa_amostra: { label: 'N/A', color: 'bg-violet-500', text: 'text-violet-600', border: 'border-violet-500/30', bg: 'bg-violet-500/10' },
};

export function FunnelVisualBR2025({ inputs, outputs, impacts, br2025Context }: FunnelVisualBR2025Props) {
  const { impressoes, cliques, leads = 0, mql = 0, sql = 0, contratos = 0 } = inputs;
  
  // Get BR 2025 benchmark if context provided
  const benchProfile = br2025Context ? getBR2025Profile(br2025Context) : null;
  
  // Find biggest eligible drop-off
  const eligibleCritical = impacts.filter(i => i.isEligible && i.status === 'critico' && i.gapPp !== undefined);
  const biggestDrop = eligibleCritical.length > 0
    ? eligibleCritical.reduce((max, curr) => 
        Math.abs(curr.gapPp!) > Math.abs(max.gapPp!) ? curr : max
      )
    : null;
  
  // Build funnel levels dynamically
  const levels: { label: string; value: number; stageKey: string | null; optional?: boolean }[] = [];
  
  if (impressoes) levels.push({ label: 'Impressões', value: impressoes, stageKey: null, optional: true });
  if (cliques) levels.push({ label: 'Cliques', value: cliques, stageKey: null, optional: true });
  levels.push({ label: 'Leads', value: leads, stageKey: 'lead_to_mql' });
  levels.push({ label: 'MQL', value: mql, stageKey: 'mql_to_sql' });
  levels.push({ label: 'SQL', value: sql, stageKey: 'sql_to_win' });
  if (contratos > 0) levels.push({ label: 'Contratos', value: contratos, stageKey: null });
  
  const maxValue = Math.max(...levels.map(l => l.value), 1);
  
  // Get conversion info between levels
  const getConversionStrip = (index: number) => {
    if (index === 0) return null;
    
    const current = levels[index];
    const prev = levels[index - 1];
    
    // Find matching impact
    const impact = impacts.find(i => i.stageId === current.stageKey);
    if (!impact) return null;
    
    const isEligible = impact.isEligible;
    const isBiggestDrop = biggestDrop && impact.stageId === biggestDrop.stageId;
    
    // Benchmark hint (BR 2025)
    let benchHint: string | null = null;
    if (benchProfile && current.stageKey === 'lead_to_mql') {
      benchHint = `BR 2025: ${benchProfile.conversaoGeral.toFixed(1)}%`;
    }
    
    return {
      current: isEligible && impact.current.rate !== undefined ? impact.current.rate : undefined,
      target: impact.target.rate,
      benchmark: benchHint,
      status: impact.status,
      config: statusConfig[impact.status],
      isEligible,
      isBiggestDrop,
      eligibilityReason: impact.eligibilityReason,
    };
  };
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Funil Visual do Período</CardTitle>
          {benchProfile && (
            <Badge variant="outline" className="text-[10px]">
              BR 2025
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="space-y-0">
            {levels.map((level, index) => {
              const widthPercent = Math.max((level.value / maxValue) * 100, 20);
              const strip = getConversionStrip(index);
              
              return (
                <div key={level.label}>
                  {/* Conversion Strip */}
                  {strip && (
                    <div className="flex items-center justify-center py-1 gap-1.5">
                      {/* Rate strip: Atual | Meta | Bench */}
                      <div className={cn(
                        "flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] border",
                        strip.config?.border,
                        strip.config?.bg,
                      )}>
                        {strip.isEligible && strip.current !== undefined ? (
                          <>
                            <span className="font-bold">{formatPercent(strip.current)}</span>
                            <span className="text-muted-foreground/50">|</span>
                            <span className="text-muted-foreground">{formatPercent(strip.target)}</span>
                            {strip.benchmark && (
                              <>
                                <span className="text-muted-foreground/50">|</span>
                                <span className="text-primary/70 text-[9px]">{strip.benchmark}</span>
                              </>
                            )}
                          </>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-muted-foreground flex items-center gap-1 cursor-help">
                                <Info className="h-3 w-3" />
                                {strip.status === 'baixa_amostra' ? 'Amostra' : '—'}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs max-w-[200px]">
                              {strip.eligibilityReason || 'Preencha os dados do funil'}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      
                      {/* Status pill */}
                      {strip.isEligible && (
                        <Badge 
                          variant="outline" 
                          className={cn("text-[9px] h-4 px-1.5", strip.config?.text, strip.config?.border)}
                        >
                          {strip.config?.label}
                        </Badge>
                      )}
                      
                      {/* Biggest drop marker */}
                      {strip.isBiggestDrop && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge 
                              variant="destructive" 
                              className="text-[9px] h-4 px-1.5 gap-0.5"
                            >
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Maior queda
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            Etapa com maior gap elegível
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )}
                  
                  {/* Funnel bar */}
                  <motion.div
                    className="relative mx-auto"
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{ duration: 0.4, delay: index * 0.06 }}
                    style={{ minWidth: '80px' }}
                  >
                    <div 
                      className={cn(
                        "h-8 rounded-md flex items-center justify-center relative overflow-hidden transition-all",
                        index === 0 ? "bg-primary" : 
                        index === levels.length - 1 ? "bg-emerald-600" : 
                        "bg-primary/85"
                      )}
                      style={{
                        clipPath: index === 0 ? 'none' : 
                          `polygon(2% 0, 98% 0, 100% 100%, 0% 100%)`
                      }}
                    >
                      <span className="font-bold text-sm text-primary-foreground z-10">
                        {level.value.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </motion.div>
                  
                  {/* Label */}
                  <p className="text-center text-[10px] font-medium text-muted-foreground mt-0.5 mb-1">
                    {level.label}
                  </p>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
        
        {/* Minimal legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t text-[9px] justify-center text-muted-foreground">
          <span>Atual | Meta{benchProfile ? ' | BR 2025' : ''}</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />OK
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Atenção
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />Crítico
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
