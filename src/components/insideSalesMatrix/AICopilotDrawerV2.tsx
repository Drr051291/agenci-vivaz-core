import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, RefreshCw, Megaphone, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InsideSalesInputs, InsideSalesOutputs } from "@/lib/insideSalesMatrix/calc";
import { Targets } from "@/lib/insideSalesMatrix/status";
import { StageImpact } from "@/lib/insideSalesMatrix/impact";
import { MatrixRule } from "@/lib/insideSalesMatrix/rules";
import { ActionItemV2 } from "./ActionPlanV2";
import { cn } from "@/lib/utils";

interface AIAnalysisV2 {
  headline: string;
  confidence: 'Baixa' | 'Média' | 'Alta';
  snapshot: { stage: string; current: string; target: string; gap_pp: number; status: string }[];
  top_bottlenecks: { stage: string; why: string; impact: string; gap_pp: number }[];
  actions: { type: 'Mídia' | 'Processo'; stage: string; title: string; next_step: string; metric_to_watch: string; priority: 'Alta' | 'Média' | 'Baixa' }[];
  questions: string[];
}

interface AICopilotDrawerV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputs: InsideSalesInputs;
  outputs: InsideSalesOutputs;
  targets: Targets;
  impacts: StageImpact[];
  rules: MatrixRule[];
  onApplyPlan: (items: ActionItemV2[]) => void;
  cachedAnalysis?: AIAnalysisV2 | null;
  onAnalysisGenerated: (analysis: AIAnalysisV2) => void;
}

export function AICopilotDrawerV2({
  open, onOpenChange, inputs, outputs, targets, impacts, rules,
  onApplyPlan, cachedAnalysis, onAnalysisGenerated,
}: AICopilotDrawerV2Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisV2 | null>(cachedAnalysis || null);
  const [mode, setMode] = useState<'compacto' | 'detalhado'>('compacto');

  const generateAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('inside-sales-copilot-v2', {
        body: { inputs, outputs, targets, impacts, rules: rules.slice(0, 15), mode },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error.includes('429') ? 'Limite excedido. Tente em breve.' : data.error);
        return;
      }

      setAnalysis(data);
      onAnalysisGenerated(data);
      toast.success('Análise gerada!');
    } catch (err) {
      console.error('AI error:', err);
      toast.error('Erro ao gerar análise.');
    } finally {
      setLoading(false);
    }
  };

  const applyPlan = () => {
    if (!analysis?.actions) return;
    const items: ActionItemV2[] = analysis.actions.map(a => ({
      id: crypto.randomUUID(),
      title: a.title,
      stage: a.stage,
      type: a.type === 'Mídia' ? 'midia' : 'processo',
      priority: a.priority,
      status: 'A Fazer',
      metricFocus: a.metric_to_watch,
      nextStep: a.next_step,
    }));
    onApplyPlan(items);
    toast.success('Plano aplicado!');
    onOpenChange(false);
  };

  const midiaActions = analysis?.actions.filter(a => a.type === 'Mídia') || [];
  const processoActions = analysis?.actions.filter(a => a.type === 'Processo') || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Copiloto IA
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Mode toggle */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
            <TabsList className="w-full h-8">
              <TabsTrigger value="compacto" className="flex-1 text-xs">Compacto</TabsTrigger>
              <TabsTrigger value="detalhado" className="flex-1 text-xs">Detalhado</TabsTrigger>
            </TabsList>
          </Tabs>

          {!analysis && !loading && (
            <div className="text-center py-8">
              <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Análise estruturada com ações Mídia vs Processo</p>
              <Button onClick={generateAnalysis}><Sparkles className="h-4 w-4 mr-2" />Gerar Análise</Button>
            </div>
          )}

          {loading && (
            <div className="text-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Analisando...</p>
            </div>
          )}

          {analysis && !loading && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{analysis.headline}</p>
                  <Badge variant="outline" className="text-[10px] mt-1">{analysis.confidence}</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={generateAnalysis}><RefreshCw className="h-4 w-4" /></Button>
              </div>

              {/* Snapshot table */}
              <div className="border rounded-lg overflow-hidden">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-7 py-1">Etapa</TableHead>
                      <TableHead className="h-7 py-1 text-right">Atual</TableHead>
                      <TableHead className="h-7 py-1 text-right">Meta</TableHead>
                      <TableHead className="h-7 py-1 text-right">Gap</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.snapshot.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="py-1.5">{s.stage}</TableCell>
                        <TableCell className="py-1.5 text-right">{s.current}</TableCell>
                        <TableCell className="py-1.5 text-right">{s.target}</TableCell>
                        <TableCell className={cn("py-1.5 text-right font-medium", s.gap_pp < 0 ? "text-red-500" : "text-green-500")}>
                          {s.gap_pp > 0 ? '+' : ''}{s.gap_pp.toFixed(1)}pp
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Top bottlenecks */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Gargalos (Top 2)</p>
                {analysis.top_bottlenecks.slice(0, 2).map((b, i) => (
                  <p key={i} className="text-xs mb-1">• <strong>{b.stage}</strong>: {b.why}</p>
                ))}
              </div>

              {/* Actions grouped by type */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Plano de ação</p>
                  <Button size="sm" onClick={applyPlan}>Aplicar plano</Button>
                </div>

                {midiaActions.length > 0 && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2 space-y-1.5">
                    <div className="flex items-center gap-1.5"><Megaphone className="h-3 w-3 text-blue-600" /><span className="text-xs font-semibold text-blue-600">Mídia</span></div>
                    {midiaActions.slice(0, mode === 'compacto' ? 2 : 5).map((a, i) => (
                      <div key={i} className="text-xs bg-background/50 rounded p-1.5">
                        <div className="flex items-center gap-1"><Badge variant="outline" className="text-[9px] h-4 px-1">{a.priority}</Badge><span className="font-medium">{a.title}</span></div>
                        <p className="text-muted-foreground mt-0.5">→ {a.next_step}</p>
                      </div>
                    ))}
                  </div>
                )}

                {processoActions.length > 0 && (
                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-2 space-y-1.5">
                    <div className="flex items-center gap-1.5"><Users className="h-3 w-3 text-purple-600" /><span className="text-xs font-semibold text-purple-600">Processo</span></div>
                    {processoActions.slice(0, mode === 'compacto' ? 3 : 6).map((a, i) => (
                      <div key={i} className="text-xs bg-background/50 rounded p-1.5">
                        <div className="flex items-center gap-1"><Badge variant="outline" className="text-[9px] h-4 px-1">{a.priority}</Badge><span className="font-medium">{a.title}</span></div>
                        <p className="text-muted-foreground mt-0.5">→ {a.next_step}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Questions */}
              {analysis.questions.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Perguntas para destravar</p>
                  {analysis.questions.slice(0, 3).map((q, i) => <p key={i} className="text-xs text-muted-foreground">• {q}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
