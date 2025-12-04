import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MeetingViewer } from "@/components/meeting-editor/MeetingViewer";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ArrowLeft, Calendar, Users, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/dateUtils";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { usePageMeta } from "@/hooks/usePageMeta";

interface MeetingData {
  title: string;
  meeting_date: string;
  participants: string[] | null;
  content: string;
  action_items: string[] | null;
  client_id: string;
}

export default function ClientMeetingView() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [meetingData, setMeetingData] = useState<MeetingData | null>(null);

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
        .select("title, meeting_date, participants, content, action_items, client_id")
        .eq("id", meetingId)
        .eq("client_id", client.id)
        .single();

      if (error || !meeting) {
        toast.error("Reunião não encontrada");
        navigate("/area-cliente/atas");
        return;
      }

      setMeetingData(meeting);
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
          <p style="margin-bottom: 10px;"><strong>Data:</strong> ${format(parseLocalDate(meetingData.meeting_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
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
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/area-cliente/atas")}
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
                  {format(parseLocalDate(meetingData.meeting_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={downloading}
          >
            {downloading ? (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary mr-1.5" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-1.5" />
            )}
            Baixar PDF
          </Button>
        </div>


        {/* Content */}
        <div className="space-y-3 border-t pt-4">
          <h2 className="text-lg font-medium">Discussões e Anotações</h2>
          <Card>
            <CardContent className="p-4">
              <MeetingViewer content={meetingData.content} />
            </CardContent>
          </Card>
        </div>

        {/* Action Items */}
        {meetingData.action_items && meetingData.action_items.length > 0 && (
          <div className="space-y-3 border-t pt-4">
            <h2 className="text-lg font-medium">Itens de Ação</h2>
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3">
                  {meetingData.action_items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 flex-1 min-w-[200px]">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-primary">{idx + 1}</span>
                      </div>
                      <span className="flex-1 text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
