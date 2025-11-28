import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [selectedDashboardId, setSelectedDashboardId] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    fetchDashboards();
  }, [clientId]);

  useEffect(() => {
    if (dashboards.length > 0 && !selectedDashboardId) {
      setSelectedDashboardId(dashboards[0].id);
    }
  }, [dashboards, selectedDashboardId]);

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

  const selectedDashboard = dashboards.find(d => d.id === selectedDashboardId);

  // Convert dashboard URL to embed URL for Reportei
  const getEmbedUrl = (url?: string) => {
    if (!url) return url;
    // Convert https://app.reportei.com/dashboard/xxx to https://app.reportei.com/embed/xxx
    return url.replace('/dashboard/', '/embed/');
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
      <div className="flex items-center justify-center h-[calc(100vh-250px)]">
        <p className="text-muted-foreground">
          Nenhum dashboard configurado. Configure em Integrações.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-250px)] space-y-3">
      <div className="flex items-center justify-between gap-4">
        <Select value={selectedDashboardId || ""} onValueChange={setSelectedDashboardId}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Selecione um dashboard" />
          </SelectTrigger>
          <SelectContent>
            {dashboards.map((dashboard) => (
              <SelectItem key={dashboard.id} value={dashboard.id}>
                {dashboard.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIframeKey(prev => prev + 1)}
            title="Atualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {selectedDashboard?.embed_url && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              title="Abrir em Nova Aba"
            >
              <a
                href={selectedDashboard.embed_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1">
        {selectedDashboard?.embed_url ? (
          <iframe
            key={iframeKey}
            src={getEmbedUrl(selectedDashboard.embed_url)}
            className="w-full h-full border-0 rounded-lg"
            title={selectedDashboard.name}
            allow="fullscreen"
          />
        ) : (
          <div className="flex items-center justify-center h-full border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">Dashboard sem URL configurada</p>
          </div>
        )}
      </div>
    </div>
  );
}
