import { Card } from "@/components/ui/card";
import { ArrowDown, ArrowUp, LucideIcon } from "lucide-react";

interface ReporteiMetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: LucideIcon;
  format?: "number" | "currency" | "percentage";
}

export const ReporteiMetricCard = ({ 
  title, 
  value, 
  trend, 
  icon: Icon,
  format = "number" 
}: ReporteiMetricCardProps) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', { 
          style: 'currency', 
          currency: 'BRL' 
        }).format(val);
      case 'percentage':
        return `${val.toFixed(2)}%`;
      default:
        return new Intl.NumberFormat('pt-BR').format(val);
    }
  };

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground mb-2">
            {formatValue(value)}
          </p>
          {trend !== undefined && (
            <div className="flex items-center gap-1">
              {trend > 0 ? (
                <ArrowUp className="h-4 w-4 text-green-500" />
              ) : trend < 0 ? (
                <ArrowDown className="h-4 w-4 text-red-500" />
              ) : null}
              <span className={`text-sm font-medium ${
                trend > 0 ? 'text-green-500' : 
                trend < 0 ? 'text-red-500' : 
                'text-muted-foreground'
              }`}>
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        <div className="p-3 rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </Card>
  );
};
