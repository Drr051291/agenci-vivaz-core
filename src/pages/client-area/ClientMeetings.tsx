import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Calendar, Users, CheckSquare, FileText, ExternalLink } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { safeFormatDate } from "@/lib/dateUtils";
import { toast } from "sonner";
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

  const handleOpenPublicLink = (meeting: MeetingMinute) => {
    if (meeting.share_token) {
      window.open(`https://hub.vivazagencia.com.br/reunioes/${meeting.share_token}`, '_blank');
    } else {
      toast.error("Link público não disponível para esta reunião");
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
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Reuniões</h1>
          <p className="text-sm text-muted-foreground">Visualize suas reuniões e atas</p>
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
          <div className="space-y-4">
            {meetings.map((meeting) => {
              const linkedDashboardNames = getDashboardNames(meeting.linked_dashboards);
              const actionItemsCount = meeting.action_items?.length || 0;

              return (
                <Card 
                  key={meeting.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewMeeting(meeting.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <h3 className="text-base font-medium line-clamp-1">
                          {meeting.title}
                        </h3>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{safeFormatDate(meeting.meeting_date, "dd MMM yyyy", { locale: ptBR })}</span>
                          </div>

                          {linkedDashboardNames.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span>•</span>
                              <span className="line-clamp-1">
                                {linkedDashboardNames.slice(0, 2).join(", ")}
                                {linkedDashboardNames.length > 2 && ` +${linkedDashboardNames.length - 2}`}
                              </span>
                            </div>
                          )}

                          {actionItemsCount > 0 && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1.5">
                                <CheckSquare className="h-3.5 w-3.5" />
                                <span>{actionItemsCount} ação{actionItemsCount > 1 ? "ões" : ""}</span>
                              </div>
                            </>
                          )}

                          {meeting.participants && meeting.participants.length > 0 && (
                            <>
                              <span>•</span>
                              <div className="flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5" />
                                <span className="line-clamp-1">
                                  {meeting.participants.slice(0, 2).join(", ")}
                                  {meeting.participants.length > 2 && ` +${meeting.participants.length - 2}`}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1.5 flex-shrink-0">
                        <Button 
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewMeeting(meeting.id);
                          }}
                        >
                          Ver
                        </Button>
                        {meeting.share_token && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPublicLink(meeting);
                            }}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
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
