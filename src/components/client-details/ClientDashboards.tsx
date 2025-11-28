import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink, Maximize2, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ReporteiDashboard } from "./ReporteiDashboard";
import { ReporteiDashboardConfig } from "./ReporteiDashboardConfig";
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
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    dashboard_type: "analytics",
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
  };

  const handleFullscreen = () => {
    const iframe = document.getElementById("dashboard-iframe");
    if (iframe?.requestFullscreen) {
      iframe.requestFullscreen();
    }
  };

  const getDashboardTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      pipedrive: "Pipedrive",
      reportei: "Reportei",
      analytics: "Analytics",
      social_media: "Redes Sociais",
      financial: "Financeiro",
      performance: "Performance",
      custom: "Personalizado",
    };
    return labels[type] || type;
  };

  const getDashboardInstructions = (type: string) => {
    const instructions: Record<string, { title: string; steps: string[]; example?: string }> = {
      reportei: {
        title: "Como obter o embed do Reportei",
        steps: [
          "1. Acesse seu dashboard no Reportei",
          "2. Clique no botão 'Compartilhar' no canto superior direito",
          "3. Na aba 'Incorporar', copie a URL que está dentro do código iframe",
          "4. A URL deve ter o formato: app.reportei.com/embed/...",
          "5. Cole apenas a URL completa no campo abaixo",
        ],
        example: "https://app.reportei.com/embed/a1ANxlc8dUorNg9QtXUc1NqS867ctHLP",
      },
      pipedrive: {
        title: "Como obter o embed do Pipedrive",
        steps: [
          "1. No Pipedrive, acesse Insights > Relatórios",
          "2. Selecione o relatório que deseja compartilhar",
          "3. Clique em 'Compartilhar' ou 'Share'",
          "4. Ative 'Compartilhar publicamente' ou 'Share publicly'",
          "5. Copie o link público gerado",
          "6. Cole o link no campo 'URL de Embed' abaixo",
        ],
        example: "https://app.pipedrive.com/insights/share/...",
      },
    };
    return instructions[type];
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
          setFormData({ name: "", dashboard_type: "analytics", embed_url: "" });
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
                  {isConfiguring && selectedDashboard.dashboard_type === 'reportei_api' ? (
                    <div className="p-6 h-full overflow-auto">
                      <ReporteiDashboardConfig
                        dashboardId={selectedDashboard.id}
                        clientId={clientId}
                        currentConfig={selectedDashboard.config}
                        onSave={() => {
                          setIsConfiguring(false);
                          fetchDashboards();
                        }}
                        onCancel={() => setIsConfiguring(false)}
                      />
                    </div>
                  ) : selectedDashboard.dashboard_type === 'reportei_api' ? (
                    <div className="p-6 h-full overflow-auto">
                      <ReporteiDashboard
                        dashboardId={selectedDashboard.id}
                        config={selectedDashboard.config}
                        onConfigure={() => setIsConfiguring(true)}
                      />
                    </div>
                  ) : selectedDashboard.embed_url ? (
                    <>
                      {iframeLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      )}
                      <iframe
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
              <Label htmlFor="dashboard_type">Plataforma *</Label>
              <Select
                value={formData.dashboard_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, dashboard_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a plataforma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reportei">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Reportei (Embed)</span>
                      <Badge variant="secondary" className="text-xs">Iframe</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="reportei_api">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Reportei API</span>
                      <Badge variant="default" className="text-xs">Recomendado</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="pipedrive">Pipedrive</SelectItem>
                  <SelectItem value="analytics">Google Analytics</SelectItem>
                  <SelectItem value="social_media">Redes Sociais</SelectItem>
                  <SelectItem value="financial">Financeiro</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.dashboard_type === 'reportei_api' && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm text-muted-foreground">
                    ℹ️ A configuração será feita na próxima etapa após criar o dashboard.
                  </p>
                </CardContent>
              </Card>
            )}

            {getDashboardInstructions(formData.dashboard_type) && (
              <Card className="bg-muted/50 border-primary/20">
                <CardContent className="pt-4 pb-4">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <span className="text-primary">ℹ️</span>
                    {getDashboardInstructions(formData.dashboard_type)?.title}
                  </h4>
                  <ol className="text-xs text-muted-foreground space-y-1.5 ml-6 mb-3">
                    {getDashboardInstructions(formData.dashboard_type)?.steps.map((step, index) => (
                      <li key={index} className="leading-relaxed">{step}</li>
                    ))}
                  </ol>
                  {getDashboardInstructions(formData.dashboard_type)?.example && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Exemplo de URL:</p>
                      <code className="text-xs bg-background px-2 py-1 rounded border border-border block break-all">
                        {getDashboardInstructions(formData.dashboard_type)?.example}
                      </code>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {formData.dashboard_type !== 'reportei_api' && (
              <div>
                <Label htmlFor="embed_url">URL de Embed *</Label>
                <Input
                  id="embed_url"
                  type="url"
                  value={formData.embed_url}
                  onChange={(e) =>
                    setFormData({ ...formData, embed_url: e.target.value })
                  }
                  placeholder={
                    formData.dashboard_type === "reportei"
                      ? "https://app.reportei.com/embed/..."
                      : formData.dashboard_type === "pipedrive"
                      ? "https://app.pipedrive.com/insights/share/..."
                      : "https://..."
                  }
                  required={formData.dashboard_type !== 'custom'}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {formData.dashboard_type === "reportei" && (
                    <span className="flex items-center gap-1">
                      <span className="text-primary">💡</span>
                      Cole a URL do embed (deve começar com app.reportei.com/embed/)
                    </span>
                  )}
                  {formData.dashboard_type === "pipedrive" && (
                    <span className="flex items-center gap-1">
                      <span className="text-primary">💡</span>
                      Cole o link de compartilhamento público do Pipedrive
                    </span>
                  )}
                  {!["reportei", "pipedrive"].includes(formData.dashboard_type) && (
                    "Cole a URL pública ou de embed da ferramenta"
                  )}
                </p>
              </div>
            )}

            <Button type="submit" className="w-full">
              {editingDashboard ? "Salvar Alterações" : "Criar Dashboard"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
