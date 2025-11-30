import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MeetingViewer } from "@/components/meeting-editor/MeetingViewer";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ArrowLeft, Calendar, Users, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { usePageMeta } from "@/hooks/usePageMeta";

interface Dashboard {
  id: string;
  name: string;
  dashboard_type: string;
  embed_url: string | null;
}

interface MeetingData {
  title: string;
  meeting_date: string;
  participants: string[] | null;
  content: string;
  action_items: string[] | null;
  linked_dashboards: string[] | null;
  client_id: string;
}

export default function ClientMeetingView() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [meetingData, setMeetingData] = useState<MeetingData | null>(null);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);

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

      // Verificar role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "client") {
        navigate("/auth");
        return;
      }

      // Buscar cliente vinculado
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!client) {
        toast.error("Nenhum cliente vinculado encontrado");
        navigate("/area-cliente/atas");
        return;
      }

      // Buscar reunião
      const { data: meeting, error } = await supabase
        .from("meeting_minutes")
        .select("*")
        .eq("id", meetingId)
        .eq("client_id", client.id)
        .single();

      if (error || !meeting) {
        toast.error("Reunião não encontrada");
        navigate("/area-cliente/atas");
        return;
      }

      setMeetingData(meeting);

      // Buscar dashboards vinculados
      if (meeting.linked_dashboards && meeting.linked_dashboards.length > 0) {
        const { data: dashboardsData } = await supabase
          .from("client_dashboards")
          .select("id, name, dashboard_type, embed_url")
          .in("id", meeting.linked_dashboards)
          .eq("is_active", true);

        setDashboards(dashboardsData || []);
      }
    } catch (error) {
      console.error("Erro ao carregar reunião:", error);
      toast.error("Erro ao carregar reunião");
      navigate("/area-cliente/atas");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!meetingData) return;

    setDownloading(true);
    try {
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      tempDiv.style.width = "800px";
      tempDiv.style.padding = "40px";
      tempDiv.style.backgroundColor = "white";
      tempDiv.style.color = "black";

      tempDiv.innerHTML = `
        <div style="font-family: Arial, sans-serif;">
          <h1 style="margin-bottom: 20px; font-size: 24px;">${meetingData.title}</h1>
          <p style="margin-bottom: 10px;"><strong>Data:</strong> ${format(new Date(meetingData.meeting_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
          ${meetingData.participants && meetingData.participants.length > 0 ? `<p style="margin-bottom: 20px;"><strong>Participantes:</strong> ${meetingData.participants.join(", ")}</p>` : ""}
          <hr style="margin: 30px 0; border: none; border-top: 2px solid #ddd;" />
          <div style="margin-bottom: 30px;">
            ${meetingData.content}
          </div>
          ${meetingData.action_items && meetingData.action_items.length > 0 ? `
            <hr style="margin: 30px 0; border: none; border-top: 2px solid #ddd;" />
            <h2 style="margin-bottom: 15px; font-size: 20px;">Itens de Ação</h2>
            <ol style="padding-left: 20px;">
              ${meetingData.action_items.map(item => `<li style="margin-bottom: 10px;">${item}</li>`).join("")}
            </ol>
          ` : ""}
        </div>
      `;

      document.body.appendChild(tempDiv);

      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      document.body.removeChild(tempDiv);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`${meetingData.title}.pdf`);

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
                onClick={() => navigate("/area-cliente/atas")}
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold mb-4">{meetingData.title}</h1>
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/area-cliente/atas")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={downloading}
          >
            {downloading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Baixar PDF
          </Button>
        </div>

        {/* Metadata */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {format(new Date(meetingData.meeting_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
              {meetingData.participants && meetingData.participants.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{meetingData.participants.join(", ")}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dashboards */}
        {dashboards.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">📊 Dashboards Analisados</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {dashboards.map((dashboard) => (
                <Card key={dashboard.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
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
                        className="w-full h-[500px] border-0"
                        title={dashboard.name}
                      />
                    ) : (
                      <div className="h-[500px] flex items-center justify-center bg-muted">
                        <p className="text-muted-foreground">Dashboard não disponível</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="space-y-4 border-t pt-6">
          <h2 className="text-2xl font-semibold">📝 Discussões e Anotações</h2>
          <Card>
            <CardContent className="pt-6">
              <MeetingViewer content={meetingData.content} />
            </CardContent>
          </Card>
        </div>

        {/* Action Items */}
        {meetingData.action_items && meetingData.action_items.length > 0 && (
          <div className="space-y-4 border-t pt-6">
            <h2 className="text-2xl font-semibold">✅ Itens de Ação</h2>
            <Card>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  {meetingData.action_items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-sm font-semibold text-primary">{idx + 1}</span>
                      </div>
                      <span className="flex-1">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
