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

interface MeetingMinute {
  id: string;
  title: string;
  meeting_date: string;
  participants?: string[];
  content: string;
  action_items?: string[];
  created_at: string;
}

export default function SharedMeeting() {
  const { token } = useParams<{ token: string }>();
  const [meeting, setMeeting] = useState<MeetingMinute | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

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
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex justify-end">
          <Button
            onClick={handleDownloadPDF}
            disabled={downloading}
            variant="outline"
          >
            <Download className="mr-2 h-4 w-4" />
            {downloading ? "Gerando PDF..." : "Baixar PDF"}
          </Button>
        </div>

        <Card id="meeting-content">
          <CardHeader>
            <CardTitle className="text-2xl">{meeting.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pb-4 border-b">
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

            <div className="py-4">
              <MeetingViewer content={meeting.content} />
            </div>

            {meeting.action_items && meeting.action_items.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3">Itens de Ação</h3>
                <ul className="list-disc list-inside space-y-2">
                  {meeting.action_items.map((item, idx) => (
                    <li key={idx} className="text-muted-foreground">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>HUB Vivaz - Ata de Reunião Compartilhada</p>
        </div>
      </div>
    </div>
  );
}