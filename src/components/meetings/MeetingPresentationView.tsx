import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Users, 
  Target, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  ListTodo,
  Stethoscope,
  Wrench, 
  MessageSquare,
  Sparkles,
  Award,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/dateUtils";
import { MeetingViewer } from "@/components/meeting-editor/MeetingViewer";
import { MetricsSection } from "@/components/meetings/MetricsSection";
import { ChannelsSection } from "@/components/meetings/ChannelsSection";
import { DiagnosisPickerSection } from "@/components/meetings/v2/DiagnosisPickerSection";
import { cn } from "@/lib/utils";

interface MeetingData {
  id: string;
  title: string;
  meeting_date: string;
  participants?: string[] | null;
  content?: string;
  action_items?: string[] | null;
  next_period_priority?: string | null;
  analysis_period_start?: string | null;
  analysis_period_end?: string | null;
}

interface Metric {
  metric_key: string;
  metric_label: string;
  target_value: number | null;
  actual_value: number | null;
  unit: string | null;
}

interface Channel {
  channel: string;
  investment: number | null;
  impressions?: number | null;
  clicks?: number | null;
  leads: number | null;
  conversions: number | null;
  revenue: number | null;
  notes?: string;
  cpl?: number | null;
  cpa?: number | null;
  roas?: number | null;
  what_worked?: string | null;
  what_to_adjust?: string | null;
}

interface DiagnosisItem {
  tagId: string;
  tagLabel: string;
  context: string;
  solution: string;
}

interface ActionPlanItem {
  title: string;
  responsible?: string;
  deadline?: string;
  status?: string;
  owner_type?: string;
  category?: string;
}

interface RecentTask {
  id: string;
  title: string;
  status: string;
  priority?: string;
  profiles?: { full_name: string } | null;
}

interface MeetingSection {
  section_key: string;
  content_json: any;
}

interface MeetingPresentationViewProps {
  meeting: MeetingData;
  sections: MeetingSection[];
  metrics: Metric[];
  channels: Channel[];
  recentTasks?: RecentTask[];
  actionPlanItems?: ActionPlanItem[];
  className?: string;
}

const PRIORITY_LABELS: Record<string, string> = {
  growth: "🚀 Crescimento",
  optimization: "⚡ Otimização",
  retention: "🎯 Retenção",
  branding: "✨ Branding",
  testing: "🧪 Testes",
  maintenance: "🔧 Manutenção"
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-amber-100 text-amber-700" },
  em_andamento: { label: "Em andamento", className: "bg-blue-100 text-blue-700" },
  concluido: { label: "Concluído", className: "bg-green-100 text-green-700" },
  solicitado: { label: "Solicitado", className: "bg-gray-100 text-gray-700" },
  pending: { label: "Pendente", className: "bg-amber-100 text-amber-700" },
  in_progress: { label: "Em andamento", className: "bg-blue-100 text-blue-700" },
  completed: { label: "Concluído", className: "bg-green-100 text-green-700" },
};

