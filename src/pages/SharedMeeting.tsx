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
                {new Date(meeting.meeting_date).toLocaleDateString("pt-BR", {
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{dashboard.name}</span>
          {dashboard.embed_url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(dashboard.embed_url, "_blank")}
            >
              Abrir Completo →
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {dashboard.embed_url ? (
          <iframe
            src={dashboard.embed_url}
            className="w-full h-[400px] border-0"
            title={dashboard.name}
          />
        ) : (
          <div className="h-[400px] flex items-center justify-center bg-muted">
            <p className="text-muted-foreground">Dashboard não disponível</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}