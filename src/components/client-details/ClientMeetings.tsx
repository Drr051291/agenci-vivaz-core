import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Users, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/meeting-editor/RichTextEditor";
import { MeetingViewer } from "@/components/meeting-editor/MeetingViewer";

interface MeetingMinute {
  id: string;
  title: string;
  meeting_date: string;
  participants?: string[];
  content: string;
  action_items?: string[];
  created_at: string;
}

interface ClientMeetingsProps {
  clientId: string;
}

export function ClientMeetings({ clientId }: ClientMeetingsProps) {
  const [meetings, setMeetings] = useState<MeetingMinute[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDialog(meeting)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
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
    </div>
  );
}
