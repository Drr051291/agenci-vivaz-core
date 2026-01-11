import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Calendar, Users, Download, Target, TrendingUp, TrendingDown, Minus, BarChart3, MessageSquare, Lightbulb, CheckCircle2, Circle, History, FileText, ClipboardList, FlaskConical, Sparkles, AlertTriangle, Award, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { usePageMeta } from "@/hooks/usePageMeta";
import { parseLocalDate } from "@/lib/dateUtils";
import { Badge } from "@/components/ui/badge";
import { MeetingViewer } from "@/components/meeting-editor/MeetingViewer";

interface MeetingMinute {
  id: string;
  title: string;
  meeting_date: string;
  participants?: string[];
  content: string;
  action_items?: string[];
  created_at: string;
  next_period_priority?: string;
  analysis_period_start?: string;
  analysis_period_end?: string;
  client_id?: string;
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

interface ActionPlanItem {
  title: string;
  responsible?: string;
  deadline?: string;
  status?: string;
  owner_type?: string;
  category?: string;
}

interface ApprovalItem {
  item_type: string;
  label: string;
  details?: string;
  value?: number;
  is_approved?: boolean;
}

interface Experiment {
  idea: string;
  objective?: string;
  how_to_measure?: string;
  effort?: string;
  impact?: string;
}

export default function SharedMeeting() {
  const { token } = useParams<{ token: string }>();
  const [meeting, setMeeting] = useState<MeetingMinute | null>(null);
  const [sections, setSections] = useState<MeetingSection[]>([]);
  const [metrics, setMetrics] = useState<MeetingMetric[]>([]);
  const [channels, setChannels] = useState<MeetingChannel[]>([]);
  const [actionPlanItems, setActionPlanItems] = useState<ActionPlanItem[]>([]);
  const [approvalItems, setApprovalItems] = useState<ApprovalItem[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  usePageMeta({
    title: meeting ? meeting.title : "Reunião Compartilhada",
    description: `Reunião compartilhada - ${meeting?.title || 'HUB Vivaz'}`,
    keywords: "reunião, compartilhada, vivaz",
  });

  useEffect(() => {
    if (token) {
      fetchMeetingData();
    }
  }, [token]);

  const fetchMeetingData = async () => {
    try {
      // Fetch meeting
      const { data: meetingData, error: meetingError } = await supabase
        .from("meeting_minutes")
        .select("*")
        .eq("share_token", token)
        .single();

      if (meetingError) throw meetingError;
      setMeeting(meetingData);

      // Fetch all related data in parallel
      const [sectionsRes, metricsRes, channelsRes, approvalsRes, experimentsRes] = await Promise.all([
        supabase
          .from("meeting_sections")
          .select("*")
          .eq("meeting_id", meetingData.id)
          .order("sort_order"),
        supabase
          .from("meeting_metrics")
          .select("*")
          .eq("meeting_id", meetingData.id)
          .order("sort_order"),
        supabase
          .from("meeting_channels")
          .select("*")
          .eq("meeting_id", meetingData.id),
        supabase
          .from("meeting_approval_items")
          .select("*")
          .eq("meeting_id", meetingData.id)
          .order("sort_order"),
        supabase
          .from("meeting_experiments")
          .select("*")
          .eq("meeting_id", meetingData.id)
          .order("sort_order"),
      ]);

      setSections(sectionsRes.data || []);
      setMetrics(metricsRes.data || []);
      setChannels(channelsRes.data || []);
      setApprovalItems(approvalsRes.data || []);
      setExperiments(experimentsRes.data || []);

      // Parse action plan from sections
      const actionPlanSection = sectionsRes.data?.find(s => s.section_key === "action_plan");
      const contentJson = actionPlanSection?.content_json as any;
      if (contentJson?.vivazTasks || contentJson?.clientTasks) {
        const vivazTasks = (contentJson.vivazTasks || []).map((t: any) => ({ ...t, owner_type: 'vivaz' }));
        const clientTasks = (contentJson.clientTasks || []).map((t: any) => ({ ...t, owner_type: 'client' }));
        setActionPlanItems([...vivazTasks, ...clientTasks]);
      } else if (contentJson?.actions) {
        setActionPlanItems(contentJson.actions);
      }

      // Fetch recent tasks for retrovisor if client_id exists
      if (meetingData.client_id) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: tasksData } = await supabase
          .from("tasks")
          .select("id, title, status, priority, due_date, category, assigned_to, profiles:assigned_to(full_name)")
          .eq("client_id", meetingData.client_id)
          .gte("created_at", sevenDaysAgo.toISOString())
          .in("status", ["pendente", "em_andamento", "concluido", "solicitado"])
          .order("created_at", { ascending: false });

        // Filter tasks not excluded from this meeting
        const filteredTasks = (tasksData || []).filter(task => {
          const excludedFrom = (task as any).meeting_excluded_from || [];
          return !excludedFrom.includes(meetingData.id);
        });
        
        setRecentTasks(filteredTasks);
      }
    } catch (error) {
      console.error("Erro ao buscar reunião:", error);
      toast.error("Reunião não encontrada ou link inválido");
    } finally {
      setLoading(false);
    }
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

  const getSectionContent = (key: string): any => {
    const section = sections.find(s => s.section_key === key);
    return section?.content_json;
  };

  const handleDownloadPDF = async () => {
    if (!meeting) return;
    
    setDownloading(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let y = margin;

      const addNewPageIfNeeded = (requiredHeight: number) => {
        if (y + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
      };

      // Header
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text(meeting.title, margin, y);
      y += 10;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100);
      pdf.text(`Data: ${parseLocalDate(meeting.meeting_date).toLocaleDateString("pt-BR", { dateStyle: "long" })}`, margin, y);
      y += 5;

      if (meeting.participants && meeting.participants.length > 0) {
        pdf.text(`Participantes: ${meeting.participants.join(", ")}`, margin, y);
        y += 5;
      }

      pdf.setDrawColor(200);
      pdf.line(margin, y + 3, pageWidth - margin, y + 3);
      y += 10;
      pdf.setTextColor(0);

      // Executive Summary
      const executiveSummary = getSectionContent("executive_summary");
      if (executiveSummary?.bullets && executiveSummary.bullets.length > 0) {
        addNewPageIfNeeded(30);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("📋 Resumo Executivo", margin, y);
        y += 8;

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        executiveSummary.bullets.forEach((bullet: string) => {
          if (bullet) {
            addNewPageIfNeeded(8);
            const lines = pdf.splitTextToSize(`• ${bullet}`, contentWidth - 5);
            pdf.text(lines, margin + 3, y);
            y += lines.length * 5 + 2;
          }
        });
        y += 5;
      }

      // KPIs
      if (metrics.length > 0) {
        addNewPageIfNeeded(40);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("📊 Análise de KPIs", margin, y);
        y += 10;

        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text("KPI", margin, y);
        pdf.text("Meta", margin + 60, y);
        pdf.text("Real", margin + 90, y);
        pdf.text("Variação", margin + 120, y);
        y += 5;
        pdf.line(margin, y, pageWidth - margin, y);
        y += 3;

        pdf.setFont("helvetica", "normal");
        metrics.forEach((metric) => {
          addNewPageIfNeeded(8);
          pdf.text(metric.metric_label || "-", margin, y);
          pdf.text(formatValue(metric.target_value, metric.unit), margin + 60, y);
          pdf.text(formatValue(metric.actual_value, metric.unit), margin + 90, y);
          const variation = metric.variation_pct !== null ? `${metric.variation_pct > 0 ? '+' : ''}${metric.variation_pct.toFixed(1)}%` : "-";
          pdf.text(variation, margin + 120, y);
          y += 6;
        });
        y += 5;
      }

      // Channels
      if (channels.length > 0) {
        addNewPageIfNeeded(40);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("📈 Desempenho por Canal", margin, y);
        y += 10;

        pdf.setFontSize(10);
        channels.forEach((channel) => {
          addNewPageIfNeeded(25);
          pdf.setFont("helvetica", "bold");
          pdf.text(channel.channel, margin, y);
          y += 5;

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          const info = [];
          if (channel.investment) info.push(`Investimento: R$ ${channel.investment.toLocaleString("pt-BR")}`);
          if (channel.leads) info.push(`Leads: ${channel.leads}`);
          if (channel.cpl) info.push(`CPL: R$ ${channel.cpl.toLocaleString("pt-BR")}`);
          if (channel.roas) info.push(`ROAS: ${channel.roas.toFixed(2)}x`);
          pdf.text(info.join(" | "), margin + 3, y);
          y += 6;

          if (channel.what_worked) {
            const lines = pdf.splitTextToSize(`✓ O que funcionou: ${channel.what_worked}`, contentWidth - 5);
            pdf.text(lines, margin + 3, y);
            y += lines.length * 4 + 2;
          }
          if (channel.what_to_adjust) {
            const lines = pdf.splitTextToSize(`→ O que ajustar: ${channel.what_to_adjust}`, contentWidth - 5);
            pdf.text(lines, margin + 3, y);
            y += lines.length * 4 + 2;
          }
          y += 3;
        });
        y += 5;
      }

      // Diagnosis
      const diagnosis = getSectionContent("diagnosis");
      if (diagnosis?.items && diagnosis.items.length > 0) {
        addNewPageIfNeeded(30);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("🔍 Diagnóstico", margin, y);
        y += 10;

        pdf.setFontSize(10);
        diagnosis.items.forEach((item: any) => {
          addNewPageIfNeeded(15);
          pdf.setFont("helvetica", "bold");
          pdf.text(`[${item.tag || 'Diagnóstico'}]`, margin, y);
          y += 5;
          pdf.setFont("helvetica", "normal");
          if (item.context) {
            const lines = pdf.splitTextToSize(item.context, contentWidth - 5);
            pdf.text(lines, margin + 3, y);
            y += lines.length * 4 + 3;
          }
        });
        y += 5;
      }

      // Action Plan
      const actionPlan = getSectionContent("action_plan");
      if (actionPlan?.actions && actionPlan.actions.length > 0) {
        addNewPageIfNeeded(30);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("🔧 Plano de Ação", margin, y);
        y += 10;

        pdf.setFontSize(10);
        actionPlan.actions.forEach((action: any, index: number) => {
          addNewPageIfNeeded(12);
          const status = action.completed ? "✓" : "○";
          pdf.setFont("helvetica", action.completed ? "normal" : "bold");
          const actionText = `${status} ${action.title || action.description || `Ação ${index + 1}`}`;
          const lines = pdf.splitTextToSize(actionText, contentWidth - 5);
          pdf.text(lines, margin, y);
          y += lines.length * 5 + 2;

          if (action.responsible || action.deadline) {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9);
            const meta = [];
            if (action.responsible) meta.push(`Responsável: ${action.responsible}`);
            if (action.deadline) meta.push(`Prazo: ${new Date(action.deadline).toLocaleDateString("pt-BR")}`);
            pdf.text(meta.join(" | "), margin + 5, y);
            y += 5;
          }
        });
        y += 5;
      }

      // Questions and Discussions
      const questions = getSectionContent("questions_discussions");
      if (questions?.content && questions.content.trim()) {
        addNewPageIfNeeded(30);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("💬 Dúvidas e Discussões", margin, y);
        y += 10;

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        const lines = pdf.splitTextToSize(questions.content, contentWidth);
        lines.forEach((line: string) => {
          addNewPageIfNeeded(6);
          pdf.text(line, margin, y);
          y += 5;
        });
      }

      // Legacy content fallback
      if (sections.length === 0 && meeting.content) {
        addNewPageIfNeeded(20);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("📝 Conteúdo", margin, y);
        y += 10;

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        const cleanContent = meeting.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const lines = pdf.splitTextToSize(cleanContent, contentWidth);
        lines.forEach((line: string) => {
          addNewPageIfNeeded(6);
          pdf.text(line, margin, y);
          y += 5;
        });
      }

      // Legacy action items
      if (meeting.action_items && meeting.action_items.length > 0 && (!actionPlan?.actions || actionPlan.actions.length === 0)) {
        addNewPageIfNeeded(30);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("✅ Itens de Ação", margin, y);
        y += 10;

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        meeting.action_items.forEach((item, idx) => {
          addNewPageIfNeeded(8);
          const lines = pdf.splitTextToSize(`${idx + 1}. ${item}`, contentWidth - 5);
          pdf.text(lines, margin, y);
          y += lines.length * 5 + 2;
        });
      }

      pdf.save(`reuniao-${meeting.title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
      toast.success("PDF baixado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Reunião não encontrada</h2>
            <p className="text-muted-foreground">
              O link pode estar incorreto ou a reunião pode ter sido removida.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const executiveSummary = getSectionContent("executive_summary") as any;
  const diagnosis = getSectionContent("diagnosis") as any;
  const diagnosisPicker = getSectionContent("diagnosis_picker") as any;
  const actionPlan = getSectionContent("action_plan") as any;
  const questionsDiscussions = getSectionContent("questions_discussions") as any;
  const opening = getSectionContent("opening") as any;

  // Format period text
  const formatPeriod = () => {
    if (meeting.analysis_period_start && meeting.analysis_period_end) {
      const start = parseLocalDate(meeting.analysis_period_start).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      const end = parseLocalDate(meeting.analysis_period_end).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      return `${start} - ${end}`;
    }
    return null;
  };

  const periodText = formatPeriod();

  // Priority label mapping
  const PRIORITY_LABELS: Record<string, string> = {
    growth: "🚀 Crescimento",
    optimization: "⚡ Otimização",
    retention: "🎯 Retenção",
    branding: "✨ Branding",
    testing: "🧪 Testes",
    maintenance: "🔧 Manutenção"
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6" ref={contentRef}>
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-xl font-bold text-primary">V</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{meeting.title}</h1>
              <p className="text-sm text-muted-foreground">HUB Vivaz - Reunião</p>
            </div>
          </div>
          <Button
            onClick={handleDownloadPDF}
            disabled={downloading}
            variant="outline"
            size="lg"
          >
            <Download className="mr-2 h-4 w-4" />
            {downloading ? "Gerando PDF..." : "Baixar PDF"}
          </Button>
        </div>

        {/* 1. Abertura e Alinhamento */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Abertura e Alinhamento
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {parseLocalDate(meeting.meeting_date).toLocaleDateString("pt-BR", {
                  dateStyle: "long",
                })}
              </div>
              {periodText && (
                <div className="flex items-center gap-2">
                  <span>Período de análise: {periodText}</span>
                </div>
              )}
              {meeting.participants && meeting.participants.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {meeting.participants.join(", ")}
                </div>
              )}
            </div>
            
            {opening?.objective && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Objetivo</p>
                <p>{opening.objective}</p>
              </div>
            )}
            
            {opening?.context && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Contexto</p>
                <p>{opening.context}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Resumo Executivo */}
        {(executiveSummary?.periodHighlights?.filter((b: string) => b).length > 0 || 
          executiveSummary?.mainWins?.filter((b: string) => b).length > 0 ||
          executiveSummary?.mainRisks?.filter((b: string) => b).length > 0 ||
          meeting.next_period_priority) && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Resumo Executivo
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {executiveSummary?.periodHighlights?.filter((b: string) => b).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Sparkles className="h-4 w-4" /> Destaques do Período
                  </p>
                  <ul className="space-y-1">
                    {executiveSummary.periodHighlights.filter((b: string) => b).map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {executiveSummary?.mainWins?.filter((b: string) => b).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Award className="h-4 w-4 text-green-600" /> Principais Vitórias
                  </p>
                  <ul className="space-y-1">
                    {executiveSummary.mainWins.filter((b: string) => b).map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {executiveSummary?.mainRisks?.filter((b: string) => b).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-amber-600" /> Principais Riscos
                  </p>
                  <ul className="space-y-1">
                    {executiveSummary.mainRisks.filter((b: string) => b).map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-600 mt-1">⚠</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {meeting.next_period_priority && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <ArrowRight className="h-4 w-4" /> Próxima Prioridade
                  </p>
                  <Badge variant="outline" className="text-sm">
                    {PRIORITY_LABELS[meeting.next_period_priority] || meeting.next_period_priority}
                  </Badge>
                </div>
              )}

              {/* Legacy bullets support */}
              {executiveSummary?.bullets?.filter((b: string) => b).length > 0 && !executiveSummary?.periodHighlights && (
                <ul className="space-y-2">
                  {executiveSummary.bullets.filter((b: string) => b).map((bullet: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* 3. Retrovisor */}
        {recentTasks.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Retrovisor
              </h3>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Tarefas dos últimos 7 dias</p>
              <div className="space-y-2">
                {recentTasks.slice(0, 10).map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg text-sm">
                    <Badge variant={task.status === "concluido" ? "default" : task.status === "em_andamento" ? "secondary" : "outline"} className="text-xs">
                      {task.status === "concluido" ? "Concluído" : task.status === "em_andamento" ? "Em andamento" : task.status === "solicitado" ? "Solicitado" : "Pendente"}
                    </Badge>
                    <span className="flex-1">{task.title}</span>
                    {(task as any).profiles?.full_name && (
                      <span className="text-muted-foreground text-xs">{(task as any).profiles.full_name}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4. Análise de KPIs */}
        {metrics.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Análise de KPIs
              </h3>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">KPI</th>
                      <th className="text-right py-2 font-medium">Meta</th>
                      <th className="text-right py-2 font-medium">Real</th>
                      <th className="text-right py-2 font-medium">Variação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((metric) => (
                      <tr key={metric.id} className="border-b last:border-0">
                        <td className="py-3 font-medium">{metric.metric_label}</td>
                        <td className="py-3 text-right text-muted-foreground">
                          {formatValue(metric.target_value, metric.unit)}
                        </td>
                        <td className="py-3 text-right font-medium">
                          {formatValue(metric.actual_value, metric.unit)}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {getVariationIcon(metric.variation_pct)}
                            <span className={
                              metric.variation_pct === null ? "text-muted-foreground" :
                              metric.variation_pct > 0 ? "text-green-600" :
                              metric.variation_pct < 0 ? "text-red-600" : "text-muted-foreground"
                            }>
                              {metric.variation_pct !== null ? `${metric.variation_pct > 0 ? '+' : ''}${metric.variation_pct.toFixed(1)}%` : "-"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 5. Desempenho por Canal */}
        {channels.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Desempenho por Canal
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {channels.map((channel) => (
                <div key={channel.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <h4 className="font-semibold">{channel.channel}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {channel.investment !== null && (
                      <div>
                        <p className="text-muted-foreground">Investimento</p>
                        <p className="font-medium">R$ {channel.investment.toLocaleString("pt-BR")}</p>
                      </div>
                    )}
                    {channel.leads !== null && (
                      <div>
                        <p className="text-muted-foreground">Leads</p>
                        <p className="font-medium">{channel.leads}</p>
                      </div>
                    )}
                    {channel.cpl !== null && (
                      <div>
                        <p className="text-muted-foreground">CPL</p>
                        <p className="font-medium">R$ {channel.cpl.toLocaleString("pt-BR")}</p>
                      </div>
                    )}
                    {channel.roas !== null && (
                      <div>
                        <p className="text-muted-foreground">ROAS</p>
                        <p className="font-medium">{channel.roas.toFixed(2)}x</p>
                      </div>
                    )}
                  </div>
                  {(channel.what_worked || channel.what_to_adjust) && (
                    <div className="grid md:grid-cols-2 gap-3 text-sm pt-2 border-t">
                      {channel.what_worked && (
                        <div>
                          <p className="text-green-700 font-medium">✓ O que funcionou</p>
                          <p className="text-muted-foreground">{channel.what_worked}</p>
                        </div>
                      )}
                      {channel.what_to_adjust && (
                        <div>
                          <p className="text-amber-700 font-medium">→ O que ajustar</p>
                          <p className="text-muted-foreground">{channel.what_to_adjust}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 6. Diagnóstico */}
        {((diagnosis?.items && diagnosis.items.length > 0) || (diagnosisPicker?.items && diagnosisPicker.items.length > 0)) && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Diagnóstico
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* New diagnosis picker format */}
              {diagnosisPicker?.items?.map((item: any, idx: number) => (
                <div key={idx} className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <Badge variant="secondary">{item.tagLabel || item.tag || 'Diagnóstico'}</Badge>
                  {item.context && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Contexto</p>
                      <p className="text-sm">{item.context}</p>
                    </div>
                  )}
                  {item.solution && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Solução proposta</p>
                      <p className="text-sm">{item.solution}</p>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Legacy diagnosis format */}
              {!diagnosisPicker?.items?.length && diagnosis?.items?.map((item: any, idx: number) => (
                <div key={idx} className="p-4 bg-muted/50 rounded-lg">
                  <Badge variant="secondary" className="mb-2">{item.tag || 'Diagnóstico'}</Badge>
                  {item.context && <p className="text-muted-foreground">{item.context}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 7. Plano de Ação */}
        {actionPlanItems.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Plano de Ação
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Vivaz Tasks */}
              {actionPlanItems.filter(t => t.owner_type === 'vivaz').length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Ações Vivaz</p>
                  <div className="space-y-2">
                    {actionPlanItems.filter(t => t.owner_type === 'vivaz').map((task, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        {task.status === 'completed' || task.status === 'concluido' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className={task.status === 'completed' || task.status === 'concluido' ? "line-through text-muted-foreground" : "font-medium"}>
                            {task.title}
                          </p>
                          {(task.responsible || task.deadline) && (
                            <div className="flex gap-3 mt-1 text-sm text-muted-foreground">
                              {task.responsible && <span>Responsável: {task.responsible}</span>}
                              {task.deadline && <span>Prazo: {new Date(task.deadline).toLocaleDateString("pt-BR")}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Client Tasks */}
              {actionPlanItems.filter(t => t.owner_type === 'client').length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Ações Cliente</p>
                  <div className="space-y-2">
                    {actionPlanItems.filter(t => t.owner_type === 'client').map((task, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        {task.status === 'completed' || task.status === 'concluido' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className={task.status === 'completed' || task.status === 'concluido' ? "line-through text-muted-foreground" : "font-medium"}>
                            {task.title}
                          </p>
                          {(task.responsible || task.deadline) && (
                            <div className="flex gap-3 mt-1 text-sm text-muted-foreground">
                              {task.responsible && <span>Responsável: {task.responsible}</span>}
                              {task.deadline && <span>Prazo: {new Date(task.deadline).toLocaleDateString("pt-BR")}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks without owner_type (legacy) */}
              {actionPlanItems.filter(t => !t.owner_type).length > 0 && (
                <div className="space-y-2">
                  {actionPlanItems.filter(t => !t.owner_type).map((task, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      {task.status === 'completed' || task.status === 'concluido' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className={task.status === 'completed' || task.status === 'concluido' ? "line-through text-muted-foreground" : "font-medium"}>
                          {task.title}
                        </p>
                        {(task.responsible || task.deadline) && (
                          <div className="flex gap-3 mt-1 text-sm text-muted-foreground">
                            {task.responsible && <span>Responsável: {task.responsible}</span>}
                            {task.deadline && <span>Prazo: {new Date(task.deadline).toLocaleDateString("pt-BR")}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Legacy Action Plan */}
        {actionPlanItems.length === 0 && actionPlan?.actions && actionPlan.actions.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Plano de Ação
              </h3>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {actionPlan.actions.map((action: any, idx: number) => (
                  <li key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    {action.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={action.completed ? "line-through text-muted-foreground" : "font-medium"}>
                        {action.title || action.description || `Ação ${idx + 1}`}
                      </p>
                      {(action.responsible || action.deadline) && (
                        <div className="flex gap-3 mt-1 text-sm text-muted-foreground">
                          {action.responsible && <span>Responsável: {action.responsible}</span>}
                          {action.deadline && <span>Prazo: {new Date(action.deadline).toLocaleDateString("pt-BR")}</span>}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Approvals */}
        {approvalItems.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Aprovações
              </h3>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {approvalItems.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    {item.is_approved ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{item.label}</p>
                      {item.details && <p className="text-sm text-muted-foreground">{item.details}</p>}
                    </div>
                    {item.value && (
                      <Badge variant="outline">R$ {item.value.toLocaleString("pt-BR")}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Experiments */}
        {experiments.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-primary" />
                Experimentos
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {experiments.map((exp, idx) => (
                  <div key={idx} className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <p className="font-medium">{exp.idea}</p>
                    {exp.objective && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Objetivo:</span> {exp.objective}
                      </p>
                    )}
                    {exp.how_to_measure && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Como medir:</span> {exp.how_to_measure}
                      </p>
                    )}
                    <div className="flex gap-2">
                      {exp.effort && <Badge variant="outline">Esforço: {exp.effort}</Badge>}
                      {exp.impact && <Badge variant="outline">Impacto: {exp.impact}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 8. Dúvidas e Discussões */}
        {questionsDiscussions?.content && questionsDiscussions.content.trim() && questionsDiscussions.content !== '<p></p>' && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Dúvidas e Discussões
              </h3>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <MeetingViewer content={questionsDiscussions.content} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legacy Content Fallback */}
        {sections.length === 0 && meeting.content && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">📝 Conteúdo</h3>
            </CardHeader>
            <CardContent>
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: meeting.content }}
              />
            </CardContent>
          </Card>
        )}

        {/* Legacy Action Items */}
        {meeting.action_items && meeting.action_items.length > 0 && actionPlanItems.length === 0 && (!actionPlan?.actions || actionPlan.actions.length === 0) && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">✅ Itens de Ação</h3>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {meeting.action_items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-primary">{idx + 1}</span>
                    </div>
                    <span className="text-muted-foreground flex-1">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
