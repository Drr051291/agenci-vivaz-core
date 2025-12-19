import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InsideSalesInputs, InsideSalesOutputs } from "@/lib/insideSalesMatrix/calc";
import { Targets } from "@/lib/insideSalesMatrix/status";
import { StageImpact } from "@/lib/insideSalesMatrix/impact";
import { MatrixRule } from "@/lib/insideSalesMatrix/rules";
import { ActionItem } from "./ActionPlan";

interface AIAnalysis {
  headline: string;
  summary_bullets: string[];
  stage_analysis: {
    stage: string;
    current: { rate: number; counts: string };
    target: { rate: number };
    gap_pp: number;
    impact_estimate: { extra_contracts: number; notes: string };
    bottleneck_reason: string[];
    recommended_actions: { title: string; why: string; how: string[]; metric_to_watch: string }[];
  }[];
  week_plan: { title: string; stage: string; priority: string; steps: string[]; expected_result: string }[];
  questions_to_fill_gaps: string[];
}

interface AICopilotDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputs: InsideSalesInputs;
  outputs: InsideSalesOutputs;
  targets: Targets;
  impacts: StageImpact[];
  rules: MatrixRule[];
  onApplyPlan: (items: ActionItem[]) => void;
  cachedAnalysis?: AIAnalysis | null;
  onAnalysisGenerated: (analysis: AIAnalysis) => void;
}

export function AICopilotDrawer({
  open,
  onOpenChange,
  inputs,
  outputs,
  targets,
  impacts,
  rules,
  onApplyPlan,
  cachedAnalysis,
  onAnalysisGenerated,
}: AICopilotDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(cachedAnalysis || null);

  const generateAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('inside-sales-copilot', {
        body: {
          inputs,
          outputs,
          targets,
          impacts,
          rules: rules.slice(0, 20), // Limit rules sent
        },
      });

      if (error) throw error;
      
      if (data?.error) {
        if (data.error.includes('Rate limit') || data.error.includes('429')) {
          toast.error('Limite de requisições excedido. Tente novamente em alguns segundos.');
        } else if (data.error.includes('402')) {
          toast.error('Créditos insuficientes. Adicione créditos em Configurações.');
        } else {
          toast.error(data.error);
        }
        return;
      }

      setAnalysis(data);
      onAnalysisGenerated(data);
      toast.success('Análise gerada com sucesso!');
    } catch (err: any) {
      console.error('AI Copilot error:', err);
      toast.error('Erro ao gerar análise. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const applyWeekPlan = () => {
    if (!analysis?.week_plan) return;
    
    const items: ActionItem[] = analysis.week_plan.map((plan, index) => ({
      id: crypto.randomUUID(),
      title: plan.title,
      stage: plan.stage,
      priority: plan.priority as 'Alta' | 'Média' | 'Baixa',
      status: 'A Fazer' as const,
    }));
    
    onApplyPlan(items);
    toast.success('Plano aplicado!');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Copiloto de Diagnóstico
          </SheetTitle>
          <SheetDescription>
            Análise inteligente baseada nas regras da matriz e seus dados
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {!analysis && !loading && (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                O copiloto irá analisar seus dados e gerar um plano de ação estruturado.
              </p>
              <Button onClick={generateAnalysis} size="lg">
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar Análise
              </Button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Analisando dados...</p>
            </div>
          )}

          {analysis && !loading && (
            <div className="space-y-6">
              {/* Header & Refresh */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{analysis.headline}</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={generateAnalysis}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {/* Summary */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Resumo</p>
                <ul className="space-y-1">
                  {analysis.summary_bullets.map((bullet, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Stage Analysis */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Por etapa</p>
                {analysis.stage_analysis.map((stage, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{stage.stage}</span>
                      <Badge variant={stage.gap_pp < 0 ? 'destructive' : 'default'} className="text-xs">
                        {stage.gap_pp > 0 ? '+' : ''}{stage.gap_pp.toFixed(1)}pp
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stage.current.rate.toFixed(1)}% ({stage.current.counts}) → Meta: {stage.target.rate.toFixed(1)}%
                    </div>
                    {stage.impact_estimate.extra_contracts > 0 && (
                      <p className="text-xs text-primary">
                        Potencial: +{stage.impact_estimate.extra_contracts} contratos
                      </p>
                    )}
                    {stage.bottleneck_reason.length > 0 && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Causa: </span>
                        {stage.bottleneck_reason.join('; ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Week Plan */}
              {analysis.week_plan.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Plano da semana</p>
                    <Button size="sm" onClick={applyWeekPlan}>
                      Aplicar plano
                    </Button>
                  </div>
                  {analysis.week_plan.map((plan, i) => (
                    <div key={i} className="bg-primary/5 border border-primary/10 rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {plan.priority}
                        </Badge>
                        <span className="font-medium text-sm">{plan.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{plan.stage}</p>
                      <ul className="text-xs space-y-0.5 pl-4">
                        {plan.steps.map((step, j) => (
                          <li key={j} className="list-disc">{step}</li>
                        ))}
                      </ul>
                      <p className="text-xs text-primary">Resultado esperado: {plan.expected_result}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Questions */}
              {analysis.questions_to_fill_gaps.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Perguntas para aprofundar
                  </p>
                  <ul className="space-y-1">
                    {analysis.questions_to_fill_gaps.map((q, i) => (
                      <li key={i} className="text-sm text-muted-foreground">• {q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
