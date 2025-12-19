import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Users } from "lucide-react";
import { StageImpact } from "@/lib/insideSalesMatrix/impact";
import { InsideSalesOutputs, formatPercent, formatCurrency } from "@/lib/insideSalesMatrix/calc";
import { Targets } from "@/lib/insideSalesMatrix/status";
import { MatrixRule } from "@/lib/insideSalesMatrix/rules";

interface ActionSplitCardProps {
  impacts: StageImpact[];
  outputs: InsideSalesOutputs;
  targets: Targets;
  rules: MatrixRule[];
}

type ActionCategory = 'midia' | 'processo';

interface ActionRecommendation {
  category: ActionCategory;
  metric: string;
  currentValue: string;
  targetValue: string;
  action: string;
  status: 'critico' | 'atencao';
}

export function ActionSplitCard({ impacts, outputs, targets, rules }: ActionSplitCardProps) {
  // Identify media metrics issues (CTR, CPC, CPL, CVR click→lead)
  const mediaMetrics: ActionRecommendation[] = [];
  const processMetrics: ActionRecommendation[] = [];

  // Check CTR
  if (outputs.ctr !== undefined && targets.ctr?.value) {
    const status = outputs.ctr < targets.ctr.value * 0.8 ? 'critico' : 
                   outputs.ctr < targets.ctr.value ? 'atencao' : null;
    if (status) {
      mediaMetrics.push({
        category: 'midia',
        metric: 'CTR',
        currentValue: formatPercent(outputs.ctr),
        targetValue: formatPercent(targets.ctr.value),
        action: 'Revisar criativos e segmentação de público',
        status,
      });
    }
  }

  // Check CPL
  if (outputs.cpl !== undefined && targets.cpl?.value) {
    const status = outputs.cpl > targets.cpl.value * 1.2 ? 'critico' : 
                   outputs.cpl > targets.cpl.value ? 'atencao' : null;
    if (status) {
      mediaMetrics.push({
        category: 'midia',
        metric: 'CPL',
        currentValue: formatCurrency(outputs.cpl),
        targetValue: formatCurrency(targets.cpl.value),
        action: 'Otimizar campanhas para reduzir custo por lead',
        status,
      });
    }
  }

  // Check CVR click→lead
  if (outputs.cvrClickLead !== undefined && targets.cvrClickLead?.value) {
    const status = outputs.cvrClickLead < targets.cvrClickLead.value * 0.8 ? 'critico' : 
                   outputs.cvrClickLead < targets.cvrClickLead.value ? 'atencao' : null;
    if (status) {
      mediaMetrics.push({
        category: 'midia',
        metric: 'CVR Clique→Lead',
        currentValue: formatPercent(outputs.cvrClickLead),
        targetValue: formatPercent(targets.cvrClickLead.value),
        action: 'Melhorar landing page ou formulário',
        status,
      });
    }
  }

  // Process metrics from impacts (stage conversions)
  impacts.forEach(impact => {
    if (impact.status === 'critico' || impact.status === 'atencao') {
      const matchingRule = rules.find(r => 
        r.stage.toLowerCase().includes(impact.stageId.replace(/_/g, ' ').toLowerCase().split('_')[0])
      );
      
      processMetrics.push({
        category: 'processo',
        metric: impact.stageName,
        currentValue: impact.current.rate !== undefined ? formatPercent(impact.current.rate) : '-',
        targetValue: formatPercent(impact.target.rate),
        action: matchingRule?.action || 'Revisar processo desta etapa',
        status: impact.status as 'critico' | 'atencao',
      });
    }
  });

  // Limit to top 2 each
  const topMedia = mediaMetrics.slice(0, 2);
  const topProcess = processMetrics.slice(0, 2);

  const getRecommendedAction = (items: ActionRecommendation[]): string => {
    if (items.length === 0) return 'Métricas dentro da meta';
    return items[0].action;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Alavancas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {/* Mídia Column */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 pb-1 border-b">
              <Megaphone className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs font-semibold text-blue-600">Mídia</span>
            </div>
            
            {topMedia.length > 0 ? (
              <div className="space-y-1.5">
                {topMedia.map((item, idx) => (
                  <div key={idx} className="text-xs p-1.5 rounded bg-blue-500/5 border border-blue-500/10">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.metric}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-[9px] px-1 py-0 h-4 ${
                          item.status === 'critico' ? 'border-red-500/30 text-red-600' : 'border-yellow-500/30 text-yellow-600'
                        }`}
                      >
                        {item.currentValue}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">OK</p>
            )}
            
            <div className="pt-1 border-t">
              <p className="text-[10px] text-muted-foreground mb-0.5">Próxima ação:</p>
              <p className="text-xs font-medium leading-tight">{getRecommendedAction(topMedia)}</p>
            </div>
          </div>

          {/* Processo Column */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 pb-1 border-b">
              <Users className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-xs font-semibold text-purple-600">Processo</span>
            </div>
            
            {topProcess.length > 0 ? (
              <div className="space-y-1.5">
                {topProcess.map((item, idx) => (
                  <div key={idx} className="text-xs p-1.5 rounded bg-purple-500/5 border border-purple-500/10">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{item.metric.split(' → ')[1] || item.metric}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-[9px] px-1 py-0 h-4 shrink-0 ${
                          item.status === 'critico' ? 'border-red-500/30 text-red-600' : 'border-yellow-500/30 text-yellow-600'
                        }`}
                      >
                        {item.currentValue}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">OK</p>
            )}
            
            <div className="pt-1 border-t">
              <p className="text-[10px] text-muted-foreground mb-0.5">Próxima ação:</p>
              <p className="text-xs font-medium leading-tight">{getRecommendedAction(topProcess)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
