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
      const [sectionsRes, metricsRes, channelsRes, meetingFullRes] = await Promise.all([
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
        supabase
          .from("meeting_minutes")
          .select("next_period_priority, analysis_period_start, analysis_period_end")
          .eq("id", meeting.id)
          .single(),
      ]);

      const sections = sectionsRes.data || [];
      const metrics = metricsRes.data || [];
      const channels = channelsRes.data || [];
      const meetingFull = meetingFullRes.data;

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
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let y = margin;

      // Colors
      const primaryColor: [number, number, number] = [45, 55, 72]; // Dark gray
      const accentColor: [number, number, number] = [99, 102, 241]; // Indigo
      const successColor: [number, number, number] = [34, 197, 94]; // Green
      const warningColor: [number, number, number] = [234, 179, 8]; // Yellow
      const mutedColor: [number, number, number] = [107, 114, 128]; // Gray
      const lightBg: [number, number, number] = [249, 250, 251]; // Light gray bg

      const addNewPageIfNeeded = (requiredHeight: number) => {
        if (y + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
          return true;
        }
        return false;
      };

      const drawSectionHeader = (title: string, emoji: string) => {
        addNewPageIfNeeded(20);
        
        // Background bar
        pdf.setFillColor(...accentColor);
        pdf.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
        
        // Title text
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(255, 255, 255);
        pdf.text(`${emoji}  ${title}`, margin + 5, y + 7);
        
        y += 15;
        pdf.setTextColor(0, 0, 0);
      };

      const drawInfoBox = (content: string[], bgColor: [number, number, number] = lightBg) => {
        const lineHeight = 6;
        const boxHeight = content.length * lineHeight + 8;
        addNewPageIfNeeded(boxHeight);
        
        pdf.setFillColor(...bgColor);
        pdf.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'F');
        
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...primaryColor);
        
        let textY = y + 6;
        content.forEach(line => {
          pdf.text(line, margin + 5, textY);
          textY += lineHeight;
        });
        
        y += boxHeight + 5;
      };

      // ==================== HEADER ====================
      // Logo area / Title
      pdf.setFillColor(...primaryColor);
      pdf.rect(0, 0, pageWidth, 45, 'F');
      
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(255, 255, 255);
      const titleLines = pdf.splitTextToSize(meeting.title, contentWidth - 10);
      pdf.text(titleLines, margin, 22);
      
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      const meetingDateFormatted = new Date(meeting.meeting_date).toLocaleDateString("pt-BR", { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      pdf.text(meetingDateFormatted, margin, 35);
      
      y = 55;
      pdf.setTextColor(0, 0, 0);

      // Meeting info box
      const infoLines: string[] = [];
      if (meeting.participants && meeting.participants.length > 0) {
        infoLines.push(`Participantes: ${meeting.participants.join(", ")}`);
      }
      if (meetingFull?.analysis_period_start && meetingFull?.analysis_period_end) {
        const startDate = new Date(meetingFull.analysis_period_start).toLocaleDateString("pt-BR");
        const endDate = new Date(meetingFull.analysis_period_end).toLocaleDateString("pt-BR");
        infoLines.push(`Período de Análise: ${startDate} a ${endDate}`);
      }
      if (infoLines.length > 0) {
        drawInfoBox(infoLines);
      }

      y += 5;

      // ==================== ABERTURA E ALINHAMENTO ====================
      const objective = getSectionContent("objective");
      const context = getSectionContent("context");
      if (objective?.content || context?.content) {
        drawSectionHeader("Abertura e Alinhamento", "🎯");
        
        if (objective?.content) {
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(...accentColor);
          pdf.text("Objetivo:", margin, y);
          y += 5;
          
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(...primaryColor);
          const objLines = pdf.splitTextToSize(objective.content, contentWidth - 5);
          objLines.forEach((line: string) => {
            addNewPageIfNeeded(6);
            pdf.text(line, margin + 3, y);
            y += 5;
          });
          y += 3;
        }
        
        if (context?.content) {
          addNewPageIfNeeded(15);
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(...accentColor);
          pdf.text("Contexto:", margin, y);
          y += 5;
          
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(...primaryColor);
          const ctxLines = pdf.splitTextToSize(context.content, contentWidth - 5);
          ctxLines.forEach((line: string) => {
            addNewPageIfNeeded(6);
            pdf.text(line, margin + 3, y);
            y += 5;
          });
        }
        y += 8;
      }

      // ==================== RESUMO EXECUTIVO ====================
      const executiveSummary = getSectionContent("executive_summary");
      if (executiveSummary) {
        const hasHighlights = executiveSummary.periodHighlights;
        const hasWins = executiveSummary.mainWins?.some((w: string) => w?.trim());
        const hasRisks = executiveSummary.mainRisks?.some((r: string) => r?.trim());
        const hasBullets = executiveSummary.bullets?.some((b: string) => b?.trim());
        
        if (hasHighlights || hasWins || hasRisks || hasBullets) {
          drawSectionHeader("Resumo Executivo", "📋");

          if (hasHighlights) {
            pdf.setFillColor(240, 249, 255);
            const highlightLines = pdf.splitTextToSize(executiveSummary.periodHighlights, contentWidth - 14);
            const boxH = highlightLines.length * 5 + 10;
            addNewPageIfNeeded(boxH);
            pdf.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'F');
            
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(...primaryColor);
            let tY = y + 7;
            highlightLines.forEach((line: string) => {
              pdf.text(line, margin + 7, tY);
              tY += 5;
            });
            y += boxH + 5;
          }

          if (hasWins) {
            addNewPageIfNeeded(20);
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(...successColor);
            pdf.text("Principais Conquistas", margin, y);
            y += 6;
            
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(...primaryColor);
            executiveSummary.mainWins.forEach((win: string) => {
              if (win?.trim()) {
                addNewPageIfNeeded(8);
                pdf.setTextColor(...successColor);
                pdf.text("✓", margin + 2, y);
                pdf.setTextColor(...primaryColor);
                const lines = pdf.splitTextToSize(win, contentWidth - 12);
                pdf.text(lines[0], margin + 8, y);
                y += 5;
                if (lines.length > 1) {
                  for (let i = 1; i < lines.length; i++) {
                    addNewPageIfNeeded(5);
                    pdf.text(lines[i], margin + 8, y);
                    y += 5;
                  }
                }
              }
            });
            y += 3;
          }

          if (hasRisks) {
            addNewPageIfNeeded(20);
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(...warningColor);
            pdf.text("Riscos e Alertas", margin, y);
            y += 6;
            
            pdf.setFont("helvetica", "normal");
            executiveSummary.mainRisks.forEach((risk: string) => {
              if (risk?.trim()) {
                addNewPageIfNeeded(8);
                pdf.setTextColor(234, 88, 12);
                pdf.text("⚠", margin + 2, y);
                pdf.setTextColor(...primaryColor);
                const lines = pdf.splitTextToSize(risk, contentWidth - 12);
                pdf.text(lines[0], margin + 8, y);
                y += 5;
                if (lines.length > 1) {
                  for (let i = 1; i < lines.length; i++) {
                    addNewPageIfNeeded(5);
                    pdf.text(lines[i], margin + 8, y);
                    y += 5;
                  }
                }
              }
            });
            y += 3;
          }

          if (hasBullets && !hasWins && !hasRisks) {
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(...primaryColor);
            executiveSummary.bullets.forEach((bullet: string) => {
              if (bullet?.trim()) {
                addNewPageIfNeeded(8);
                pdf.text("•", margin + 2, y);
                const lines = pdf.splitTextToSize(bullet, contentWidth - 10);
                pdf.text(lines[0], margin + 7, y);
                y += 5;
                if (lines.length > 1) {
                  for (let i = 1; i < lines.length; i++) {
                    addNewPageIfNeeded(5);
                    pdf.text(lines[i], margin + 7, y);
                    y += 5;
                  }
                }
              }
            });
          }
          y += 8;
        }
      }

      // ==================== ANÁLISE DE KPIs ====================
      if (metrics.length > 0) {
        drawSectionHeader("Análise de KPIs", "📊");
        
        // Table header
        const colWidths = [50, 30, 30, 25, 35];
        const tableX = margin;
        
        pdf.setFillColor(...primaryColor);
        pdf.rect(tableX, y, contentWidth, 8, 'F');
        
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(255, 255, 255);
        let xPos = tableX + 3;
        pdf.text("KPI", xPos, y + 5.5);
        xPos += colWidths[0];
        pdf.text("Meta", xPos, y + 5.5);
        xPos += colWidths[1];
        pdf.text("Realizado", xPos, y + 5.5);
        xPos += colWidths[2];
        pdf.text("Var.", xPos, y + 5.5);
        xPos += colWidths[3];
        pdf.text("Observações", xPos, y + 5.5);
        y += 8;

        // Table rows
        pdf.setFont("helvetica", "normal");
        metrics.forEach((metric: any, idx: number) => {
          addNewPageIfNeeded(10);
          
          // Alternating row background
          if (idx % 2 === 0) {
            pdf.setFillColor(249, 250, 251);
            pdf.rect(tableX, y, contentWidth, 8, 'F');
          }
          
          pdf.setTextColor(...primaryColor);
          pdf.setFontSize(9);
          
          xPos = tableX + 3;
          const label = (metric.metric_label || "-").substring(0, 25);
          pdf.text(label, xPos, y + 5.5);
          
          xPos += colWidths[0];
          pdf.text(formatValue(metric.target_value, metric.unit), xPos, y + 5.5);
          
          xPos += colWidths[1];
          pdf.text(formatValue(metric.actual_value, metric.unit), xPos, y + 5.5);
          
          xPos += colWidths[2];
          if (metric.variation_pct !== null) {
            const isPositive = metric.variation_pct >= 0;
            pdf.setTextColor(...(isPositive ? successColor : [220, 38, 38] as [number, number, number]));
            const varText = `${isPositive ? '+' : ''}${metric.variation_pct.toFixed(1)}%`;
            pdf.text(varText, xPos, y + 5.5);
          } else {
            pdf.text("-", xPos, y + 5.5);
          }
          
          xPos += colWidths[3];
          pdf.setTextColor(...mutedColor);
          const note = (metric.quick_note || "").substring(0, 20);
          pdf.text(note, xPos, y + 5.5);
          
          y += 8;
        });
        
        // Table border
        pdf.setDrawColor(...mutedColor);
        pdf.rect(tableX, y - (metrics.length * 8), contentWidth, metrics.length * 8);
        
        y += 10;
      }

      // ==================== DESEMPENHO POR CANAL ====================
      if (channels.length > 0) {
        drawSectionHeader("Desempenho por Canal", "📈");

        channels.forEach((channel: any) => {
          addNewPageIfNeeded(35);
          
          // Channel card
          pdf.setFillColor(...lightBg);
          pdf.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
          
          pdf.setFontSize(11);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(...accentColor);
          pdf.text(channel.channel?.toUpperCase() || "Canal", margin + 5, y + 5.5);
          y += 12;
          
          // Metrics row
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(...primaryColor);
          
          const channelMetrics = [];
          if (channel.investment) channelMetrics.push(`Investimento: R$ ${channel.investment.toLocaleString("pt-BR")}`);
          if (channel.leads) channelMetrics.push(`Leads: ${channel.leads}`);
          if (channel.cpl) channelMetrics.push(`CPL: R$ ${channel.cpl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
          if (channel.roas) channelMetrics.push(`ROAS: ${channel.roas.toFixed(2)}x`);
          if (channel.conversions) channelMetrics.push(`Conversões: ${channel.conversions}`);
          
          if (channelMetrics.length > 0) {
            pdf.text(channelMetrics.join("  •  "), margin + 3, y);
            y += 7;
          }
          
          if (channel.what_worked) {
            addNewPageIfNeeded(12);
            pdf.setTextColor(...successColor);
            pdf.text("✓ O que funcionou:", margin + 3, y);
            y += 5;
            pdf.setTextColor(...primaryColor);
            const lines = pdf.splitTextToSize(channel.what_worked, contentWidth - 10);
            lines.forEach((line: string) => {
              addNewPageIfNeeded(5);
              pdf.text(line, margin + 6, y);
              y += 5;
            });
          }
          
          if (channel.what_to_adjust) {
            addNewPageIfNeeded(12);
            pdf.setTextColor(234, 88, 12);
            pdf.text("→ O que ajustar:", margin + 3, y);
            y += 5;
            pdf.setTextColor(...primaryColor);
            const lines = pdf.splitTextToSize(channel.what_to_adjust, contentWidth - 10);
            lines.forEach((line: string) => {
              addNewPageIfNeeded(5);
              pdf.text(line, margin + 6, y);
              y += 5;
            });
          }
          
          y += 8;
        });
      }

      // ==================== DIAGNÓSTICO ====================
      const diagnosis = getSectionContent("diagnosis");
      const diagnosisPicker = getSectionContent("diagnosis_picker");
      const hasStandardDiagnosis = diagnosis?.items?.some((i: any) => i?.tag || i?.context);
      const hasPickerDiagnosis = diagnosisPicker?.selectedItems?.length > 0;

      if (hasStandardDiagnosis || hasPickerDiagnosis) {
        drawSectionHeader("Diagnóstico", "🔍");

        if (hasPickerDiagnosis) {
          diagnosisPicker.selectedItems.forEach((item: any) => {
            addNewPageIfNeeded(25);
            
            // Tag badge
            pdf.setFillColor(...accentColor);
            const tagText = item.tag || item.label || 'Diagnóstico';
            const tagWidth = pdf.getTextWidth(tagText) + 8;
            pdf.roundedRect(margin, y, tagWidth, 6, 1, 1, 'F');
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(255, 255, 255);
            pdf.text(tagText, margin + 4, y + 4);
            y += 10;
            
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(...primaryColor);
            
            if (item.context) {
              pdf.setFont("helvetica", "bold");
              pdf.text("Contexto: ", margin + 3, y);
              pdf.setFont("helvetica", "normal");
              const ctxLines = pdf.splitTextToSize(item.context, contentWidth - 25);
              pdf.text(ctxLines[0], margin + 3 + pdf.getTextWidth("Contexto: "), y);
              y += 5;
              if (ctxLines.length > 1) {
                for (let i = 1; i < ctxLines.length; i++) {
                  addNewPageIfNeeded(5);
                  pdf.text(ctxLines[i], margin + 3, y);
                  y += 5;
                }
              }
            }
            
            if (item.solution) {
              addNewPageIfNeeded(10);
              pdf.setFont("helvetica", "bold");
              pdf.text("Solução: ", margin + 3, y);
              pdf.setFont("helvetica", "normal");
              const solLines = pdf.splitTextToSize(item.solution, contentWidth - 22);
              pdf.text(solLines[0], margin + 3 + pdf.getTextWidth("Solução: "), y);
              y += 5;
              if (solLines.length > 1) {
                for (let i = 1; i < solLines.length; i++) {
                  addNewPageIfNeeded(5);
                  pdf.text(solLines[i], margin + 3, y);
                  y += 5;
                }
              }
            }
            y += 5;
          });
        }

        if (hasStandardDiagnosis) {
          diagnosis.items.forEach((item: any) => {
            if (item?.tag || item?.context) {
              addNewPageIfNeeded(20);
              
              // Tag badge
              pdf.setFillColor(...accentColor);
              const tagText = item.tag || 'Diagnóstico';
              const tagWidth = pdf.getTextWidth(tagText) + 8;
              pdf.roundedRect(margin, y, tagWidth, 6, 1, 1, 'F');
              pdf.setFontSize(8);
              pdf.setFont("helvetica", "bold");
              pdf.setTextColor(255, 255, 255);
              pdf.text(tagText, margin + 4, y + 4);
              y += 10;
              
              if (item.context) {
                pdf.setFontSize(10);
                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(...primaryColor);
                const lines = pdf.splitTextToSize(item.context, contentWidth - 5);
                lines.forEach((line: string) => {
                  addNewPageIfNeeded(5);
                  pdf.text(line, margin + 3, y);
                  y += 5;
                });
              }
              y += 5;
            }
          });
        }
        y += 5;
      }

      // ==================== PLANO DE AÇÃO ====================
      const actionPlan = getSectionContent("action_plan");
      const hasVivazTasks = actionPlan?.vivazTasks?.some((t: any) => t?.title);
      const hasClientTasks = actionPlan?.clientTasks?.some((t: any) => t?.title);
      const hasLegacyActions = actionPlan?.actions?.some((a: any) => a?.title || a?.description);

      if (hasVivazTasks || hasClientTasks || hasLegacyActions) {
        drawSectionHeader("Plano de Ação", "🚀");

        const renderTaskList = (tasks: any[], title: string, color: [number, number, number]) => {
          if (!tasks?.length) return;
          
          addNewPageIfNeeded(15);
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(...color);
          pdf.text(title, margin, y);
          y += 7;
          
          tasks.forEach((task: any) => {
            if (task?.title) {
              addNewPageIfNeeded(15);
              
              const isCompleted = task.status === 'completed';
              
              // Checkbox
              pdf.setDrawColor(...(isCompleted ? successColor : mutedColor));
              pdf.setFillColor(...(isCompleted ? successColor : [255, 255, 255] as [number, number, number]));
              pdf.roundedRect(margin + 2, y - 3, 4, 4, 0.5, 0.5, isCompleted ? 'F' : 'S');
              
              if (isCompleted) {
                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(7);
                pdf.text("✓", margin + 3, y);
              }
              
              pdf.setFontSize(10);
              pdf.setFont("helvetica", "normal");
              pdf.setTextColor(...primaryColor);
              const taskLines = pdf.splitTextToSize(task.title, contentWidth - 15);
              pdf.text(taskLines[0], margin + 10, y);
              y += 5;
              
              if (taskLines.length > 1) {
                for (let i = 1; i < taskLines.length; i++) {
                  addNewPageIfNeeded(5);
                  pdf.text(taskLines[i], margin + 10, y);
                  y += 5;
                }
              }
              
              // Meta info
              const metaInfo = [];
              if (task.responsible) metaInfo.push(`Resp: ${task.responsible}`);
              if (task.deadline) metaInfo.push(`Prazo: ${new Date(task.deadline).toLocaleDateString("pt-BR")}`);
              
              if (metaInfo.length > 0) {
                pdf.setFontSize(8);
                pdf.setTextColor(...mutedColor);
                pdf.text(metaInfo.join("  •  "), margin + 10, y);
                y += 5;
              }
              
              y += 2;
            }
          });
          y += 5;
        };

        if (hasVivazTasks) {
          renderTaskList(actionPlan.vivazTasks, "Ações Vivaz", accentColor);
        }

        if (hasClientTasks) {
          renderTaskList(actionPlan.clientTasks, "Ações Cliente", [59, 130, 246]);
        }

        if (hasLegacyActions && !hasVivazTasks && !hasClientTasks) {
          renderTaskList(actionPlan.actions, "Ações", primaryColor);
        }
      }

      // ==================== DÚVIDAS E DISCUSSÕES ====================
      const questions = getSectionContent("questions_discussions");
      if (questions?.content && questions.content.trim()) {
        drawSectionHeader("Dúvidas e Discussões", "💬");
        
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...primaryColor);
        
        const cleanContent = questions.content
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        const lines = pdf.splitTextToSize(cleanContent, contentWidth);
        lines.forEach((line: string) => {
          addNewPageIfNeeded(6);
          pdf.text(line, margin, y);
          y += 5;
        });
        y += 8;
      }

      // ==================== PRIORIDADE PRÓXIMO PERÍODO ====================
      if (meetingFull?.next_period_priority) {
        addNewPageIfNeeded(25);
        
        pdf.setFillColor(254, 243, 199); // Yellow light bg
        const priorityLines = pdf.splitTextToSize(meetingFull.next_period_priority, contentWidth - 14);
        const boxH = priorityLines.length * 5 + 14;
        pdf.roundedRect(margin, y, contentWidth, boxH, 3, 3, 'F');
        
        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...warningColor);
        pdf.text("🎯 Prioridade do Próximo Período", margin + 7, y + 8);
        
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...primaryColor);
        let tY = y + 15;
        priorityLines.forEach((line: string) => {
          pdf.text(line, margin + 7, tY);
          tY += 5;
        });
        y += boxH + 10;
      }

      // ==================== LEGACY CONTENT FALLBACK ====================
      if (sections.length === 0 && meeting.content) {
        drawSectionHeader("Conteúdo", "📝");
        
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...primaryColor);
        
        const cleanContent = meeting.content
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        const lines = pdf.splitTextToSize(cleanContent, contentWidth);
        lines.forEach((line: string) => {
          addNewPageIfNeeded(6);
          pdf.text(line, margin, y);
          y += 5;
        });
      }

      // Legacy action items
      if (meeting.action_items && meeting.action_items.length > 0 && !hasVivazTasks && !hasClientTasks && !hasLegacyActions) {
        drawSectionHeader("Itens de Ação", "✅");
        
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        meeting.action_items.forEach((item, idx) => {
          addNewPageIfNeeded(10);
          pdf.setTextColor(...accentColor);
          pdf.text(`${idx + 1}.`, margin, y);
          pdf.setTextColor(...primaryColor);
          const lines = pdf.splitTextToSize(item, contentWidth - 10);
          pdf.text(lines[0], margin + 8, y);
          y += 5;
          if (lines.length > 1) {
            for (let i = 1; i < lines.length; i++) {
              addNewPageIfNeeded(5);
              pdf.text(lines[i], margin + 8, y);
              y += 5;
            }
          }
          y += 2;
        });
      }

      // ==================== FOOTER ====================
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(...mutedColor);
        pdf.text(
          `Página ${i} de ${totalPages}  •  Gerado em ${new Date().toLocaleDateString("pt-BR")}  •  Vivaz Agência`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      const safeName = meeting.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').substring(0, 50);
      pdf.save(`reuniao-${safeName}.pdf`);
      toast.success("PDF gerado com sucesso!");
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
