import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Settings, ExternalLink, Plus, Pencil, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CRM_PLATFORMS = [
  {
    id: "pipedrive",
    name: "Pipedrive",
    description: "CRM de vendas completo",
    supported: true,
    type: "api_key",
    color: "bg-[#22C55E]",
  },
  {
    id: "reportei",
    name: "Reportei",
    description: "Plataforma de relatórios e dashboards",
    supported: true,
    type: "embed",
    color: "bg-[#3B82F6]",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Plataforma de CRM e marketing",
    supported: false,
    color: "bg-[#FF7A59]",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "CRM empresarial",
    supported: false,
    color: "bg-[#00A1E0]",
  },
  {
    id: "rdstation",
    name: "RD Station",
    description: "Automação de marketing",
    supported: false,
    color: "bg-[#E74C3C]",
  },
  {
    id: "zoho",
    name: "Zoho CRM",
    description: "Suite completa de CRM",
    supported: false,
    color: "bg-[#F39C12]",
  },
];

interface Dashboard {
  id: string;
  name: string;
  dashboard_type: string;
  embed_url?: string;
  is_active: boolean;
}

export default function Integrations() {
  const { id: clientId } = useParams();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientName, setClientName] = useState<string>("");
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    embed_url: "",
    dashboard_type: "reportei",
  });
  const [pipedriveConfig, setPipedriveConfig] = useState({
    apiKey: "",
    domain: "api.pipedrive.com",
    isActive: false,
    integrationId: null as string | null,
  });

  useEffect(() => {
    if (clientId) {
      checkExistingIntegrations();
      fetchClientName();
      fetchDashboards();
    }
  }, [clientId]);

  const fetchClientName = async () => {
    if (!clientId) return;
    try {
      const { data } = await supabase
        .from("clients")
        .select("company_name")
        .eq("id", clientId)
        .single();
      if (data) {
        setClientName(data.company_name);
      }
    } catch (error) {
      console.error("Erro ao buscar nome do cliente:", error);
    }
  };

  const fetchDashboards = async () => {
    if (!clientId) return;
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
    }
  };

  const checkExistingIntegrations = async () => {
    if (!clientId) return;

    try {
      const { data, error } = await supabase
        .from("crm_integrations")
        .select("*")
        .eq("client_id", clientId)
        .eq("crm_type", "pipedrive")
        .eq("is_active", true)
        .single();

      if (data && !error) {
        setPipedriveConfig({
          apiKey: data.api_key_encrypted,
          domain: data.domain || "api.pipedrive.com",
          isActive: true,
          integrationId: data.id,
        });
      }
    } catch (error) {
      console.error("Erro ao verificar integrações:", error);
    }
  };

  const handleSavePipedrive = async () => {
    if (!clientId) {
      toast.error("Cliente não identificado");
      return;
    }

    if (!pipedriveConfig.apiKey) {
      toast.error("Chave API é obrigatória");
      return;
    }

    setLoading(true);
    try {
      if (pipedriveConfig.integrationId) {
        const { error } = await supabase
          .from("crm_integrations")
          .update({
            api_key_encrypted: pipedriveConfig.apiKey,
            domain: pipedriveConfig.domain,
          })
          .eq("id", pipedriveConfig.integrationId);

        if (error) throw error;
        toast.success("Integração Pipedrive atualizada!");
      } else {
        const { data, error } = await supabase
          .from("crm_integrations")
          .insert({
            client_id: clientId,
            crm_type: "pipedrive",
            api_key_encrypted: pipedriveConfig.apiKey,
            domain: pipedriveConfig.domain,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        setPipedriveConfig((prev) => ({
          ...prev,
          isActive: true,
          integrationId: data.id,
        }));
        toast.success("Integração Pipedrive configurada!");
      }
    } catch (error) {
      console.error("Erro ao salvar integração:", error);
      toast.error("Erro ao salvar integração");
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePipedrive = async () => {
    if (!pipedriveConfig.integrationId) return;

    if (!confirm("Tem certeza que deseja remover a integração com o Pipedrive?")) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("crm_integrations")
        .delete()
        .eq("id", pipedriveConfig.integrationId);

      if (error) throw error;

      setPipedriveConfig({
        apiKey: "",
        domain: "api.pipedrive.com",
        isActive: false,
        integrationId: null,
      });
      toast.success("Integração removida com sucesso");
    } catch (error) {
      console.error("Erro ao remover integração:", error);
      toast.error("Erro ao remover integração");
    } finally {
      setLoading(false);
    }
  };

  if (!clientId) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Integrações CRM</h1>
            <p className="text-muted-foreground mt-2">
              Conecte suas ferramentas de CRM e visualize dados integrados
            </p>
          </div>

          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Selecione um cliente para gerenciar suas integrações
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Integrações CRM</h1>
          <p className="text-muted-foreground mt-2">
            {clientName 
              ? `Gerenciando integrações para: ${clientName}`
              : "Conecte e gerencie integrações com plataformas de CRM e marketing"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CRM_PLATFORMS.map((platform) => (
            <Card
              key={platform.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedPlatform === platform.id ? "ring-2 ring-primary" : ""
              } ${!platform.supported ? "opacity-60" : ""}`}
              onClick={() => platform.supported && setSelectedPlatform(platform.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-lg ${platform.color} flex items-center justify-center text-white font-bold text-xl mb-3`}>
                    {platform.name.substring(0, 2).toUpperCase()}
                  </div>
                  {platform.id === "pipedrive" && pipedriveConfig.isActive && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Ativa
                    </Badge>
                  )}
                  {!platform.supported && (
                    <Badge variant="secondary">Em Breve</Badge>
                  )}
                </div>
                <CardTitle>{platform.name}</CardTitle>
                <CardDescription>{platform.description}</CardDescription>
              </CardHeader>
              {platform.supported && (
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlatform(platform.id);
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {selectedPlatform === "pipedrive" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configuração Pipedrive
                  </CardTitle>
                  <CardDescription>
                    Configure a conexão com sua conta Pipedrive
                  </CardDescription>
                </div>
                {pipedriveConfig.isActive && (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Ativa
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="pipedrive-api-key">Chave API do Pipedrive *</Label>
                <Input
                  id="pipedrive-api-key"
                  type="password"
                  placeholder="Insira a chave API do Pipedrive"
                  value={pipedriveConfig.apiKey}
                  onChange={(e) =>
                    setPipedriveConfig({ ...pipedriveConfig, apiKey: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  Encontre sua API key em: Configurações → Pessoal → API
                </p>
              </div>

              <div>
                <Label htmlFor="pipedrive-domain">Domínio (opcional)</Label>
                <Input
                  id="pipedrive-domain"
                  placeholder="api.pipedrive.com"
                  value={pipedriveConfig.domain}
                  onChange={(e) =>
                    setPipedriveConfig({ ...pipedriveConfig, domain: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Deixe o padrão se não tiver um domínio customizado
                </p>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button
                  onClick={handleSavePipedrive}
                  disabled={loading}
                  className="flex-1"
                >
                  {pipedriveConfig.isActive ? "Atualizar Integração" : "Salvar Integração"}
                </Button>
                {pipedriveConfig.isActive && (
                  <Button
                    variant="destructive"
                    onClick={handleRemovePipedrive}
                    disabled={loading}
                  >
                    Remover
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedPlatform === "reportei" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configuração Reportei - Dashboards
                  </CardTitle>
                  <CardDescription>
                    Gerencie os embeds de dashboards do Reportei para este cliente
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingDashboard(null);
                    setFormData({ name: "", embed_url: "", dashboard_type: "reportei" });
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Dashboard
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dashboards.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Nenhum dashboard configurado para este cliente
                  </p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Primeiro Dashboard
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboards.map((dashboard) => {
                    const getPlatformInfo = (type: string) => {
                      if (type === "reportei") {
                        return {
                          name: "Reportei",
                          color: "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20",
                        };
                      } else if (type === "pipedrive") {
                        return {
                          name: "Pipedrive",
                          color: "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20",
                        };
                      }
                      return {
                        name: type,
                        color: "bg-muted",
                      };
                    };

                    const platform = getPlatformInfo(dashboard.dashboard_type);

                    return (
                      <Card key={dashboard.id} className="border-muted">
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Badge className={`${platform.color} border shrink-0`}>
                              {platform.name}
                            </Badge>
                            <h4 className="font-medium truncate">{dashboard.name}</h4>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
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
                              onClick={() => {
                                setEditingDashboard(dashboard);
                                setFormData({
                                  name: dashboard.name,
                                  embed_url: dashboard.embed_url || "",
                                  dashboard_type: dashboard.dashboard_type || "reportei",
                                });
                                setDialogOpen(true);
                              }}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (!confirm("Tem certeza que deseja deletar este dashboard?")) return;
                                try {
                                  const { error } = await supabase
                                    .from("client_dashboards")
                                    .delete()
                                    .eq("id", dashboard.id);

                                  if (error) throw error;
                                  toast.success("Dashboard deletado!");
                                  fetchDashboards();
                                } catch (error) {
                                  console.error("Erro ao deletar:", error);
                                  toast.error("Erro ao deletar dashboard");
                                }
                              }}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDashboard ? "Editar Dashboard" : "Novo Dashboard"}
              </DialogTitle>
              <DialogDescription>
                Configure um dashboard do Reportei ou Pipedrive para visualização
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!clientId) return;

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
                    toast.success("Dashboard atualizado!");
                  } else {
                    const { error } = await supabase.from("client_dashboards").insert({
                      client_id: clientId,
                      name: formData.name,
                      dashboard_type: formData.dashboard_type,
                      embed_url: formData.embed_url || null,
                      is_active: true,
                    });

                    if (error) throw error;
                    toast.success("Dashboard criado!");
                  }

                  setDialogOpen(false);
                  setEditingDashboard(null);
                  setFormData({ name: "", embed_url: "", dashboard_type: "reportei" });
                  fetchDashboards();
                } catch (error) {
                  console.error("Erro ao salvar:", error);
                  toast.error("Erro ao salvar dashboard");
                }
              }}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="dashboard-name">Nome do Dashboard *</Label>
                <Input
                  id="dashboard-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Dashboard de Vendas Mensal"
                  required
                />
              </div>

              <div>
                <Label htmlFor="dashboard-platform">Plataforma *</Label>
                <Select
                  value={formData.dashboard_type}
                  onValueChange={(value) => setFormData({ ...formData, dashboard_type: value })}
                >
                  <SelectTrigger id="dashboard-platform">
                    <SelectValue placeholder="Selecione a plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reportei">Reportei</SelectItem>
                    <SelectItem value="pipedrive">Pipedrive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dashboard-embed-url">
                  URL de Embed {formData.dashboard_type === "reportei" ? "do Reportei" : "do Pipedrive"} *
                </Label>
                <Input
                  id="dashboard-embed-url"
                  value={formData.embed_url}
                  onChange={(e) => setFormData({ ...formData, embed_url: e.target.value })}
                  placeholder={
                    formData.dashboard_type === "reportei"
                      ? "https://app.reportei.com/embed/xxx"
                      : "https://app.pipedrive.com/dashboard/xxx"
                  }
                  required
                />
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  {formData.dashboard_type === "reportei"
                    ? "Use o formato: https://app.reportei.com/embed/[id]"
                    : "Cole a URL do dashboard do Pipedrive"}
                </p>
              </div>

              <Button type="submit" className="w-full">
                {editingDashboard ? "Salvar Alterações" : "Criar Dashboard"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
