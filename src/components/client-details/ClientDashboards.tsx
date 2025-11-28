import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink } from "lucide-react";
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
}

interface ClientDashboardsProps {
  clientId: string;
}

export function ClientDashboards({ clientId }: ClientDashboardsProps) {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    dashboard_type: "analytics",
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
      const { error } = await supabase.from("client_dashboards").insert({
        client_id: clientId,
        name: formData.name,
        dashboard_type: formData.dashboard_type,
        embed_url: formData.embed_url || null,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Dashboard criado com sucesso!");
      setDialogOpen(false);
      setFormData({
        name: "",
        dashboard_type: "analytics",
        embed_url: "",
      });
      fetchDashboards();
    } catch (error) {
      console.error("Erro ao criar dashboard:", error);
      toast.error("Erro ao criar dashboard");
    }
  };

  const getDashboardTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      analytics: "Analytics",
      social_media: "Redes Sociais",
      financial: "Financeiro",
      performance: "Performance",
      custom: "Personalizado",
    };
    return labels[type] || type;
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
        <h2 className="text-2xl font-bold">Dashboards</h2>
        <Button onClick={() => setDialogOpen(true)}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dashboards.map((dashboard) => (
            <Card key={dashboard.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{dashboard.name}</CardTitle>
                  <Badge
                    className={
                      dashboard.is_active
                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                        : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                    }
                  >
                    {dashboard.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Tipo: {getDashboardTypeLabel(dashboard.dashboard_type)}
                </p>
                {dashboard.embed_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    asChild
                  >
                    <a
                      href={dashboard.embed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Abrir Dashboard
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Dashboard</DialogTitle>
            <DialogDescription>
              Configure um dashboard para visualização do cliente
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Dashboard *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="dashboard_type">Tipo</Label>
              <Select
                value={formData.dashboard_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, dashboard_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="analytics">Analytics</SelectItem>
                  <SelectItem value="social_media">Redes Sociais</SelectItem>
                  <SelectItem value="financial">Financeiro</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="embed_url">URL de Embed (opcional)</Label>
              <Input
                id="embed_url"
                type="url"
                value={formData.embed_url}
                onChange={(e) =>
                  setFormData({ ...formData, embed_url: e.target.value })
                }
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL para embed de ferramentas como Google Data Studio, Metabase, etc.
              </p>
            </div>
            <Button type="submit" className="w-full">
              Criar Dashboard
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
