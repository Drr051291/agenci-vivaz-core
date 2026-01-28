import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { DashboardList } from "@/components/client-details/DashboardList";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useClientUser } from "@/hooks/useClientUser";

const ClientDashboards = () => {
  const { clientId, loading: authLoading, error } = useClientUser();

  usePageMeta({
    title: "Dashboards - Área do Cliente",
    description: "Visualize seus dashboards de métricas e performance",
    keywords: "dashboards, métricas, performance, área do cliente, vivaz",
  });

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">{error}</p>
          </CardContent>
        </Card>
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
          <DashboardList clientId={clientId} />
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
