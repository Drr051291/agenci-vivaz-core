import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ArrowLeft, Calendar, Users, ExternalLink, Target, TrendingUp, TrendingDown, Minus, BarChart3, Lightbulb, CheckCircle2, Circle, History, ClipboardList } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { safeFormatDate, parseLocalDate } from "@/lib/dateUtils";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Badge } from "@/components/ui/badge";
import { MeetingViewer } from "@/components/meeting-editor/MeetingViewer";
import { format } from "date-fns";

interface MeetingData {
  id: string;
  title: string;
  meeting_date: string;
  participants: string[] | null;
  content: string;
  action_items: string[] | null;
  client_id: string;
  share_token: string | null;
  analysis_period_start?: string | null;
  analysis_period_end?: string | null;
}

interface MeetingSection {
  id: string;
  section_key: string;
  title: string;
  content_json: any;
  sort_order: number;
}

interface MeetingMetric {
  id: string;
  metric_key: string;
  metric_label: string;
  target_value: number | null;
  actual_value: number | null;
  unit: string | null;
  variation_pct: number | null;
  quick_note?: string | null;
}

interface MeetingChannel {
  id: string;
  channel: string;
  investment: number | null;
  leads: number | null;
  conversions: number | null;
  revenue: number | null;
  cpl: number | null;
  cpa: number | null;
  roas: number | null;
  what_worked: string | null;
  what_to_adjust: string | null;
}

interface RecentTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  category: string;
  profiles?: { full_name: string } | null;
}

