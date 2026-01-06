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
import { SegmentoNegocio } from "@/lib/insideSalesMatrix/benchmarksSegmento";
import { ActionItemV2 } from "./ActionPlanV2";
import { ApplyPlanDialog } from "./ApplyPlanDialog";
import { cn } from "@/lib/utils";
import { InvestmentDensity, FormComplexity } from "@/lib/insideSalesMatrix/channelLogic";

interface AIActionItem {
  type?: 'Mídia' | 'Processo';
  stage: string;
  title: string;
  next_step: string;
  metric_to_watch: string;
  priority: 'Alta' | 'Média' | 'Baixa';
}

interface AIAnalysisV2 {
  headline: string;
  confidence: 'Baixa' | 'Média' | 'Alta';
  context?: { segmento?: string };
  snapshot: { stage: string; current: string; target: string; benchmark_range?: string; gap_pp: number; eligible?: boolean; status: string }[];
  bottlenecks?: { stage: string; reason: string; impact_level?: string }[];
  top_bottlenecks?: { stage: string; why: string; impact: string; gap_pp: number }[];
  actions: AIActionItem[] | { midia?: AIActionItem[]; processo?: AIActionItem[] };
  rules_used?: string[];
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
  onApplyPlan: (items: ActionItemV2[], options?: { linkToMeeting: boolean; meetingId?: string; createTasks: boolean }) => void;
  cachedAnalysis?: AIAnalysisV2 | null;
  onAnalysisGenerated: (analysis: AIAnalysisV2) => void;
  channel?: string;
  formComplexity?: FormComplexity;
  investmentDensity?: InvestmentDensity;
  adjustedTargets?: Targets;
  clientId?: string;
  segmentoNegocio?: SegmentoNegocio;
}

