import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink, Maximize2, Pencil, Trash2, Loader2, RefreshCw } from "lucide-react";
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
  config?: any;
}

interface ClientDashboardsProps {
  clientId: string;
}

export function ClientDashboards({ clientId }: ClientDashboardsProps) {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    dashboard_type: "reportei",
    embed_url: "",
  });

  useEffect(() => {
    fetchDashboards();
  }, [clientId]);

  useEffect(() => {
    if (dashboards.length > 0 && !selectedDashboard) {
      setSelectedDashboard(dashboards[0]);
    }
  }, [dashboards]);

  const fetchDashboards = async () => {
    try {
      const { data, error } = await supabase
        .from("client_dashboards")
        .select("*")
        .eq("client_id", clientId)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingDashboard) {
        const { error } = await supabase
          .from("client_dashboards")
          .update({
            name: formData.name,
            dashboard_type: formData.dashboard_type,
            embed_url: formData.embed_url || null,
          })
          .eq("id", editingDashboard.id);

        if (error) throw error;
        toast.success("Dashboard atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("client_dashboards").insert({
          client_id: clientId,
          name: formData.name,
          dashboard_type: formData.dashboard_type,
          embed_url: formData.embed_url || null,
          is_active: true,
        });

        if (error) throw error;
        toast.success("Dashboard criado com sucesso!");
      }

      setDialogOpen(false);
      setEditingDashboard(null);
      setFormData({
        name: "",
        dashboard_type: "analytics",
        embed_url: "",
      });
      fetchDashboards();
    } catch (error) {
      console.error("Erro ao salvar dashboard:", error);
      toast.error("Erro ao salvar dashboard");
    }
  };

  const handleEdit = (dashboard: Dashboard) => {
    setEditingDashboard(dashboard);
    setFormData({
      name: dashboard.name,
      dashboard_type: dashboard.dashboard_type,
      embed_url: dashboard.embed_url || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (dashboardId: string) => {
    if (!confirm("Tem certeza que deseja deletar este dashboard?")) return;

    try {
      const { error } = await supabase
        .from("client_dashboards")
        .delete()
        .eq("id", dashboardId);

      if (error) throw error;

      toast.success("Dashboard deletado com sucesso!");
      if (selectedDashboard?.id === dashboardId) {
        setSelectedDashboard(null);
      }
      fetchDashboards();
    } catch (error) {
      console.error("Erro ao deletar dashboard:", error);
      toast.error("Erro ao deletar dashboard");
    }
  };

  const handleSelectDashboard = (dashboard: Dashboard) => {
    setIframeLoading(true);
    setSelectedDashboard(dashboard);
    setIframeKey(prev => prev + 1);
  };

  const handleRefreshIframe = () => {
    setIframeLoading(true);
    setIframeKey(prev => prev + 1);
  };

  const handleFullscreen = () => {
    const iframe = document.getElementById("dashboard-iframe");
    if (iframe?.requestFullscreen) {
      iframe.requestFullscreen();
    }
  };

  const getDashboardTypeLabel = (type: string) => {
    return "Reportei";
  };

  const getDashboardInstructions = () => {
    return {
      title: "Como obter a URL de Embed do Reportei",
      steps: [
        "1. Acesse seu dashboard no Reportei",
        "2. Clique no botão 'Compartilhar' no canto superior direito",
        "3. Na aba 'Incorporar', copie a URL que está dentro do código iframe",
        "4. A URL deve ter o formato: app.reportei.com/embed/...",
        "5. Cole apenas a URL completa no campo abaixo",
      ],
      example: "https://app.reportei.com/embed/a1ANxlc8dUorNg9QtXUc1NqS867ctHLP",
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Dashboards</h2>
        <Button onClick={() => {
          setEditingDashboard(null);
          setFormData({ name: "", dashboard_type: "reportei", embed_url: "" });
          setDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Dashboard
        </Button>
      </div>

      {dashboards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground mb-4">Nenhum dashboard configurado</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Configurar Primeiro Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[500px]">
          {/* Sidebar com lista de dashboards */}
          <Card className="w-64 flex-shrink-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Meus Dashboards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              {dashboards.map((dashboard) => (
                <div
                  key={dashboard.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedDashboard?.id === dashboard.id
                      ? "bg-primary/10 border-primary"
                      : "bg-card hover:bg-muted/50 border-border"
                  }`}
                  onClick={() => handleSelectDashboard(dashboard)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {dashboard.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getDashboardTypeLabel(dashboard.dashboard_type)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(dashboard);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(dashboard.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Área principal do iframe */}
          <Card className="flex-1 flex flex-col">
            {selectedDashboard ? (
              <>
                <CardHeader className="pb-3 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {selectedDashboard.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getDashboardTypeLabel(selectedDashboard.dashboard_type)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshIframe}
                        title="Atualizar Dashboard"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleFullscreen}
                        title="Tela Cheia"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                      {selectedDashboard.embed_url && (
                        <Button
                          variant="outline"
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
                </CardHeader>
                <CardContent className="flex-1 p-0 relative">
                  {selectedDashboard.embed_url ? (
                    <>
                      {iframeLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      )}
                      <iframe
                        key={iframeKey}
                        id="dashboard-iframe"
                        src={selectedDashboard.embed_url}
                        className="w-full h-full border-0 rounded-b-lg"
                        title={selectedDashboard.name}
                        onLoad={() => setIframeLoading(false)}
                      />
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">
                        Nenhuma URL de embed configurada para este dashboard
                      </p>
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                  Selecione um dashboard para visualizar
                </p>
              </CardContent>
            )}
          </Card>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDashboard ? "Editar Dashboard" : "Novo Dashboard"}
            </DialogTitle>
            <DialogDescription>
              Configure um dashboard para visualização do cliente
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="name">Nome do Dashboard *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Dashboard de Vendas Mensal"
                required
              />
            </div>

            <div>
              <Label htmlFor="embed_url">URL de Embed do Reportei *</Label>
              <Input
                id="embed_url"
                value={formData.embed_url}
                onChange={(e) =>
                  setFormData({ ...formData, embed_url: e.target.value })
                }
                placeholder="https://app.reportei.com/embed/..."
                required
              />
            </div>

            <Card className="bg-muted/50 border-primary/20">
              <CardContent className="pt-4 pb-4">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <span className="text-primary">ℹ️</span>
                  {getDashboardInstructions().title}
                </h4>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {getDashboardInstructions().steps.map((step, idx) => (
                    <p key={idx}>{step}</p>
                  ))}
                </div>
                {getDashboardInstructions().example && (
                  <div className="mt-3 p-2 bg-background/60 rounded border text-xs font-mono break-all">
                    {getDashboardInstructions().example}
                  </div>
                )}
              </CardContent>
            </Card>

            <Button type="submit" className="w-full">
              {editingDashboard ? "Salvar Alterações" : "Criar Dashboard"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
