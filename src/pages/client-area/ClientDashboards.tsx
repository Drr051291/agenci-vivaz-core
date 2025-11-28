import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BarChart3 } from "lucide-react";
import { PipedriveMetrics } from "@/components/client-details/PipedriveMetrics";

const ClientDashboards = () => {
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
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

      // Buscar o client_id associado ao usuário
      const { data: clientData } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (clientData) {
        setClientId(clientData.id);
      }

      setLoading(false);
    };

    checkAuth();
  }, [navigate, toast]);

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
          <h1 className="text-3xl font-bold tracking-tight">Dashboards</h1>
          <p className="text-muted-foreground">
            Visualize seus dashboards de métricas e performance
          </p>
        </div>

{clientId ? (
          <PipedriveMetrics clientId={clientId} />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhum dashboard disponível ainda.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClientDashboards;
