import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Sparkles, RefreshCw, Megaphone, Users, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InsideSalesInputs, InsideSalesOutputs } from "@/lib/insideSalesMatrix/calc";
import { Targets } from "@/lib/insideSalesMatrix/status";
import { StageImpact } from "@/lib/insideSalesMatrix/impact";
import { ActionItemV2 } from "./ActionPlanV2";
import { ApplyPlanDialog } from "./ApplyPlanDialog";
import { cn } from "@/lib/utils";
import { BR2025Context } from "@/lib/insideSalesMatrix/benchmarksBR2025";

interface AIActionItem {
  priority: 'Alta' | 'Média' | 'Baixa';
  stage: string;
  title: string;
  next_step: string;
  metric_to_watch: string;
}

interface AIAnalysisBR2025 {
  headline: string;
  confidence_score: number;
  bench_context: BR2025Context;
  snapshot: { stage: string; current: string; target: string; eligible: boolean; status: string }[];
  bottlenecks: { stage: string; why: string; bench_hint: string }[];
  actions: {
    midia: AIActionItem[];
    processo: AIActionItem[];
  };
  questions: string[];
}

interface AICopilotDrawerBR2025Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputs: InsideSalesInputs;
  outputs: InsideSalesOutputs;
  targets: Targets;
  impacts: StageImpact[];
  context: BR2025Context;
  eligibleStages: string[];
  onApplyPlan: (items: ActionItemV2[], options?: { linkToMeeting: boolean; meetingId?: string; createTasks: boolean }) => void;
  clientId?: string;
}

export function AICopilotDrawerBR2025({
  open, onOpenChange, inputs, outputs, targets, impacts, context, eligibleStages,
  onApplyPlan, clientId,
}: AICopilotDrawerBR2025Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysisBR2025 | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);

  const generateAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('inside-sales-copilot-br2025', {
        body: { inputs, outputs, targets, impacts, context, eligibleStages },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error.includes('429') ? 'Limite excedido. Tente em breve.' : data.error);
        return;
      }

      setAnalysis(data);
      toast.success('Análise gerada!');
    } catch (err) {
      console.error('AI error:', err);
      toast.error('Erro ao gerar análise.');
    } finally {
      setLoading(false);
    }
  };

  const getActionItems = (): ActionItemV2[] => {
    if (!analysis?.actions) return [];
    
    const midiaActions = (analysis.actions.midia || []).map(a => ({
      id: crypto.randomUUID(),
      title: a.title,
      stage: a.stage,
      type: 'midia' as const,
      priority: a.priority,
      status: 'A Fazer' as const,
      metricFocus: a.metric_to_watch,
      nextStep: a.next_step,
    }));
    const processoActions = (analysis.actions.processo || []).map(a => ({
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Crítico': return 'text-red-500';
      case 'Atenção': return 'text-yellow-500';
      case 'OK': return 'text-green-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Copiloto IA — BR 2025
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Context chips */}
          <div className="flex flex-wrap gap-1">
            {context.mercado && <Badge variant="secondary" className="text-[10px]">{context.mercado}</Badge>}
            {context.segmento && <Badge variant="outline" className="text-[10px]">{context.segmento}</Badge>}
            {context.canal && <Badge variant="outline" className="text-[10px]">{context.canal}</Badge>}
            {context.captura && <Badge variant="outline" className="text-[10px]">{context.captura}</Badge>}
            {context.whatsappCrm && <Badge variant="outline" className="text-[10px]">WhatsApp CRM</Badge>}
          </div>

          {!analysis && !loading && (
            <div className="text-center py-8">
              <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">Análise baseada no estudo Benchmark Brasil 2025</p>
              <Button onClick={generateAnalysis}><Sparkles className="h-4 w-4 mr-2" />Gerar Análise</Button>
            </div>
          )}

          {loading && (
            <div className="text-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Analisando com benchmarks BR 2025...</p>
            </div>
          )}

          {analysis && !loading && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{analysis.headline}</p>
                  <Badge variant="outline" className="text-[10px] mt-1">Confiança: {analysis.confidence_score}</Badge>
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
                      <TableHead className="h-7 py-1 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.snapshot.map((s, i) => (
                      <TableRow key={i} className={!s.eligible ? 'opacity-50' : ''}>
                        <TableCell className="py-1.5">{s.stage}</TableCell>
                        <TableCell className="py-1.5 text-right">{s.current}</TableCell>
                        <TableCell className="py-1.5 text-right">{s.target}</TableCell>
                        <TableCell className="py-1.5 text-center">
                          <Badge variant="outline" className={cn("text-[9px]", getStatusColor(s.status))}>
                            {s.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Bottlenecks */}
              {analysis.bottlenecks.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Gargalos</p>
                  {analysis.bottlenecks.slice(0, 2).map((b, i) => (
                    <div key={i} className="text-xs mb-2 p-2 bg-destructive/5 border border-destructive/20 rounded">
                      <p className="font-medium">{b.stage}</p>
                      <p className="text-muted-foreground">{b.why}</p>
                      <p className="text-primary text-[10px] mt-1">{b.bench_hint}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions grouped */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Plano de Ação</p>
                  <Button size="sm" onClick={handleApplyClick}>
                    <Check className="h-3 w-3 mr-1" />
                    Aplicar
                  </Button>
                </div>

                {analysis.actions.midia.length > 0 && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2 space-y-1.5">
                    <div className="flex items-center gap-1.5"><Megaphone className="h-3 w-3 text-blue-600" /><span className="text-xs font-semibold text-blue-600">Mídia</span></div>
                    {analysis.actions.midia.slice(0, 2).map((a, i) => (
                      <div key={i} className="text-xs bg-background/50 rounded p-1.5">
                        <div className="flex items-center gap-1"><Badge variant="outline" className="text-[9px] h-4 px-1">{a.priority}</Badge><span className="font-medium truncate">{a.title}</span></div>
                        <p className="text-muted-foreground mt-0.5 truncate">→ {a.next_step}</p>
                      </div>
                    ))}
                  </div>
                )}

                {analysis.actions.processo.length > 0 && (
                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-2 space-y-1.5">
                    <div className="flex items-center gap-1.5"><Users className="h-3 w-3 text-purple-600" /><span className="text-xs font-semibold text-purple-600">Processo</span></div>
                    {analysis.actions.processo.slice(0, 3).map((a, i) => (
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
