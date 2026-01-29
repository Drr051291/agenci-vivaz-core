import { Card, CardContent } from '@/components/ui/card';
import { Clock, AlertTriangle, Timer } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ComingSoonKPI {
  title: string;
  icon: 'clock' | 'alert' | 'timer';
}

const COMING_SOON_KPIS: ComingSoonKPI[] = [
  { title: 'Tempo médio por etapa', icon: 'timer' },
  { title: 'Gargalos (negócios parados)', icon: 'alert' },
  { title: 'Taxa de perda por etapa', icon: 'clock' },
];

export function FunnelComingSoon() {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-muted-foreground">Em breve</h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {COMING_SOON_KPIS.map((kpi) => {
          const Icon = {
            clock: Clock,
            alert: AlertTriangle,
            timer: Timer,
          }[kpi.icon];

          return (
            <Tooltip key={kpi.title}>
              <TooltipTrigger asChild>
                <Card className="opacity-50 cursor-not-allowed border-dashed">
                  <CardContent className="pt-4 pb-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {kpi.title}
                        </p>
                        <p className="text-lg font-bold text-muted-foreground/50">
                          —
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Em breve</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