export function AICopilotDrawerV2({
  open, onOpenChange, inputs, outputs, targets, impacts, rules,
  onApplyPlan, cachedAnalysis, onAnalysisGenerated,
  channel, formComplexity, investmentDensity, adjustedTargets, clientId,
  segmentoNegocio,
}: AICopilotDrawerV2Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisV2 | null>(cachedAnalysis || null);
  const [mode, setMode] = useState<'compacto' | 'detalhado'>('compacto');
  const [showApplyDialog, setShowApplyDialog] = useState(false);

  const generateAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('inside-sales-copilot-v2', {
        body: { 
          inputs, outputs, targets, impacts, rules: rules.slice(0, 15), mode,
          channel, formComplexity, investmentDensity, adjustedTargets,
          segmentoNegocio,
        },
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

  // Handle both old and new action formats
  const getActionItems = (): ActionItemV2[] => {
    if (!analysis?.actions) return [];
    
    // New format: { midia: [], processo: [] }
    if ('midia' in analysis.actions || 'processo' in analysis.actions) {
      const actionsObj = analysis.actions as { midia?: AIActionItem[]; processo?: AIActionItem[] };
      const midiaActions = (actionsObj.midia || []).map(a => ({
        id: crypto.randomUUID(),
        title: a.title,
        stage: a.stage,
        type: 'midia' as const,
        priority: a.priority,
        status: 'A Fazer' as const,
        metricFocus: a.metric_to_watch,
        nextStep: a.next_step,
      }));
      const processoActions = (actionsObj.processo || []).map(a => ({
        id: crypto.randomUUID(),
        title: a.title,
        stage: a.stage,
        type: 'processo' as const,
        priority: a.priority,
        status: 'A Fazer' as const,
        metricFocus: a.metric_to_watch,
        nextStep: a.next_step,
      }));
      return [...midiaActions, ...processoActions];
    }
    
    // Old format: array
    return (analysis.actions as AIActionItem[]).map(a => ({
      id: crypto.randomUUID(),
      title: a.title,
      stage: a.stage,
      type: a.type === 'Mídia' ? 'midia' : 'processo',
      priority: a.priority,
      status: 'A Fazer',
      metricFocus: a.metric_to_watch,
      nextStep: a.next_step,
    }));
  };

  const handleApplyClick = () => {
    if (clientId) {
      setShowApplyDialog(true);
    } else {
      const items = getActionItems();
      onApplyPlan(items);
      toast.success('Plano aplicado!');
      onOpenChange(false);
    }
  };

  const handleApplyConfirm = (options: { linkToMeeting: boolean; meetingId?: string; createTasks: boolean }) => {
    const items = getActionItems();
    onApplyPlan(items, options);
    toast.success('Plano aplicado!');
    onOpenChange(false);
  };

  // Parse actions for display - with safety checks for various response formats
  const getMidiaActions = (): AIActionItem[] => {
    if (!analysis?.actions) return [];
    const actions = analysis.actions;
    
    // New format: { midia: [], processo: [] }
    if (typeof actions === 'object' && !Array.isArray(actions)) {
      const obj = actions as { midia?: AIActionItem[]; processo?: AIActionItem[] };
      return Array.isArray(obj.midia) ? obj.midia : [];
    }
    
    // Old format: array
    if (Array.isArray(actions)) {
      return actions.filter(a => a.type === 'Mídia');
    }
    
    return [];
  };
  
  const getProcessoActions = (): AIActionItem[] => {
    if (!analysis?.actions) return [];
    const actions = analysis.actions;
    
    // New format: { midia: [], processo: [] }
    if (typeof actions === 'object' && !Array.isArray(actions)) {
      const obj = actions as { midia?: AIActionItem[]; processo?: AIActionItem[] };
      return Array.isArray(obj.processo) ? obj.processo : [];
    }
    
    // Old format: array
    if (Array.isArray(actions)) {
      return actions.filter(a => a.type === 'Processo');
    }
    
    return [];
  };

  const midiaActions = getMidiaActions();
  const processoActions = getProcessoActions();

  // Get bottlenecks (handle both formats)
  const bottlenecks = analysis?.bottlenecks || analysis?.top_bottlenecks?.map(b => ({
    stage: b.stage,
    reason: b.why,
    impact_level: b.impact,
  })) || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Copiloto IA
            {segmentoNegocio && <Badge variant="outline" className="text-[10px]">{segmentoNegocio}</Badge>}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
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
                  <p className="font-semibold text-sm">{analysis.headline}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="outline" className="text-[10px]">{analysis.confidence}</Badge>
                    {analysis.context?.segmento && (
                      <Badge variant="secondary" className="text-[10px]">{analysis.context.segmento}</Badge>
                    )}
                  </div>
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
                      {segmentoNegocio && <TableHead className="h-7 py-1 text-right text-primary">Bench</TableHead>}
                      <TableHead className="h-7 py-1 text-right">Gap</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.snapshot.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="py-1.5">{s.stage}</TableCell>
                        <TableCell className="py-1.5 text-right">{s.current}</TableCell>
                        <TableCell className="py-1.5 text-right">{s.target}</TableCell>
                        {segmentoNegocio && <TableCell className="py-1.5 text-right text-primary">{s.benchmark_range || '—'}</TableCell>}
                        <TableCell className={cn("py-1.5 text-right font-medium", s.gap_pp < 0 ? "text-red-500" : "text-green-500")}>
                          {s.gap_pp > 0 ? '+' : ''}{s.gap_pp.toFixed(1)}pp
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Bottlenecks */}
              {bottlenecks.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Gargalos</p>
                  {bottlenecks.slice(0, 2).map((b, i) => (
                    <p key={i} className="text-xs mb-1">• <strong>{b.stage}</strong>: {b.reason}</p>
                  ))}
                </div>
              )}

              {/* Actions grouped */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Plano</p>
                  <Button size="sm" onClick={handleApplyClick}>Aplicar</Button>
                </div>

                {midiaActions.length > 0 && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2 space-y-1.5">
                    <div className="flex items-center gap-1.5"><Megaphone className="h-3 w-3 text-blue-600" /><span className="text-xs font-semibold text-blue-600">Mídia</span></div>
                    {midiaActions.slice(0, mode === 'compacto' ? 2 : 5).map((a, i) => (
                      <div key={i} className="text-xs bg-background/50 rounded p-1.5">
                        <div className="flex items-center gap-1"><Badge variant="outline" className="text-[9px] h-4 px-1">{a.priority}</Badge><span className="font-medium truncate">{a.title}</span></div>
                        <p className="text-muted-foreground mt-0.5 truncate">→ {a.next_step}</p>
                      </div>
                    ))}
                  </div>
                )}

                {processoActions.length > 0 && (
                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-2 space-y-1.5">
                    <div className="flex items-center gap-1.5"><Users className="h-3 w-3 text-purple-600" /><span className="text-xs font-semibold text-purple-600">Processo</span></div>
                    {processoActions.slice(0, mode === 'compacto' ? 3 : 6).map((a, i) => (
                      <div key={i} className="text-xs bg-background/50 rounded p-1.5">
                        <div className="flex items-center gap-1"><Badge variant="outline" className="text-[9px] h-4 px-1">{a.priority}</Badge><span className="font-medium truncate">{a.title}</span></div>
                        <p className="text-muted-foreground mt-0.5 truncate">→ {a.next_step}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Questions */}
              {analysis.questions.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Perguntas</p>
                  {analysis.questions.slice(0, 3).map((q, i) => <p key={i} className="text-xs text-muted-foreground">• {q}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
      
      <ApplyPlanDialog
        open={showApplyDialog}
        onOpenChange={setShowApplyDialog}
        actions={getActionItems()}
        clientId={clientId}
        onConfirm={handleApplyConfirm}
      />
    </Sheet>
  );
}