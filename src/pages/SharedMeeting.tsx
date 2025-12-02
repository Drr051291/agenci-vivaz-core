import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeetingViewer } from "@/components/meeting-editor/MeetingViewer";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { usePageMeta } from "@/hooks/usePageMeta";
import { parseLocalDate } from "@/lib/dateUtils";

interface MeetingMinute {
  id: string;
  title: string;
  meeting_date: string;
  participants?: string[];
  content: string;
  action_items?: string[];
  linked_dashboards?: string[];
  created_at: string;
}

export default function SharedMeeting() {
  const { token } = useParams<{ token: string }>();
  const [meeting, setMeeting] = useState<MeetingMinute | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  usePageMeta({
    title: meeting ? meeting.title : "Reunião Compartilhada",
    description: `Reunião compartilhada - ${meeting?.title || 'HUB Vivaz'}`,
    keywords: "reunião, compartilhada, ata, vivaz",
  });

  useEffect(() => {
    if (token) {
      fetchMeeting();
    }
  }, [token]);

  const fetchMeeting = async () => {
    try {
      const { data, error } = await supabase
        .from("meeting_minutes")
        .select("*")
        .eq("share_token", token)
        .single();

      if (error) throw error;
      setMeeting(data);
    } catch (error) {
      console.error("Erro ao buscar ata:", error);
      toast.error("Ata não encontrada ou link inválido");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!meeting) return;
    
    setDownloading(true);
    try {
      const content = document.getElementById('meeting-content');
      if (!content) return;

      const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`ata-${meeting.title}.pdf`);
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
            <h2 className="text-2xl font-bold mb-2">Ata não encontrada</h2>
            <p className="text-muted-foreground">
              O link pode estar incorreto ou a ata pode ter sido removida.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-xl font-bold text-primary">V</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{meeting.title}</h1>
              <p className="text-sm text-muted-foreground">HUB Vivaz - Reunião Compartilhada</p>
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

        <Card id="meeting-content">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {parseLocalDate(meeting.meeting_date).toLocaleDateString("pt-BR", {
                  dateStyle: "long",
                })}
              </div>
              {meeting.participants && meeting.participants.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {meeting.participants.join(", ")}
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Dashboards Section */}
            {meeting.linked_dashboards && meeting.linked_dashboards.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  📊 Dashboards Analisados
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {meeting.linked_dashboards.map((dashboardId, idx) => (
                    <DashboardEmbed key={idx} dashboardId={dashboardId} />
                  ))}
                </div>
              </div>
            )}

            {/* Content Section */}
            <div className="space-y-4 border-t pt-8">
              <h3 className="text-xl font-semibold">📝 Discussões e Anotações</h3>
              <div className="prose prose-sm max-w-none">
                <MeetingViewer content={meeting.content} />
              </div>
            </div>

            {/* Action Items */}
            {meeting.action_items && meeting.action_items.length > 0 && (
              <div className="space-y-4 border-t pt-8">
                <h3 className="text-xl font-semibold">✅ Itens de Ação</h3>
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Component for embedded dashboards
function DashboardEmbed({ dashboardId }: { dashboardId: string }) {
  const [dashboard, setDashboard] = useState<any>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      const { data } = await supabase
        .from("client_dashboards")
        .select("*")
        .eq("id", dashboardId)
        .single();
      
      if (data) setDashboard(data);
    };
    fetchDashboard();
  }, [dashboardId]);

  if (!dashboard) return null;

  const isDashboardReportei = dashboard.dashboard_type?.toLowerCase().includes('reportei');
  const isDashboardPipedrive = dashboard.dashboard_type?.toLowerCase().includes('pipedrive');

  return (
    <Card 
      className="hover:shadow-md transition-all cursor-pointer group"
      onClick={() => dashboard.embed_url && window.open(dashboard.embed_url, "_blank")}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isDashboardReportei ? 'bg-green-500/10' : 
            isDashboardPipedrive ? 'bg-blue-500/10' : 
            'bg-primary/10'
          }`}>
            {isDashboardReportei ? (
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            ) : isDashboardPipedrive ? (
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium mb-1 line-clamp-2">
              {dashboard.name}
            </h3>
            <p className="text-xs text-muted-foreground mb-2">
              {isDashboardReportei ? 'Reportei' : 
               isDashboardPipedrive ? 'Pipedrive' : 
               dashboard.dashboard_type}
            </p>
            {dashboard.embed_url && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 group-hover:bg-accent"
              >
                Abrir Dashboard →
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}