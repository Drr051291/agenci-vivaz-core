import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, BarChart3, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { DashboardViewerDialog } from "./DashboardViewerDialog";

interface Dashboard {
  id: string;
  name: string;
  dashboard_type: string;
  embed_url?: string;
  is_active: boolean;
  created_at: string;
}

interface DashboardListProps {
  clientId: string;
}

export function DashboardList({ clientId }: DashboardListProps) {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboards();
  }, [clientId]);

  const fetchDashboards = async () => {
    try {
      const { data, error } = await supabase
        .from("client_dashboards")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDashboards(data || []);
    } catch (error) {
      console.error("Erro ao buscar dashboards:", error);
      toast.error("Erro ao carregar dashboards");
    } finally {
      setLoading(false);
    }
  };

  const getPlatformInfo = (type: string) => {
    const normalizedType = type === "analytics" ? "reportei" : type;
    
    if (normalizedType === "reportei") {
      return {
        name: "Reportei",
        color: "bg-green-500/10 text-green-600 border-green-500/20",
        icon: TrendingUp,
      };
    } else if (normalizedType === "pipedrive") {
      return {
        name: "Pipedrive",
        color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        icon: BarChart3,
      };
    }
    return {
      name: normalizedType,
      color: "bg-muted",
      icon: BarChart3,
    };
  };

  const handleViewDashboard = (dashboardId: string) => {
    setSelectedDashboardId(dashboardId);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-250px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (dashboards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-250px)] gap-4">
        <p className="text-muted-foreground">
          Nenhum dashboard configurado.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {dashboards.map((dashboard) => {
          const platform = getPlatformInfo(dashboard.dashboard_type);
          const Icon = platform.icon;

          return (
            <Card key={dashboard.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${platform.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-base">{dashboard.name}</h3>
                        <Badge className={`${platform.color} border text-xs mt-1`}>
                          {platform.name}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleViewDashboard(dashboard.id)}
                      className="flex-1"
                    >
                      Visualizar
                    </Button>
                    {dashboard.embed_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        title="Abrir em Nova Aba"
                      >
                        <a
                          href={dashboard.embed_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedDashboardId && (
        <DashboardViewerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          dashboards={dashboards}
          initialDashboardId={selectedDashboardId}
        />
      )}
    </>
  );
}
