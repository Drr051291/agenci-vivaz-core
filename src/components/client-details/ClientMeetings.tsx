import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Pencil, Share2, Download, Trash2, CheckSquare, RefreshCw, Calendar, Check, FileText, Rocket, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShareMeetingDialog } from "@/components/meeting-editor/ShareMeetingDialog";
import { GoogleCalendarManager } from "@/components/calendar/GoogleCalendarManager";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useMeetingCalendarSync } from "@/hooks/useMeetingCalendarSync";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getMeetingTemplate, MEETING_TEMPLATE_OPTIONS, type MeetingTemplateType } from "@/lib/meetingTemplates";

interface MeetingMinute {
  id: string;
  title: string;
  meeting_date: string;
  participants?: string[];
  content: string;
  action_items?: string[];
  created_at: string;
  share_token?: string;
  linked_dashboards?: string[];
  linked_tasks?: string[];
  is_synced?: boolean;
}

interface ClientMeetingsProps {
  clientId: string;
}

interface Dashboard {
  id: string;
  name: string;
  dashboard_type: string;
}

export function ClientMeetings({ clientId }: ClientMeetingsProps) {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<MeetingMinute[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingMinute | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState<string | null>(null);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncedMeetingIds, setSyncedMeetingIds] = useState<Set<string>>(new Set());
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const { isConnected } = useGoogleCalendar();
  const { syncMeetingToCalendar, deleteMeetingFromCalendar, syncAllMeetings } = useMeetingCalendarSync();

  useEffect(() => {
    fetchMeetings();
    fetchClientData();
    if (isConnected) {
      fetchSyncedMeetings();
    }
  }, [clientId, isConnected]);

  const fetchSyncedMeetings = async () => {
    try {
      const { data } = await supabase
        .from("google_calendar_events")
        .select("meeting_id");
      
      setSyncedMeetingIds(new Set(data?.map(e => e.meeting_id) || []));
    } catch (error) {
      console.error("Erro ao buscar reuniões sincronizadas:", error);
    }
  };

  const fetchClientData = async () => {
    try {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("company_name, contact_email")
        .eq("id", clientId)
        .single();

      if (clientError) throw clientError;
      setClientName(clientData.company_name);
      setClientEmail(clientData.contact_email || null);

      const { data: dashboardsData, error: dashboardsError } = await supabase
        .from("client_dashboards")
        .select("id, name, dashboard_type")
        .eq("client_id", clientId)
        .eq("is_active", true);

      if (dashboardsError) throw dashboardsError;
      setDashboards(dashboardsData || []);
    } catch (error) {
      console.error("Erro ao buscar dados do cliente:", error);
    }
  };

  const fetchMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from("meeting_minutes")
        .select("*")
        .eq("client_id", clientId)
        .order("meeting_date", { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error("Erro ao buscar reuniões:", error);
      toast.error("Erro ao carregar reuniões");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async (templateType: MeetingTemplateType = 'performance') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date();
      const localDateTime = format(now, "yyyy-MM-dd'T'HH:mm");
      
      const { data: newMeeting, error } = await supabase
        .from("meeting_minutes")
        .insert({
          client_id: clientId,
          title: `Vivaz - ${clientName} - Nova Reunião`,
          meeting_date: localDateTime,
          content: getMeetingTemplate(templateType),
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Sync to Google Calendar if connected
      if (isConnected) {
        await syncMeetingToCalendar({
          id: newMeeting.id,
          title: newMeeting.title,
          meeting_date: newMeeting.meeting_date,
          participants: [],
        });
        fetchSyncedMeetings();
      }

      setTemplateDialogOpen(false);
      toast.success("Reunião criada! Redirecionando para edição...");
      navigate(`/clientes/${clientId}/reunioes/${newMeeting.id}?mode=edit`);
    } catch (error) {
      console.error("Erro ao criar reunião:", error);
      toast.error("Erro ao criar reunião");
    }
  };

  const handleImportEvent = async (event: {
    title: string;
    date: Date;
    description?: string;
    googleEventId?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const localDateTime = format(event.date, "yyyy-MM-dd'T'HH:mm");
      
      const { data: newMeeting, error } = await supabase
        .from("meeting_minutes")
        .insert({
          client_id: clientId,
          title: event.title,
          meeting_date: localDateTime,
          content: event.description || getMeetingTemplate('performance'),
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Link to existing Google Calendar event if imported
      if (event.googleEventId) {
        await supabase.from("google_calendar_events").insert({
          meeting_id: newMeeting.id,
          google_event_id: event.googleEventId,
          calendar_id: "primary",
        });
        fetchSyncedMeetings();
      }

      toast.success("Reunião importada! Redirecionando para edição...");
      navigate(`/clientes/${clientId}/reunioes/${newMeeting.id}?mode=edit`);
    } catch (error) {
      console.error("Erro ao importar evento:", error);
      toast.error("Erro ao importar evento");
    }
  };

  const handleViewMeeting = (meetingId: string) => {
    navigate(`/clientes/${clientId}/reunioes/${meetingId}?mode=view`);
  };

  const handleEditMeeting = (meetingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/clientes/${clientId}/reunioes/${meetingId}?mode=edit`);
  };

  const handleShare = (meeting: MeetingMinute) => {
    setSelectedMeeting(meeting);
    setShareDialogOpen(true);
  };

  const handleDeleteClick = (meeting: MeetingMinute) => {
    setSelectedMeeting(meeting);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMeeting) return;

    try {
      // Delete from Google Calendar first if synced
      if (isConnected && syncedMeetingIds.has(selectedMeeting.id)) {
        await deleteMeetingFromCalendar(selectedMeeting.id);
      }

      const { error } = await supabase
        .from("meeting_minutes")
        .delete()
        .eq("id", selectedMeeting.id);

      if (error) throw error;

      toast.success("Reunião deletada com sucesso!");
      setDeleteDialogOpen(false);
      setSelectedMeeting(null);
      fetchMeetings();
      if (isConnected) fetchSyncedMeetings();
    } catch (error) {
      console.error("Erro ao deletar reunião:", error);
      toast.error("Erro ao deletar reunião");
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const count = await syncAllMeetings(clientId);
      if (count > 0) {
        toast.success(`${count} reunião(ões) sincronizada(s) com Google Calendar`);
        fetchSyncedMeetings();
      } else {
        toast.info("Todas as reuniões já estão sincronizadas");
      }
    } catch (error) {
      console.error("Erro ao sincronizar:", error);
      toast.error("Erro ao sincronizar reuniões");
    } finally {
      setSyncingAll(false);
    }
  };

  const handleDownloadPDF = async (meeting: MeetingMinute) => {
    setDownloadingId(meeting.id);
    try {
      // Fetch all meeting data for complete PDF
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

      const sections = sectionsRes.data || [];
      const metrics = metricsRes.data || [];
      const channels = channelsRes.data || [];

      const getSectionContent = (key: string): any => {
        const section = sections.find((s: any) => s.section_key === key);
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
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      const titleLines = pdf.splitTextToSize(meeting.title, contentWidth);
      pdf.text(titleLines, margin, y);
      y += titleLines.length * 7 + 5;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100);
      pdf.text(`Data: ${new Date(meeting.meeting_date).toLocaleDateString("pt-BR", { dateStyle: "long" })}`, margin, y);
      y += 5;

      if (meeting.participants && meeting.participants.length > 0) {
        const participantsText = pdf.splitTextToSize(`Participantes: ${meeting.participants.join(", ")}`, contentWidth);
        pdf.text(participantsText, margin, y);
        y += participantsText.length * 4 + 2;
      }

      pdf.setDrawColor(200);
      pdf.line(margin, y + 3, pageWidth - margin, y + 3);
      y += 10;
      pdf.setTextColor(0);

      // Objective & Context
      const objective = getSectionContent("objective");
      const context = getSectionContent("context");
      if (objective?.content || context?.content) {
        addNewPageIfNeeded(30);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("🎯 Abertura e Alinhamento", margin, y);
        y += 8;
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");

        if (objective?.content) {
          const objLines = pdf.splitTextToSize(`Objetivo: ${objective.content}`, contentWidth);
          pdf.text(objLines, margin, y);
          y += objLines.length * 5 + 3;
        }
        if (context?.content) {
          const ctxLines = pdf.splitTextToSize(`Contexto: ${context.content}`, contentWidth);
          pdf.text(ctxLines, margin, y);
          y += ctxLines.length * 5 + 3;
        }
        y += 5;
      }

      // Executive Summary
      const executiveSummary = getSectionContent("executive_summary");
      if (executiveSummary) {
        const hasBullets = executiveSummary.bullets?.length > 0;
        const hasHighlights = executiveSummary.periodHighlights;
        const hasWins = executiveSummary.mainWins?.length > 0;
        const hasRisks = executiveSummary.mainRisks?.length > 0;
        
        if (hasBullets || hasHighlights || hasWins || hasRisks) {
          addNewPageIfNeeded(30);
          pdf.setFontSize(14);
          pdf.setFont("helvetica", "bold");
          pdf.text("📋 Resumo Executivo", margin, y);
          y += 8;
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");

          if (hasHighlights) {
            const lines = pdf.splitTextToSize(`Destaques: ${executiveSummary.periodHighlights}`, contentWidth);
            pdf.text(lines, margin, y);
            y += lines.length * 5 + 3;
          }

          if (hasWins) {
            addNewPageIfNeeded(15);
            pdf.setFont("helvetica", "bold");
            pdf.text("Principais Conquistas:", margin, y);
            y += 5;
            pdf.setFont("helvetica", "normal");
            executiveSummary.mainWins.forEach((win: string) => {
              if (win) {
                addNewPageIfNeeded(8);
                const lines = pdf.splitTextToSize(`✓ ${win}`, contentWidth - 5);
                pdf.text(lines, margin + 3, y);
                y += lines.length * 5 + 2;
              }
            });
          }

          if (hasRisks) {
            addNewPageIfNeeded(15);
            pdf.setFont("helvetica", "bold");
            pdf.text("Riscos e Alertas:", margin, y);
            y += 5;
            pdf.setFont("helvetica", "normal");
            executiveSummary.mainRisks.forEach((risk: string) => {
              if (risk) {
                addNewPageIfNeeded(8);
                const lines = pdf.splitTextToSize(`⚠ ${risk}`, contentWidth - 5);
                pdf.text(lines, margin + 3, y);
                y += lines.length * 5 + 2;
              }
            });
          }

          if (hasBullets) {
            executiveSummary.bullets.forEach((bullet: string) => {
              if (bullet) {
                addNewPageIfNeeded(8);
                const lines = pdf.splitTextToSize(`• ${bullet}`, contentWidth - 5);
                pdf.text(lines, margin + 3, y);
                y += lines.length * 5 + 2;
              }
            });
          }
          y += 5;
        }
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
        pdf.text("Meta", margin + 55, y);
        pdf.text("Real", margin + 85, y);
        pdf.text("Var.", margin + 115, y);
        pdf.text("Notas", margin + 135, y);
        y += 5;
        pdf.line(margin, y, pageWidth - margin, y);
        y += 3;

        pdf.setFont("helvetica", "normal");
        metrics.forEach((metric: any) => {
          addNewPageIfNeeded(10);
          const label = metric.metric_label?.substring(0, 20) || "-";
          pdf.text(label, margin, y);
          pdf.text(formatValue(metric.target_value, metric.unit), margin + 55, y);
          pdf.text(formatValue(metric.actual_value, metric.unit), margin + 85, y);
          const variation = metric.variation_pct !== null ? `${metric.variation_pct > 0 ? '+' : ''}${metric.variation_pct.toFixed(1)}%` : "-";
          pdf.text(variation, margin + 115, y);
          if (metric.quick_note) {
            const noteText = metric.quick_note.substring(0, 25);
            pdf.text(noteText, margin + 135, y);
          }
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

        channels.forEach((channel: any) => {
          addNewPageIfNeeded(30);
          pdf.setFontSize(11);
          pdf.setFont("helvetica", "bold");
          pdf.text(channel.channel, margin, y);
          y += 6;

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          const info = [];
          if (channel.investment) info.push(`Investimento: R$ ${channel.investment.toLocaleString("pt-BR")}`);
          if (channel.leads) info.push(`Leads: ${channel.leads}`);
          if (channel.cpl) info.push(`CPL: R$ ${channel.cpl.toLocaleString("pt-BR")}`);
          if (channel.roas) info.push(`ROAS: ${channel.roas.toFixed(2)}x`);
          if (info.length > 0) {
            pdf.text(info.join(" | "), margin + 3, y);
            y += 5;
          }

          if (channel.what_worked) {
            addNewPageIfNeeded(10);
            const lines = pdf.splitTextToSize(`✓ O que funcionou: ${channel.what_worked}`, contentWidth - 5);
            pdf.text(lines, margin + 3, y);
            y += lines.length * 4 + 2;
          }
          if (channel.what_to_adjust) {
            addNewPageIfNeeded(10);
            const lines = pdf.splitTextToSize(`→ O que ajustar: ${channel.what_to_adjust}`, contentWidth - 5);
            pdf.text(lines, margin + 3, y);
            y += lines.length * 4 + 2;
          }
          y += 4;
        });
        y += 5;
      }

      // Diagnosis
      const diagnosis = getSectionContent("diagnosis");
      const diagnosisPicker = getSectionContent("diagnosis_picker");
      const hasStandardDiagnosis = diagnosis?.items?.length > 0;
      const hasPickerDiagnosis = diagnosisPicker?.selectedItems?.length > 0;

      if (hasStandardDiagnosis || hasPickerDiagnosis) {
        addNewPageIfNeeded(30);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("🔍 Diagnóstico", margin, y);
        y += 10;

        pdf.setFontSize(10);

        if (hasPickerDiagnosis) {
          diagnosisPicker.selectedItems.forEach((item: any) => {
            addNewPageIfNeeded(20);
            pdf.setFont("helvetica", "bold");
            pdf.text(`[${item.tag || item.label || 'Diagnóstico'}]`, margin, y);
            y += 5;
            pdf.setFont("helvetica", "normal");
            if (item.context) {
              const lines = pdf.splitTextToSize(`Contexto: ${item.context}`, contentWidth - 5);
              pdf.text(lines, margin + 3, y);
              y += lines.length * 4 + 2;
            }
            if (item.solution) {
              const lines = pdf.splitTextToSize(`Solução: ${item.solution}`, contentWidth - 5);
              pdf.text(lines, margin + 3, y);
              y += lines.length * 4 + 2;
            }
            y += 3;
          });
        }

        if (hasStandardDiagnosis) {
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
        }
        y += 5;
      }

      // Action Plan
      const actionPlan = getSectionContent("action_plan");
      const hasVivazTasks = actionPlan?.vivazTasks?.length > 0;
      const hasClientTasks = actionPlan?.clientTasks?.length > 0;
      const hasLegacyActions = actionPlan?.actions?.length > 0;

      if (hasVivazTasks || hasClientTasks || hasLegacyActions) {
        addNewPageIfNeeded(30);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("🔧 Plano de Ação", margin, y);
        y += 10;

        pdf.setFontSize(10);

        if (hasVivazTasks) {
          addNewPageIfNeeded(15);
          pdf.setFont("helvetica", "bold");
          pdf.text("Ações Vivaz:", margin, y);
          y += 6;
          pdf.setFont("helvetica", "normal");

          actionPlan.vivazTasks.forEach((action: any) => {
            addNewPageIfNeeded(12);
            const status = action.status === 'completed' ? "✓" : "○";
            const actionText = `${status} ${action.title || 'Ação'}`;
            const lines = pdf.splitTextToSize(actionText, contentWidth - 10);
            pdf.text(lines, margin + 3, y);
            y += lines.length * 5 + 1;

            if (action.responsible || action.deadline) {
              pdf.setFontSize(9);
              const meta = [];
              if (action.responsible) meta.push(`Resp: ${action.responsible}`);
              if (action.deadline) meta.push(`Prazo: ${new Date(action.deadline).toLocaleDateString("pt-BR")}`);
              pdf.text(meta.join(" | "), margin + 6, y);
              y += 5;
              pdf.setFontSize(10);
            }
          });
          y += 3;
        }

        if (hasClientTasks) {
          addNewPageIfNeeded(15);
          pdf.setFont("helvetica", "bold");
          pdf.text("Ações Cliente:", margin, y);
          y += 6;
          pdf.setFont("helvetica", "normal");

          actionPlan.clientTasks.forEach((action: any) => {
            addNewPageIfNeeded(12);
            const status = action.status === 'completed' ? "✓" : "○";
            const actionText = `${status} ${action.title || 'Ação'}`;
            const lines = pdf.splitTextToSize(actionText, contentWidth - 10);
            pdf.text(lines, margin + 3, y);
            y += lines.length * 5 + 1;

            if (action.responsible || action.deadline) {
              pdf.setFontSize(9);
              const meta = [];
              if (action.responsible) meta.push(`Resp: ${action.responsible}`);
              if (action.deadline) meta.push(`Prazo: ${new Date(action.deadline).toLocaleDateString("pt-BR")}`);
              pdf.text(meta.join(" | "), margin + 6, y);
              y += 5;
              pdf.setFontSize(10);
            }
          });
          y += 3;
        }

        if (hasLegacyActions && !hasVivazTasks && !hasClientTasks) {
          actionPlan.actions.forEach((action: any, index: number) => {
            addNewPageIfNeeded(12);
            const status = action.completed ? "✓" : "○";
            const actionText = `${status} ${action.title || action.description || `Ação ${index + 1}`}`;
            const lines = pdf.splitTextToSize(actionText, contentWidth - 5);
            pdf.text(lines, margin, y);
            y += lines.length * 5 + 2;

            if (action.responsible || action.deadline) {
              pdf.setFontSize(9);
              const meta = [];
              if (action.responsible) meta.push(`Responsável: ${action.responsible}`);
              if (action.deadline) meta.push(`Prazo: ${new Date(action.deadline).toLocaleDateString("pt-BR")}`);
              pdf.text(meta.join(" | "), margin + 5, y);
              y += 5;
              pdf.setFontSize(10);
            }
          });
        }
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
        const cleanContent = questions.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const lines = pdf.splitTextToSize(cleanContent, contentWidth);
        lines.forEach((line: string) => {
          addNewPageIfNeeded(6);
          pdf.text(line, margin, y);
          y += 5;
        });
        y += 5;
      }

      // Next Period Priority
      const meetingFull = await supabase
        .from("meeting_minutes")
        .select("next_period_priority")
        .eq("id", meeting.id)
        .single();
      
      if (meetingFull.data?.next_period_priority) {
        addNewPageIfNeeded(20);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("🎯 Prioridade do Próximo Período", margin, y);
        y += 8;

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        const lines = pdf.splitTextToSize(meetingFull.data.next_period_priority, contentWidth);
        pdf.text(lines, margin, y);
        y += lines.length * 5 + 5;
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
      if (meeting.action_items && meeting.action_items.length > 0 && !hasVivazTasks && !hasClientTasks && !hasLegacyActions) {
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

      const safeName = meeting.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').substring(0, 50);
      pdf.save(`reuniao-${safeName}.pdf`);
      toast.success("PDF baixado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2">
        <h2 className="text-xl font-bold">Reuniões</h2>
        <div className="flex gap-2">
          {isConnected && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSyncAll}
                disabled={syncingAll}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncingAll ? "animate-spin" : ""}`} />
                Sincronizar Todas
              </Button>
              <GoogleCalendarManager clientEmail={clientEmail || undefined} onImportEvent={handleImportEvent} />
            </>
          )}
          <Button onClick={() => setTemplateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Reunião
          </Button>
        </div>
      </div>

      {meetings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground mb-4">Nenhuma reunião encontrada</p>
            <Button onClick={() => setTemplateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Reunião
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <Card 
              key={meeting.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewMeeting(meeting.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium leading-tight">
                    {meeting.title}
                  </CardTitle>
                  {isConnected && syncedMeetingIds.has(meeting.id) && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <Check className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {meeting.linked_tasks && meeting.linked_tasks.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckSquare className="h-3 w-3 flex-shrink-0" />
                    <span>{meeting.linked_tasks.length} atividade(s)</span>
                  </div>
                )}

                {meeting.participants && meeting.participants.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{meeting.participants.slice(0, 2).join(", ")}</span>
                    {meeting.participants.length > 2 && (
                      <span>+{meeting.participants.length - 2}</span>
                    )}
                  </div>
                )}

                <div className="flex gap-1 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => handleEditMeeting(meeting.id, e)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(meeting);
                    }}
                    title="Compartilhar"
                  >
                    <Share2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadPDF(meeting);
                    }}
                    disabled={downloadingId === meeting.id}
                    title="Baixar PDF"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(meeting);
                    }}
                    title="Deletar"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedMeeting && (
        <ShareMeetingDialog
          shareToken={selectedMeeting.share_token || ""}
          meetingTitle={selectedMeeting.title}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta reunião? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Template Selection Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Escolher Template</DialogTitle>
            <DialogDescription>
              Selecione um modelo para sua reunião
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {MEETING_TEMPLATE_OPTIONS.map((option) => {
              const icons: Record<MeetingTemplateType, React.ReactNode> = {
                performance: <FileText className="h-5 w-5 text-primary" />,
                kickoff: <Rocket className="h-5 w-5 text-emerald-600" />,
                simple: <ClipboardList className="h-5 w-5 text-blue-600" />,
              };
              return (
                <button
                  key={option.value}
                  onClick={() => handleCreateMeeting(option.value)}
                  className="flex items-start gap-4 p-4 rounded-lg border hover:border-primary hover:bg-muted/50 transition-all text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    {icons[option.value]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