export default function ClientMeetingView() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [meetingData, setMeetingData] = useState<MeetingData | null>(null);
  const [sections, setSections] = useState<MeetingSection[]>([]);
  const [metrics, setMetrics] = useState<MeetingMetric[]>([]);
  const [channels, setChannels] = useState<MeetingChannel[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);

  usePageMeta({
    title: meetingData?.title || "Reunião - Área do Cliente",
    description: `Visualize os detalhes da reunião ${meetingData?.title || ''}`,
    keywords: "reunião, ata, cliente, vivaz",
  });

  useEffect(() => {
    checkAuthAndLoadMeeting();
  }, [meetingId]);

  const checkAuthAndLoadMeeting = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "client") {
        navigate("/auth");
        return;
      }

      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!client) {
        toast.error("Nenhum cliente vinculado encontrado");
        navigate("/area-cliente/reunioes");
        return;
      }

      const { data: meeting, error } = await supabase
        .from("meeting_minutes")
        .select("id, title, meeting_date, participants, content, action_items, client_id, share_token, analysis_period_start, analysis_period_end")
        .eq("id", meetingId)
        .eq("client_id", client.id)
        .single();

      if (error || !meeting) {
        toast.error("Reunião não encontrada");
        navigate("/area-cliente/reunioes");
        return;
      }

      setMeetingData(meeting);

      // Fetch sections, metrics, channels in parallel
      const [sectionsRes, metricsRes, channelsRes] = await Promise.all([
        supabase
          .from("meeting_sections")
          .select("*")
          .eq("meeting_id", meeting.id)
          .order("sort_order"),
        supabase
          .from("meeting_metrics")
          .select("*")
          .eq("meeting_id", meeting.id)
          .order("sort_order"),
        supabase
          .from("meeting_channels")
          .select("*")
          .eq("meeting_id", meeting.id),
      ]);

      setSections(sectionsRes.data || []);
      setMetrics(metricsRes.data || []);
      setChannels(channelsRes.data || []);

      // Fetch recent tasks (retrovisor)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, category, assigned_to")
        .eq("client_id", client.id)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      // Get profiles for assigned users
      const assignedIds = [...new Set((tasksData || []).map(t => t.assigned_to).filter(Boolean))];
      let profilesMap: Record<string, string> = {};
      
      if (assignedIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", assignedIds);
        
        profilesMap = (profilesData || []).reduce((acc, p) => {
          acc[p.id] = p.full_name;
          return acc;
        }, {} as Record<string, string>);
      }

      const filteredTasks = (tasksData || []).filter(task => {
        const excludedFrom = (task as any).meeting_excluded_from || [];
        return !excludedFrom.includes(meeting.id);
      }).map(task => ({
        ...task,
        profiles: task.assigned_to ? { full_name: profilesMap[task.assigned_to] || "Sem nome" } : null
      }));
      
      setRecentTasks(filteredTasks as RecentTask[]);
    } catch (error) {
      console.error("Erro ao carregar reunião:", error);
      toast.error("Erro ao carregar reunião");
      navigate("/area-cliente/reunioes");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPublicLink = () => {
    if (meetingData?.share_token) {
      window.open(`https://hub.vivazagencia.com.br/reunioes/${meetingData.share_token}`, '_blank');
    } else {
      toast.error("Link público não disponível para esta reunião");
    }
  };

  const getSectionContent = (key: string): any => {
    const section = sections.find(s => s.section_key === key);
    return section?.content_json;
  };

  const formatValue = (value: number | null, unit: string | null): string => {
    if (value === null) return "-";
    const u = unit || "";
    if (u.includes("R$") || u.includes("Moeda")) {
      return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    }
    if (u.includes("%")) {
      return `${value.toLocaleString("pt-BR")}%`;
    }
    if (u.includes("x")) {
      return `${value.toLocaleString("pt-BR")}x`;
    }
    return value.toLocaleString("pt-BR");
  };

  const getVariationIcon = (variation: number | null) => {
    if (variation === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (variation > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (variation < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pendente: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
      em_andamento: "bg-blue-500/10 text-blue-700 border-blue-500/30",
      concluido: "bg-green-500/10 text-green-700 border-green-500/30",
      solicitado: "bg-purple-500/10 text-purple-700 border-purple-500/30",
    };
    const labels: Record<string, string> = {
      pendente: "Pendente",
      em_andamento: "Em andamento",
      concluido: "Concluído",
      solicitado: "Solicitado",
    };
    return (
      <Badge variant="outline" className={`text-xs ${styles[status] || ""}`}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!meetingData) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Reunião não encontrada</h1>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Reunião não encontrada</p>
              <Button
                onClick={() => navigate("/area-cliente/reunioes")}
                className="mt-4"
              >
                Voltar
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const executiveSummary = getSectionContent("executive_summary");
  const diagnosis = getSectionContent("diagnosis");
  const actionPlan = getSectionContent("action_plan");
  const questions = getSectionContent("questions_discussions");
  const isNewMethodology = sections.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/area-cliente/reunioes")}
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Voltar
              </Button>
            </div>
            <h1 className="text-xl font-semibold mb-1">{meetingData.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {safeFormatDate(meetingData.meeting_date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
              {meetingData.participants && meetingData.participants.length > 0 && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <span>{meetingData.participants.join(", ")}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          {meetingData.share_token && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenPublicLink}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Abrir Link
            </Button>
          )}
        </div>

        {isNewMethodology ? (
          <>
            {/* Executive Summary */}
            {executiveSummary?.bullets && executiveSummary.bullets.filter((b: string) => b).length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    <h2 className="font-medium">Resumo Executivo</h2>
                  </div>
                  <ul className="space-y-2">
                    {executiveSummary.bullets.filter((b: string) => b).map((bullet: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-primary mt-1">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Retrovisor */}
            {recentTasks.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <History className="h-4 w-4 text-primary" />
                    <h2 className="font-medium">Retrovisor</h2>
                    <Badge variant="secondary" className="text-xs">Últimos 7 dias</Badge>
                  </div>
                  <div className="space-y-2">
                    {recentTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {task.profiles?.full_name || "Sem responsável"}
                          </p>
                        </div>
                        {getStatusBadge(task.status)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* KPIs */}
            {metrics.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="h-4 w-4 text-primary" />
                    <h2 className="font-medium">Análise de KPIs</h2>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {metrics.map((metric) => (
                      <div key={metric.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">{metric.metric_label}</span>
                          {getVariationIcon(metric.variation_pct)}
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-semibold">{formatValue(metric.actual_value, metric.unit)}</span>
                          {metric.target_value !== null && (
                            <span className="text-xs text-muted-foreground">
                              Meta: {formatValue(metric.target_value, metric.unit)}
                            </span>
                          )}
                        </div>
                        {metric.variation_pct !== null && (
                          <span className={`text-xs ${metric.variation_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {metric.variation_pct > 0 ? '+' : ''}{metric.variation_pct.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Channels */}
            {channels.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <h2 className="font-medium">Desempenho por Canal</h2>
                  </div>
                  <div className="space-y-4">
                    {channels.map((channel) => (
                      <div key={channel.id} className="p-3 rounded-lg border">
                        <h3 className="font-medium mb-2">{channel.channel}</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm mb-3">
                          {channel.investment !== null && (
                            <div>
                              <span className="text-muted-foreground text-xs">Invest.</span>
                              <p className="font-medium">R$ {channel.investment.toLocaleString("pt-BR")}</p>
                            </div>
                          )}
                          {channel.leads !== null && (
                            <div>
                              <span className="text-muted-foreground text-xs">Leads</span>
                              <p className="font-medium">{channel.leads}</p>
                            </div>
                          )}
                          {channel.cpl !== null && (
                            <div>
                              <span className="text-muted-foreground text-xs">CPL</span>
                              <p className="font-medium">R$ {channel.cpl.toLocaleString("pt-BR")}</p>
                            </div>
                          )}
                          {channel.roas !== null && (
                            <div>
                              <span className="text-muted-foreground text-xs">ROAS</span>
                              <p className="font-medium">{channel.roas.toFixed(2)}x</p>
                            </div>
                          )}
                        </div>
                        {(channel.what_worked || channel.what_to_adjust) && (
                          <div className="space-y-2 text-sm border-t pt-2">
                            {channel.what_worked && (
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                                <span>{channel.what_worked}</span>
                              </div>
                            )}
                            {channel.what_to_adjust && (
                              <div className="flex items-start gap-2">
                                <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5" />
                                <span>{channel.what_to_adjust}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Diagnosis */}
            {diagnosis?.items && diagnosis.items.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <h2 className="font-medium">Diagnóstico</h2>
                  </div>
                  <div className="space-y-3">
                    {diagnosis.items.map((item: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg border bg-muted/30">
                        <Badge variant="outline" className="mb-2">{item.tag || "Diagnóstico"}</Badge>
                        {item.context && <p className="text-sm">{item.context}</p>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Plan */}
            {actionPlan?.actions && actionPlan.actions.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <h2 className="font-medium">Plano de Ação</h2>
                  </div>
                  <div className="space-y-2">
                    {actionPlan.actions.map((action: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-2 rounded-lg border">
                        {action.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${action.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {action.title || action.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                            {action.responsible && <span>👤 {action.responsible}</span>}
                            {action.deadline && (
                              <span>📅 {safeFormatDate(action.deadline, "dd/MM/yyyy", { locale: ptBR })}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Questions and Discussions */}
            {questions?.content && questions.content.trim() && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="font-medium mb-3">Dúvidas e Discussões</h2>
                  <MeetingViewer content={questions.content} />
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <>
            {/* Legacy Content */}
            <Card>
              <CardContent className="p-4">
                <h2 className="font-medium mb-3">Discussões e Anotações</h2>
                <MeetingViewer content={meetingData.content} />
              </CardContent>
            </Card>

            {meetingData.action_items && meetingData.action_items.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h2 className="font-medium mb-3">Itens de Ação</h2>
                  <div className="space-y-2">
                    {meetingData.action_items.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-primary">{idx + 1}</span>
                        </div>
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
