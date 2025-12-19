import { motion } from "framer-motion";
import { formatMetricByKey } from "@/lib/insideSalesMatrix/calc";
import { MetricStatus } from "@/lib/insideSalesMatrix/status";
import { cn } from "@/lib/utils";

interface FunnelStage {
  id: string;
  label: string;
  value: number | undefined;
  conversionRate?: number;
  conversionKey?: string;
  conversionStatus?: MetricStatus;
}

interface FunnelChartProps {
  stages: FunnelStage[];
  className?: string;
}

const statusColors: Record<MetricStatus, { bar: string; text: string; badge: string }> = {
  positivo: { 
    bar: "bg-green-500", 
    text: "text-white",
    badge: "bg-green-500/10 text-green-600 border-green-500/30"
  },
  atencao: { 
    bar: "bg-yellow-500", 
    text: "text-white",
    badge: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
  },
  negativo: { 
    bar: "bg-red-500", 
    text: "text-white",
    badge: "bg-red-500/10 text-red-600 border-red-500/30"
  },
  sem_dados: { 
    bar: "bg-muted", 
    text: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground"
  },
};

export function FunnelChart({ stages, className }: FunnelChartProps) {
  const maxValue = Math.max(...stages.map(s => s.value ?? 0), 1);

  return (
    <div className={cn("space-y-1", className)}>
      {stages.map((stage, index) => {
        const widthPercent = maxValue > 0 && stage.value !== undefined 
          ? Math.max((stage.value / maxValue) * 100, 12) 
          : 12;
        
        const showConversion = index > 0 && stage.conversionRate !== undefined;
        const status = stage.conversionStatus || 'sem_dados';
        const colors = statusColors[status];
        
        // First stage uses primary color
        const barColor = index === 0 ? "bg-primary" : colors.bar;
        const textColor = index === 0 ? "text-primary-foreground" : colors.text;
        
        return (
          <div key={stage.id} className="relative">
            {/* Conversion arrow/label between stages */}
            {showConversion && (
              <div className="flex items-center justify-center py-1.5">
                <div className={cn(
                  "flex items-center gap-2 text-xs px-2 py-0.5 rounded-full border",
                  colors.badge
                )}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <span className="font-semibold">
                    {formatMetricByKey(stage.conversionKey || '', stage.conversionRate)}
                  </span>
                </div>
              </div>
            )}
            
            {/* Funnel bar */}
            <div className="flex items-center gap-3">
              <motion.div
                className={cn(
                  "h-11 rounded-lg flex items-center justify-center relative overflow-hidden shadow-sm",
                  barColor
                )}
                initial={{ width: 0 }}
                animate={{ width: `${widthPercent}%` }}
                transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
                style={{ minWidth: "90px", marginLeft: "auto", marginRight: "auto" }}
              >
                <span className={cn("font-bold text-lg z-10", textColor)}>
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
