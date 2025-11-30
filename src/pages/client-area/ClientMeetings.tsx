import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, FileText, Download, ExternalLink, CheckSquare, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeetingViewer } from "@/components/meeting-editor/MeetingViewer";
import { Badge } from "@/components/ui/badge";
import { usePageMeta } from "@/hooks/usePageMeta";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface MeetingMinute {
  id: string;
  title: string;
  meeting_date: string;
  participants?: string[];
  content: string;
  action_items?: string[];
  share_token?: string;
  linked_dashboards?: string[];
  linked_tasks?: string[];
}

interface Dashboard {
  id: string;
  name: string;
  dashboard_type: string;
}

const ClientMeetings = () => {
  const [meetings, setMeetings] = useState<MeetingMinute[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  usePageMeta({
    title: "Reuniões - Área do Cliente",
    description: "Acompanhe as reuniões realizadas e seus resultados",
    keywords: "reuniões, atas, área do cliente, vivaz",
  });

  useEffect(() => {
    const checkAuthAndLoadMeetings = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      // Verificar se é cliente
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (userRole?.role !== "client") {
        navigate("/dashboard");
        return;
      }

      // Buscar cliente vinculado
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (!client) {
        toast({
          title: "Erro",
          description: "Cliente não encontrado",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Buscar reuniões do cliente
      const { data: meetingsData, error } = await supabase
        .from("meeting_minutes")
        .select("*")
        .eq("client_id", client.id)
        .order("meeting_date", { ascending: false });

      if (error) {
        console.error("Erro ao buscar reuniões:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as reuniões",
          variant: "destructive",
        });
      } else {
        setMeetings(meetingsData || []);
      }

      // Buscar dashboards do cliente
      const { data: dashboardsData } = await supabase
        .from("client_dashboards")
        .select("id, name, dashboard_type")
        .eq("client_id", client.id)
        .eq("is_active", true);

      setDashboards(dashboardsData || []);
      setLoading(false);
    };

    checkAuthAndLoadMeetings();
  }, [navigate, toast]);

  const handleOpenShareLink = (shareToken: string) => {
    const url = `${window.location.origin}/reuniao/${shareToken}`;
    window.open(url, "_blank");
  };

  const handleDownloadPDF = async (meeting: MeetingMinute) => {
    setDownloadingId(meeting.id);
    try {
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.padding = '40px';
      tempDiv.style.background = 'white';
      
      tempDiv.innerHTML = `
        <div style="font-family: 'Montserrat', sans-serif;">
          <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 20px; color: #1F1821;">${meeting.title}</h1>
          <div style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #efefef;">
            <p style="color: #666; margin: 10px 0;">
              <strong>Data:</strong> ${new Date(meeting.meeting_date).toLocaleDateString("pt-BR", { dateStyle: "long" })}
            </p>
            ${meeting.participants && meeting.participants.length > 0 ? `
              <p style="color: #666; margin: 10px 0;">
                <strong>Participantes:</strong> ${meeting.participants.join(", ")}
              </p>
            ` : ''}
          </div>
          <div style="line-height: 1.8; color: #1F1821;">
            ${meeting.content}
          </div>
          ${meeting.action_items && meeting.action_items.length > 0 ? `
            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #efefef;">
              <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 15px;">Itens de Ação</h3>
              <ul style="line-height: 2;">
                ${meeting.action_items.map(item => `<li style="color: #666;">${item}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `;
      
      document.body.appendChild(tempDiv);

      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      document.body.removeChild(tempDiv);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const pageHeight = 297;
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

      pdf.save(`reuniao-${meeting.title}.pdf`);
      toast({
        title: "PDF baixado!",
        description: "O arquivo foi salvo com sucesso",
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o PDF",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reuniões</h1>
          <p className="text-muted-foreground">
            Acompanhe as reuniões realizadas e seus resultados
          </p>
        </div>

        {meetings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhuma reunião disponível ainda.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {meetings.map((meeting) => (
              <Card key={meeting.id} className="overflow-hidden">
                <CardHeader className="bg-muted/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{meeting.title}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(meeting.meeting_date).toLocaleDateString("pt-BR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {meeting.share_token && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenShareLink(meeting.share_token!)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Abrir
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadPDF(meeting)}
                        disabled={downloadingId === meeting.id}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {downloadingId === meeting.id ? "Baixando..." : "PDF"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {meeting.linked_dashboards && meeting.linked_dashboards.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <LayoutDashboard className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Dashboards Analisados</h3>
                      </div>
                      <p className="text-sm text-muted-foreground italic">
                        Os dashboards serão inseridos automaticamente aqui.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {meeting.linked_dashboards.map(dashId => {
                          const dashboard = dashboards.find(d => d.id === dashId);
                          return dashboard ? (
                            <Badge key={dashId} variant="secondary" className="text-sm py-1 px-3">
                              {dashboard.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {meeting.participants && meeting.participants.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-4">
                      <Users className="h-4 w-4" />
                      <span>Participantes: {meeting.participants.join(", ")}</span>
                    </div>
                  )}

                  <div className="prose prose-sm max-w-none border-t pt-6">
                    <MeetingViewer content={meeting.content} />
                  </div>

                  {meeting.action_items && meeting.action_items.length > 0 && (
                    <div className="border-t pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <CheckSquare className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Ações Definidas</h3>
                      </div>
                      <ul className="list-disc list-inside space-y-2">
                        {meeting.action_items.map((item, idx) => (
                          <li key={idx} className="text-muted-foreground">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {meeting.linked_tasks && meeting.linked_tasks.length > 0 && (
                    <div className="text-sm text-muted-foreground border-t pt-4">
                      <span className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4" />
                        {meeting.linked_tasks.length} atividade(s) vinculada(s)
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClientMeetings;
