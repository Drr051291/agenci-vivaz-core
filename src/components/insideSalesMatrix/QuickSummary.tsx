import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, AlertTriangle, Target } from "lucide-react";
import { StageImpact } from "@/lib/insideSalesMatrix/impact";

interface QuickSummaryProps {
  gargalo1: StageImpact | null;
  gargalo2: StageImpact | null;
  melhorEtapa: StageImpact | null;
  confidence: { level: 'alta' | 'media' | 'baixa'; label: string; description: string };
}

export function QuickSummary({ gargalo1, gargalo2, melhorEtapa, confidence }: QuickSummaryProps) {
  const confidenceColors = {
    alta: 'bg-green-500/10 text-green-600 border-green-500/20',
    media: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    baixa: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Resumo Rápido</CardTitle>
          <Badge variant="outline" className={confidenceColors[confidence.level]}>
            {confidence.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Gargalo #1 */}
        <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
          <TrendingDown className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-red-600">Gargalo #1</p>
            {gargalo1 ? (
              <p className="text-sm font-semibold truncate">{gargalo1.stageName}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum identificado</p>
            )}
            {gargalo1?.impact && (
              <p className="text-xs text-muted-foreground">{gargalo1.impact.description}</p>
            )}
          </div>
        </div>

        {/* Gargalo #2 */}
        <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-yellow-600">Gargalo #2</p>
            {gargalo2 ? (
              <p className="text-sm font-semibold truncate">{gargalo2.stageName}</p>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
            {gargalo2?.impact && (
              <p className="text-xs text-muted-foreground">{gargalo2.impact.description}</p>
            )}
          </div>
        </div>

        {/* Melhor Etapa */}
        <div className="flex items-start gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/10">
          <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-green-600">Melhor etapa</p>
            {melhorEtapa ? (
              <p className="text-sm font-semibold truncate">{melhorEtapa.stageName}</p>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>

        {/* Confidence tooltip */}
        <p className="text-xs text-muted-foreground pt-1 border-t">
          {confidence.description}
        </p>
      </CardContent>
    </Card>
  );
}
