import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Users, Pencil, Share2, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/meeting-editor/RichTextEditor";
import { MeetingViewer } from "@/components/meeting-editor/MeetingViewer";
import { ShareMeetingDialog } from "@/components/meeting-editor/ShareMeetingDialog";
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
  share_token?: string;
}

interface ClientMeetingsProps {
  clientId: string;
}

export function ClientMeetings({ clientId }: ClientMeetingsProps) {
  const [meetings, setMeetings] = useState<MeetingMinute[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingMinute | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    meeting_date: "",
    participants: "",
    content: "",
    action_items: "",
  });

  useEffect(() => {
    fetchMeetings();
  }, [clientId]);

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
      console.error("Erro ao buscar atas:", error);
      toast.error("Erro ao carregar atas de reunião");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (meeting?: MeetingMinute) => {
    if (meeting) {
      setEditingId(meeting.id);
      setFormData({
        title: meeting.title,
        meeting_date: meeting.meeting_date,
        participants: meeting.participants?.join(", ") || "",
        content: meeting.content,
        action_items: meeting.action_items?.join(", ") || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        title: "",
        meeting_date: "",
        participants: "",
        content: "",
        action_items: "",
      });
    }
    setDialogOpen(true);
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
      const { error } = await supabase
        .from("meeting_minutes")
        .delete()
        .eq("id", selectedMeeting.id);

      if (error) throw error;

      toast.success("Ata deletada com sucesso!");
      setDeleteDialogOpen(false);
      setSelectedMeeting(null);
      fetchMeetings();
    } catch (error) {
      console.error("Erro ao deletar ata:", error);
      toast.error("Erro ao deletar ata");
    }
  };

  const handleDownloadPDF = async (meeting: MeetingMinute) => {
    setDownloadingId(meeting.id);
    try {
      // Criar um elemento temporário para renderizar o conteúdo
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

      pdf.save(`ata-${meeting.title}.pdf`);
      toast.success("PDF baixado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const participants = formData.participants
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p);

      const actionItems = formData.action_items
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item);

      const meetingData = {
        title: formData.title,
        meeting_date: formData.meeting_date,
        participants: participants.length > 0 ? participants : null,
        content: formData.content,
        action_items: actionItems.length > 0 ? actionItems : null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("meeting_minutes")
          .update(meetingData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Ata atualizada com sucesso!");
      } else {
        const { error } = await supabase.from("meeting_minutes").insert({
          ...meetingData,
          client_id: clientId,
          created_by: user?.id,
        });

        if (error) throw error;
        toast.success("Ata criada com sucesso!");
      }

      setDialogOpen(false);
      setEditingId(null);
      setFormData({
        title: "",
        meeting_date: "",
        participants: "",
        content: "",
        action_items: "",
      });
      fetchMeetings();
    } catch (error) {
      console.error("Erro ao salvar ata:", error);
      toast.error(editingId ? "Erro ao atualizar ata" : "Erro ao criar ata de reunião");
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Atas de Reunião</h2>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Ata
        </Button>
      </div>

      {meetings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground mb-4">Nenhuma ata encontrada</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Ata
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {meetings.map((meeting) => (
            <Card key={meeting.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{meeting.title}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShare(meeting)}
                      title="Compartilhar"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadPDF(meeting)}
                      disabled={downloadingId === meeting.id}
                      title="Baixar PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(meeting)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(meeting)}
                      title="Deletar"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(meeting.meeting_date).toLocaleDateString("pt-BR", {
                    dateStyle: "long",
                  })}
                </div>
                {meeting.participants && meeting.participants.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {meeting.participants.join(", ")}
                  </div>
                )}
                <MeetingViewer content={meeting.content} />
                {meeting.action_items && meeting.action_items.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-2">Itens de Ação:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
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
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Ata de Reunião" : "Nova Ata de Reunião"}</DialogTitle>
            <DialogDescription>
              {editingId 
                ? "Atualize os detalhes da reunião. Use o editor para formatar texto, adicionar imagens e vídeos."
                : "Registre os detalhes da reunião com o cliente. Use o editor para formatar texto, adicionar imagens e vídeos."
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="meeting_date">Data da Reunião *</Label>
                <Input
                  id="meeting_date"
                  type="datetime-local"
                  value={formData.meeting_date}
                  onChange={(e) =>
                    setFormData({ ...formData, meeting_date: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="participants">
                Participantes (separados por vírgula)
              </Label>
              <Input
                id="participants"
                value={formData.participants}
                onChange={(e) =>
                  setFormData({ ...formData, participants: e.target.value })
                }
                placeholder="João Silva, Maria Santos, etc."
              />
            </div>
            <div>
              <Label>Conteúdo da Ata *</Label>
              <RichTextEditor
                content={formData.content}
                onChange={(content) =>
                  setFormData({ ...formData, content })
                }
                placeholder="Escreva o conteúdo da ata aqui. Você pode colar imagens (Ctrl+V), adicionar formatação, títulos, listas e incorporar vídeos do YouTube."
              />
            </div>
            <div>
              <Label htmlFor="action_items">
                Itens de Ação (um por linha)
              </Label>
              <Input
                id="action_items"
                value={formData.action_items}
                onChange={(e) =>
                  setFormData({ ...formData, action_items: e.target.value })
                }
                placeholder="Aprovar orçamento, Agendar próxima reunião, Revisar layout (separados por vírgula)"
              />
            </div>
            <Button type="submit" className="w-full">
              {editingId ? "Atualizar Ata" : "Criar Ata"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {selectedMeeting && selectedMeeting.share_token && (
        <ShareMeetingDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          shareToken={selectedMeeting.share_token}
          meetingTitle={selectedMeeting.title}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja deletar esta ata?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A ata "{selectedMeeting?.title}" será permanentemente removida do sistema, incluindo seu link de compartilhamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar Ata
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