export function MeetingPresentationView({
  meeting,
  sections,
  metrics,
  channels,
  recentTasks = [],
  actionPlanItems = [],
  className
}: MeetingPresentationViewProps) {
  
  const getSectionContent = (key: string): any => {
    const section = sections.find(s => s.section_key === key);
    return section?.content_json;
  };

  const formatPeriod = () => {
    if (meeting.analysis_period_start && meeting.analysis_period_end) {
      try {
        const start = format(parseLocalDate(meeting.analysis_period_start), "dd MMM", { locale: ptBR });
        const end = format(parseLocalDate(meeting.analysis_period_end), "dd MMM", { locale: ptBR });
        return `${start} - ${end}`;
      } catch {
        return null;
      }
    }
    return null;
  };

  const formatMeetingDate = () => {
    try {
      return format(parseLocalDate(meeting.meeting_date.split('T')[0]), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return "Data não definida";
    }
  };

  const objective = getSectionContent("objective");
  const context = getSectionContent("context");
  const executiveSummary = getSectionContent("executive_summary");
  const diagnosisItems = getSectionContent("diagnosis_items");
  const questionsDiscussions = getSectionContent("questions_discussions");
  const periodText = formatPeriod();

  // Convert metrics to format expected by MetricsSection
  const metricsForSection = metrics.map(m => ({
    metric_key: m.metric_key,
    metric_label: m.metric_label,
    target_value: m.target_value,
    actual_value: m.actual_value,
    unit: m.unit || ""
  }));

  // Convert channels to format expected by ChannelsSection
  const channelsForSection = channels.map(c => ({
    channel: c.channel,
    investment: c.investment || 0,
    impressions: c.impressions || 0,
    clicks: c.clicks || 0,
    leads: c.leads || 0,
    conversions: c.conversions || 0,
    revenue: c.revenue || 0,
    notes: c.notes || ""
  }));

  // Check if we have new methodology content
  const hasNewContent = sections.length > 0 || metrics.length > 0 || channels.length > 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-3">
          <FileText className="h-4 w-4" />
          Reunião
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold mb-3">{meeting.title}</h1>
        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{formatMeetingDate()}</span>
          </div>
          {periodText && (
            <>
              <span className="text-border">•</span>
              <span>Período: {periodText}</span>
            </>
          )}
          {meeting.participants && meeting.participants.length > 0 && (
            <>
              <span className="text-border">•</span>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{meeting.participants.join(", ")}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {hasNewContent ? (
        <>
          {/* 1. Abertura e Alinhamento */}
          {(objective?.text || context?.text) && (
            <Card className="transition-all">
              <CardContent className="p-6 lg:p-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Abertura e Alinhamento
                </h2>
                {objective?.text && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-1">Objetivo</p>
                    <p className="text-lg">{objective.text}</p>
                  </div>
                )}
                {context?.text && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Contexto</p>
                    <p>{context.text}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 2. Resumo Executivo */}
          {(executiveSummary?.periodHighlights?.filter((b: string) => b).length > 0 || 
            executiveSummary?.mainWins?.filter((b: string) => b).length > 0 ||
            executiveSummary?.mainRisks?.filter((b: string) => b).length > 0 ||
            executiveSummary?.items?.filter((b: string) => b).length > 0 ||
            meeting.next_period_priority) && (
            <Card className="transition-all">
              <CardContent className="p-6 lg:p-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Resumo Executivo
                </h2>
                
                {executiveSummary?.periodHighlights?.filter((b: string) => b).length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <Sparkles className="h-4 w-4" /> Destaques do Período
                    </p>
                    <ul className="space-y-1">
                      {executiveSummary.periodHighlights.filter((b: string) => b).map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3">
                          <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {executiveSummary?.mainWins?.filter((b: string) => b).length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <Award className="h-4 w-4 text-green-600" /> Principais Vitórias
                    </p>
                    <ul className="space-y-1">
                      {executiveSummary.mainWins.filter((b: string) => b).map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {executiveSummary?.mainRisks?.filter((b: string) => b).length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-amber-600" /> Principais Riscos
                    </p>
                    <ul className="space-y-1">
                      {executiveSummary.mainRisks.filter((b: string) => b).map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="text-amber-600 mt-0.5">⚠</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Legacy items support */}
                {executiveSummary?.items?.filter((b: string) => b).length > 0 && !executiveSummary?.periodHighlights && (
                  <ul className="space-y-2">
                    {executiveSummary.items.filter((b: string) => b).map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                
                {meeting.next_period_priority && (
                  <div className="pt-4 border-t mt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <ArrowRight className="h-4 w-4" /> Próxima Prioridade
                    </p>
                    <Badge variant="outline" className="text-sm">
                      {PRIORITY_LABELS[meeting.next_period_priority] || meeting.next_period_priority}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}


          {/* 4. Análise de KPIs */}
          {metrics.length > 0 && (
            <Card className="transition-all">
              <CardContent className="p-6 lg:p-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Análise de KPIs
                </h2>
                <MetricsSection metrics={metricsForSection} onChange={() => {}} isEditing={false} />
              </CardContent>
            </Card>
          )}

          {/* 5. Desempenho por Canal */}
          {channels.length > 0 && (
            <Card className="transition-all">
              <CardContent className="p-6 lg:p-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Desempenho por Canal
                </h2>
                <ChannelsSection channels={channelsForSection} onChange={() => {}} isEditing={false} />
              </CardContent>
            </Card>
          )}

          {/* 6. Diagnóstico */}
          {diagnosisItems?.items && diagnosisItems.items.length > 0 && (
            <Card className="transition-all">
              <CardContent className="p-6 lg:p-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  Diagnóstico
                </h2>
                <DiagnosisPickerSection items={diagnosisItems.items} onChange={() => {}} isEditing={false} />
              </CardContent>
            </Card>
          )}

          {/* 7. Plano de Ação */}
          {actionPlanItems.length > 0 && (
            <Card className="transition-all">
              <CardContent className="p-6 lg:p-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  Plano de Ação
                </h2>
                <div className="space-y-3">
                  {actionPlanItems.map((item, idx) => {
                    const statusConfig = STATUS_CONFIG[item.status || 'pending'] || STATUS_CONFIG.pending;
                    return (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">{idx + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {item.category && (
                              <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                            )}
                            {item.status && (
                              <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
                                {statusConfig.label}
                              </Badge>
                            )}
                            {item.owner_type && (
                              <Badge variant="outline" className="text-xs">
                                {item.owner_type === 'vivaz' ? 'Vivaz' : 'Cliente'}
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium">{item.title}</p>
                          {(item.responsible || item.deadline) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.responsible && <span>{item.responsible}</span>}
                              {item.responsible && item.deadline && <span> • </span>}
                              {item.deadline && <span>Prazo: {format(new Date(item.deadline), "dd/MM/yyyy")}</span>}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 8. Dúvidas e Discussões */}
          {questionsDiscussions?.text && questionsDiscussions.text.trim() !== '' && questionsDiscussions.text !== '<p></p>' && (
            <Card className="transition-all">
              <CardContent className="p-6 lg:p-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Dúvidas e Discussões
                </h2>
                <div className="prose prose-sm max-w-none">
                  <MeetingViewer content={questionsDiscussions.text} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 9. Todo's */}
          {recentTasks.length > 0 && (
            <Card className="transition-all">
              <CardContent className="p-6 lg:p-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-primary" />
                  Todo's
                  <Badge variant="secondary" className="text-xs font-normal">{recentTasks.length} atividades</Badge>
                </h2>
                
                {/* Atividades Pendentes */}
                {(() => {
                  const pendingTasks = recentTasks.filter(t => t.status !== 'concluido' && t.status !== 'completed');
                  if (pendingTasks.length === 0) return null;
                  return (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-1">
                        ⏳ Pendentes ({pendingTasks.length})
                      </p>
                      <div className="space-y-2">
                        {pendingTasks.map((task) => {
                          const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.pendente;
                          return (
                            <div key={task.id} className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
                              <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
                                {statusConfig.label}
                              </Badge>
                              <span className="flex-1 text-sm">{task.title}</span>
                              {task.profiles?.full_name && (
                                <span className="text-xs text-muted-foreground">{task.profiles.full_name.split(" ")[0]}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Atividades Concluídas */}
                {(() => {
                  const completedTasks = recentTasks.filter(t => t.status === 'concluido' || t.status === 'completed');
                  if (completedTasks.length === 0) return null;
                  return (
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                        ✓ Concluídas ({completedTasks.length})
                      </p>
                      <div className="space-y-2">
                        {completedTasks.map((task) => {
                          const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.concluido;
                          return (
                            <div key={task.id} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200/50 dark:border-green-800/30">
                              <Badge variant="outline" className={cn("text-xs", statusConfig.className)}>
                                {statusConfig.label}
                              </Badge>
                              <span className="flex-1 text-sm line-through text-muted-foreground">{task.title}</span>
                              {task.profiles?.full_name && (
                                <span className="text-xs text-muted-foreground">{task.profiles.full_name.split(" ")[0]}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        // Legacy content fallback
        <>
          {meeting.content && (
            <Card>
              <CardContent className="p-6 lg:p-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Conteúdo
                </h2>
                <div className="prose prose-sm max-w-none">
                  <MeetingViewer content={meeting.content} />
                </div>
              </CardContent>
            </Card>
          )}
          
          {meeting.action_items && meeting.action_items.length > 0 && (
            <Card>
              <CardContent className="p-6 lg:p-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  Itens de Ação
                </h2>
                <ul className="space-y-2">
                  {meeting.action_items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 p-2 bg-muted/50 rounded-lg">
                      <span className="font-medium text-primary">{idx + 1}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
