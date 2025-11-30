import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Calendar, Users, CheckSquare, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { usePageMeta } from "@/hooks/usePageMeta";

interface MeetingMinute {
  id: string;
  title: string;
  meeting_date: string;
  participants: string[] | null;
  content: string;
  action_items: string[] | null;
  linked_dashboards: string[] | null;
  linked_tasks: string[] | null;
  share_token: string | null;
}

interface Dashboard {
  id: string;
  name: string;
  dashboard_type: string;
}

export default function ClientMeetings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<MeetingMinute[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  usePageMeta({
    title: "Minhas Reuniões - Área do Cliente",
    description: "Visualize as reuniões e atas da sua conta",
    keywords: "reuniões, atas, cliente, vivaz",
  });

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Verificar role do usuário
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
        navigate("/auth");
        return;
      }

      // Buscar dashboards do cliente
      const { data: dashboardsData } = await supabase
        .from("client_dashboards")
        .select("id, name, dashboard_type")
        .eq("client_id", client.id)
        .eq("is_active", true);

      setDashboards(dashboardsData || []);

      // Buscar reuniões do cliente
      const { data: meetingsData, error } = await supabase
        .from("meeting_minutes")
        .select("*")
        .eq("client_id", client.id)
        .order("meeting_date", { ascending: false });

      if (error) throw error;

      setMeetings(meetingsData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar reuniões");
    } finally {
      setLoading(false);
    }
  };

  const handleViewMeeting = (meetingId: string) => {
    navigate(`/area-cliente/reunioes/${meetingId}`);
  };

  const handleDownloadPDF = async (meeting: MeetingMinute) => {
    setDownloadingId(meeting.id);
    try {
      // Criar elemento temporário para renderizar o conteúdo
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      tempDiv.style.width = "800px";
      tempDiv.style.padding = "40px";
      tempDiv.style.backgroundColor = "white";
      tempDiv.style.color = "black";

      tempDiv.innerHTML = `
        <div style="font-family: Arial, sans-serif;">
          <h1 style="margin-bottom: 20px; font-size: 24px;">${meeting.title}</h1>
          <p style="margin-bottom: 10px;"><strong>Data:</strong> ${format(new Date(meeting.meeting_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
          ${meeting.participants && meeting.participants.length > 0 ? `<p style="margin-bottom: 20px;"><strong>Participantes:</strong> ${meeting.participants.join(", ")}</p>` : ""}
          <hr style="margin: 30px 0; border: none; border-top: 2px solid #ddd;" />
          <div style="margin-bottom: 30px;">
            ${meeting.content}
          </div>
          ${meeting.action_items && meeting.action_items.length > 0 ? `
            <hr style="margin: 30px 0; border: none; border-top: 2px solid #ddd;" />
            <h2 style="margin-bottom: 15px; font-size: 20px;">Itens de Ação</h2>
            <ol style="padding-left: 20px;">
              ${meeting.action_items.map(item => `<li style="margin-bottom: 10px;">${item}</li>`).join("")}
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
      pdf.save(`${meeting.title}.pdf`);

      toast.success("PDF baixado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const getDashboardNames = (dashboardIds: string[] | null) => {
    if (!dashboardIds || dashboardIds.length === 0) return [];
    return dashboards
      .filter(d => dashboardIds.includes(d.id))
      .map(d => d.name);
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reuniões</h1>
          <p className="text-muted-foreground">Visualize suas reuniões e atas</p>
        </div>

        {meetings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhuma reunião disponível no momento
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {meetings.map((meeting) => {
              const linkedDashboardNames = getDashboardNames(meeting.linked_dashboards);
              const actionItemsCount = meeting.action_items?.length || 0;

              return (
                <Card 
                  key={meeting.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleViewMeeting(meeting.id)}
                >
                  <CardHeader>
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold line-clamp-2">
                        {meeting.title}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(meeting.meeting_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </div>

                      {linkedDashboardNames.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {linkedDashboardNames.slice(0, 2).map((name, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              📊 {name}
                            </Badge>
                          ))}
                          {linkedDashboardNames.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{linkedDashboardNames.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}

                      {actionItemsCount > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckSquare className="h-4 w-4 text-primary" />
                          <span className="text-muted-foreground">
                            {actionItemsCount} ação{actionItemsCount > 1 ? "ões" : ""} definida{actionItemsCount > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}

                      {meeting.participants && meeting.participants.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span className="line-clamp-1">
                            {meeting.participants.join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="flex gap-2">
                      <Button 
                        variant="default" 
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewMeeting(meeting.id);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Visualizar
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPDF(meeting);
                        }}
                        disabled={downloadingId === meeting.id}
                      >
                        {downloadingId === meeting.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
