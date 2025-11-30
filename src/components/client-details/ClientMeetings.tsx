import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Users, Pencil, Share2, Download, Trash2, LayoutDashboard, CheckSquare } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
}

interface ClientMeetingsProps {
  clientId: string;
}

interface Dashboard {
  id: string;
  name: string;
  dashboard_type: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
}

const INITIAL_TEMPLATE = `<h2>📊 Dashboards Analisados</h2>
<p><em>Os dashboards serão inseridos automaticamente aqui.</em></p>

<h2>📈 Análise de Resultados</h2>
<p>Descreva os principais resultados observados nos dashboards...</p>

<h2>💡 Insights e Oportunidades</h2>
<ul>
  <li>Insight 1...</li>
  <li>Insight 2...</li>
</ul>

<h2>🎯 Estratégias Propostas</h2>
<p>Detalhe as estratégias sugeridas para o próximo período...</p>

<h2>✅ Ações Definidas</h2>
<p>As atividades vinculadas serão listadas automaticamente abaixo.</p>

<h2>📝 Observações Adicionais</h2>
<p>Adicione quaisquer observações relevantes...</p>`;

export function ClientMeetings({ clientId }: ClientMeetingsProps) {
  const [meetings, setMeetings] = useState<MeetingMinute[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingMinute | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDashboards, setSelectedDashboards] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    meeting_date: "",
    participants: "",
    content: "",
    action_items: "",
  });

  useEffect(() => {
    fetchMeetings();
    fetchClientData();
  }, [clientId]);

  const fetchClientData = async () => {
    try {
      // Buscar nome do cliente
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("company_name")
        .eq("id", clientId)
        .single();

      if (clientError) throw clientError;
      setClientName(clientData.company_name);

      // Buscar dashboards do cliente
      const { data: dashboardsData, error: dashboardsError } = await supabase
        .from("client_dashboards")
        .select("id, name, dashboard_type")
        .eq("client_id", clientId)
        .eq("is_active", true);

      if (dashboardsError) throw dashboardsError;
      setDashboards(dashboardsData || []);

      // Buscar tasks do cliente
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("id, title, status")
        .eq("client_id", clientId)
        .in("status", ["pending", "in_progress"]);

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);
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

  const generateTitle = (date: string) => {
    const meetingDate = new Date(date);
    const formattedDate = format(meetingDate, "dd/MM/yyyy", { locale: ptBR });
    return `Vivaz - ${clientName} - ${formattedDate}`;
  };

  const generateDashboardsSection = () => {
    if (selectedDashboards.length === 0) {
      return "<p><em>Nenhum dashboard selecionado para esta reunião.</em></p>";
    }
    
    const dashboardsList = selectedDashboards
      .map(id => {
        const dashboard = dashboards.find(d => d.id === id);
        return dashboard ? `<li><strong>${dashboard.name}</strong> (${dashboard.dashboard_type})</li>` : "";
      })
      .join("");
    
    return `<ul>${dashboardsList}</ul>`;
  };

  const handleOpenDialog = (meeting?: MeetingMinute) => {
    if (meeting) {
      setEditingId(meeting.id);
      setFormData({
        meeting_date: meeting.meeting_date,
        participants: meeting.participants?.join(", ") || "",
        content: meeting.content,
        action_items: meeting.action_items?.join(", ") || "",
      });
      setSelectedDashboards(meeting.linked_dashboards || []);
      setSelectedTasks(meeting.linked_tasks || []);
    } else {
      setEditingId(null);
      const now = new Date();
      const localDateTime = format(now, "yyyy-MM-dd'T'HH:mm");
      
      setFormData({
        meeting_date: localDateTime,
        participants: "",
        content: INITIAL_TEMPLATE,
        action_items: "",
      });
      
      // Auto-selecionar todos os dashboards por padrão
      setSelectedDashboards(dashboards.map(d => d.id));
      setSelectedTasks([]);
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

      toast.success("Reunião deletada com sucesso!");
      setDeleteDialogOpen(false);
      setSelectedMeeting(null);
      fetchMeetings();
    } catch (error) {
      console.error("Erro ao deletar reunião:", error);
      toast.error("Erro ao deletar reunião");
    }
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

      // Inserir seção de dashboards no conteúdo
      let finalContent = formData.content;
      const dashboardsSection = generateDashboardsSection();
      finalContent = finalContent.replace(
        /<p><em>Os dashboards serão inseridos automaticamente aqui\.<\/em><\/p>/,
        dashboardsSection
      );

      const meetingData = {
        title: generateTitle(formData.meeting_date),
        meeting_date: formData.meeting_date,
        participants: participants.length > 0 ? participants : null,
        content: finalContent,
        action_items: actionItems.length > 0 ? actionItems : null,
        linked_dashboards: selectedDashboards.length > 0 ? selectedDashboards : null,
        linked_tasks: selectedTasks.length > 0 ? selectedTasks : null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("meeting_minutes")
          .update(meetingData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Reunião atualizada com sucesso!");
      } else {
        const { error } = await supabase.from("meeting_minutes").insert({
          ...meetingData,
          client_id: clientId,
          created_by: user?.id,
        });

        if (error) throw error;
        toast.success("Reunião criada com sucesso! Link de compartilhamento gerado.");
      }

      setDialogOpen(false);
      setEditingId(null);
      setFormData({
        meeting_date: "",
        participants: "",
        content: "",
        action_items: "",
      });
      setSelectedDashboards([]);
      setSelectedTasks([]);
      fetchMeetings();
    } catch (error) {
      console.error("Erro ao salvar reunião:", error);
      toast.error(editingId ? "Erro ao atualizar reunião" : "Erro ao criar reunião");
    }
  };

  const handleDashboardToggle = (dashboardId: string) => {
    setSelectedDashboards(prev =>
      prev.includes(dashboardId)
        ? prev.filter(id => id !== dashboardId)
        : [...prev, dashboardId]
    );
  };

  const handleTaskToggle = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
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
        <h2 className="text-2xl font-bold">Reuniões</h2>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Reunião
        </Button>
      </div>

      {meetings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground mb-4">Nenhuma reunião encontrada</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Reunião
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {meetings.map((meeting) => (
            <Card key={meeting.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{meeting.title}</CardTitle>
                    {meeting.linked_dashboards && meeting.linked_dashboards.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <LayoutDashboard className="h-3 w-3 text-muted-foreground" />
                        {meeting.linked_dashboards.map(dashId => {
                          const dashboard = dashboards.find(d => d.id === dashId);
                          return dashboard ? (
                            <Badge key={dashId} variant="secondary" className="text-xs">
                              {dashboard.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                    {meeting.linked_tasks && meeting.linked_tasks.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <CheckSquare className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {meeting.linked_tasks.length} atividade(s) vinculada(s)
                        </span>
                      </div>
                    )}
                  </div>
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Reunião" : "Nova Reunião"}</DialogTitle>
            <DialogDescription>
              {editingId 
                ? "Atualize os detalhes da reunião. O título será gerado automaticamente."
                : "Registre os detalhes da reunião com o cliente. O título será gerado automaticamente no formato 'Vivaz - [Cliente] - [Data]'."
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
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
                {formData.meeting_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Título: {generateTitle(formData.meeting_date)}
                  </p>
                )}
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dashboards a Incluir na Reunião</Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto bg-muted/30">
                  {dashboards.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum dashboard disponível</p>
                  ) : (
                    dashboards.map(dashboard => (
                      <div key={dashboard.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`dashboard-${dashboard.id}`}
                          checked={selectedDashboards.includes(dashboard.id)}
                          onCheckedChange={() => handleDashboardToggle(dashboard.id)}
                        />
                        <label
                          htmlFor={`dashboard-${dashboard.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {dashboard.name} <span className="text-xs text-muted-foreground">({dashboard.dashboard_type})</span>
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedDashboards.length === 0 
                    ? "Nenhum dashboard selecionado" 
                    : `${selectedDashboards.length} dashboard(s) selecionado(s)`}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Atividades a Vincular</Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto bg-muted/30">
                  {tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma atividade disponível</p>
                  ) : (
                    tasks.map(task => (
                      <div key={task.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`task-${task.id}`}
                          checked={selectedTasks.includes(task.id)}
                          onCheckedChange={() => handleTaskToggle(task.id)}
                        />
                        <label
                          htmlFor={`task-${task.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {task.title}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedTasks.length === 0 
                    ? "Nenhuma atividade vinculada" 
                    : `${selectedTasks.length} atividade(s) vinculada(s)`}
                </p>
              </div>
            </div>

            <div>
              <Label>Conteúdo da Reunião *</Label>
              <RichTextEditor
                content={formData.content}
                onChange={(content) =>
                  setFormData({ ...formData, content })
                }
                placeholder="Use o template estruturado ou personalize conforme necessário. Você pode colar imagens (Ctrl+V), adicionar formatação, títulos, listas e incorporar vídeos do YouTube."
              />
            </div>

            <div>
              <Label htmlFor="action_items">
                Itens de Ação Adicionais (separados por vírgula)
              </Label>
              <Input
                id="action_items"
                value={formData.action_items}
                onChange={(e) =>
                  setFormData({ ...formData, action_items: e.target.value })
                }
                placeholder="Aprovar orçamento, Agendar próxima reunião, Revisar layout"
              />
              <p className="text-xs text-muted-foreground mt-1">
                As atividades vinculadas também serão incluídas automaticamente como itens de ação.
              </p>
            </div>

            <Button type="submit" className="w-full">
              {editingId ? "Atualizar Reunião" : "Criar Reunião"}
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
            <AlertDialogTitle>Tem certeza que deseja deletar esta reunião?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A reunião "{selectedMeeting?.title}" será permanentemente removida do sistema, incluindo seu link de compartilhamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar Reunião
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}