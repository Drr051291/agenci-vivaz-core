import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Users, FileText, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeetingViewer } from "@/components/meeting-editor/MeetingViewer";
import { Badge } from "@/components/ui/badge";

interface MeetingMinute {
  id: string;
  title: string;
  meeting_date: string;
  participants?: string[];
  content: string;
  action_items?: string[];
  share_token?: string;
}

const ClientMeetings = () => {
  const [meetings, setMeetings] = useState<MeetingMinute[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

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

      setLoading(false);
    };

    checkAuthAndLoadMeetings();
  }, [navigate, toast]);

  const handleOpenShareLink = (shareToken: string) => {
    const url = `${window.location.origin}/reuniao/${shareToken}`;
    window.open(url, "_blank");
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
          <div className="grid grid-cols-1 gap-4">
            {meetings.map((meeting) => (
              <Card key={meeting.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{meeting.title}</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      {meeting.share_token && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenShareLink(meeting.share_token!)}
                          title="Abrir em nova aba"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
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
                  <div className="border-t pt-3">
                    <MeetingViewer content={meeting.content} />
                  </div>
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
      </div>
    </DashboardLayout>
  );
};

export default ClientMeetings;
