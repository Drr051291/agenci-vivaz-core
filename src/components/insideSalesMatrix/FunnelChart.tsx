import { motion } from "framer-motion";
import { formatMetricByKey } from "@/lib/insideSalesMatrix/calc";
import { cn } from "@/lib/utils";

interface FunnelStage {
  id: string;
  label: string;
  value: number | undefined;
  conversionRate?: number;
  conversionKey?: string;
}

interface FunnelChartProps {
  stages: FunnelStage[];
  className?: string;
}

export function FunnelChart({ stages, className }: FunnelChartProps) {
  const maxValue = Math.max(...stages.map(s => s.value ?? 0), 1);
  
  const colors = [
    "bg-primary",
    "bg-primary/80",
    "bg-primary/60",
    "bg-primary/40",
    "bg-primary/25",
  ];

  return (
    <div className={cn("space-y-2", className)}>
      {stages.map((stage, index) => {
        const widthPercent = maxValue > 0 && stage.value !== undefined 
          ? Math.max((stage.value / maxValue) * 100, 8) 
          : 8;
        
        const showConversion = index > 0 && stage.conversionRate !== undefined;
        
        return (
          <div key={stage.id} className="relative">
            {/* Conversion arrow/label between stages */}
            {showConversion && (
              <div className="flex items-center justify-center py-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <span className="font-medium text-foreground">
                    {formatMetricByKey(stage.conversionKey || '', stage.conversionRate)}
                  </span>
                </div>
              </div>
            )}
            
            {/* Funnel bar */}
            <div className="flex items-center gap-3">
              <motion.div
                className={cn(
                  "h-12 rounded-lg flex items-center justify-center relative overflow-hidden",
                  colors[index % colors.length]
                )}
                initial={{ width: 0 }}
                animate={{ width: `${widthPercent}%` }}
                transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
                style={{ minWidth: "80px", marginLeft: "auto", marginRight: "auto" }}
              >
                <span className="text-primary-foreground font-bold text-lg z-10">
                  {stage.value !== undefined ? stage.value.toLocaleString('pt-BR') : '-'}
                </span>
              </motion.div>
            </div>
            
            {/* Label */}
            <p className="text-center text-sm font-medium text-muted-foreground mt-1">
              {stage.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
