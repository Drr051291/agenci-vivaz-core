import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Settings, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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

export default function Integrations() {
  const { id: clientId } = useParams();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clientName, setClientName] = useState<string>("");
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
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuração Reportei
              </CardTitle>
              <CardDescription>
                Os dashboards do Reportei são configurados na aba "Dashboards" do cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                O Reportei funciona através de embeds de iframe. Acesse a página do cliente e
                navegue até a aba "Dashboards" para adicionar URLs de embed do Reportei.
              </p>
              <Button variant="outline" onClick={() => setSelectedPlatform(null)}>
                Voltar
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
