import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ExternalLink, Maximize2, Pencil, Trash2, RefreshCw } from "lucide-react";
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
  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null);
  const [viewingDashboard, setViewingDashboard] = useState<Dashboard | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    embed_url: "",
  });

  useEffect(() => {
    fetchDashboards();
  }, [clientId]);

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
            embed_url: formData.embed_url || null,
          })
          .eq("id", editingDashboard.id);

        if (error) throw error;
        toast.success("Dashboard atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("client_dashboards").insert({
          client_id: clientId,
          name: formData.name,
          dashboard_type: "reportei",
          embed_url: formData.embed_url || null,
          is_active: true,
        });

        if (error) throw error;
        toast.success("Dashboard criado com sucesso!");
      }

      setDialogOpen(false);
      setEditingDashboard(null);
      setFormData({ name: "", embed_url: "" });
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
      fetchDashboards();
    } catch (error) {
      console.error("Erro ao deletar dashboard:", error);
      toast.error("Erro ao deletar dashboard");
    }
  };

  const handleView = (dashboard: Dashboard) => {
    setViewingDashboard(dashboard);
    setIframeKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (viewingDashboard) {
    return (
      <div className="flex flex-col h-[calc(100vh-200px)] space-y-2">
        <div className="flex items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewingDashboard(null)}
            >
              ← Voltar
            </Button>
            <h3 className="text-lg font-semibold">{viewingDashboard.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIframeKey(prev => prev + 1)}
              title="Atualizar"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {viewingDashboard.embed_url && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                title="Abrir em Nova Aba"
              >
                <a
                  href={viewingDashboard.embed_url}
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
          {viewingDashboard.embed_url ? (
            <iframe
              key={iframeKey}
              src={viewingDashboard.embed_url}
              className="w-full h-full border rounded-lg"
              title={viewingDashboard.name}
            />
          ) : (
            <div className="flex items-center justify-center h-full border rounded-lg bg-muted/20">
              <p className="text-muted-foreground">Nenhuma URL de embed configurada</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Dashboards Reportei</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os dashboards de visualização do cliente
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingDashboard(null);
            setFormData({ name: "", embed_url: "" });
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Dashboard
        </Button>
      </div>

      {dashboards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Nenhum dashboard configurado</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeiro Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {dashboards.map((dashboard) => (
            <Card key={dashboard.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <h4 className="font-medium">{dashboard.name}</h4>
                  {dashboard.embed_url && (
                    <p className="text-sm text-muted-foreground truncate max-w-md">
                      {dashboard.embed_url}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleView(dashboard)}
                    title="Visualizar"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  {dashboard.embed_url && (
                    <Button
                      variant="ghost"
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(dashboard)}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(dashboard.id)}
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDashboard ? "Editar Dashboard" : "Novo Dashboard"}
            </DialogTitle>
            <DialogDescription>
              Configure um dashboard Reportei para visualização
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Dashboard *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Dashboard de Vendas Mensal"
                required
              />
            </div>

            <div>
              <Label htmlFor="embed_url">URL de Embed do Reportei *</Label>
              <Input
                id="embed_url"
                value={formData.embed_url}
                onChange={(e) => setFormData({ ...formData, embed_url: e.target.value })}
                placeholder="https://app.reportei.com/embed/..."
                required
              />
              <p className="text-xs text-muted-foreground mt-2">
                Acesse o dashboard no Reportei, clique em Compartilhar e copie a URL de embed
              </p>
            </div>

            <Button type="submit" className="w-full">
              {editingDashboard ? "Salvar Alterações" : "Criar Dashboard"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
