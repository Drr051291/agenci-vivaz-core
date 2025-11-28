import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Settings, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Client {
  id: string;
  company_name: string;
}

interface CrmIntegration {
  id: string;
  client_id: string;
  crm_type: string;
  domain: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
  clients?: {
    company_name: string;
  };
}

const CrmIntegrations = () => {
  const [integrations, setIntegrations] = useState<CrmIntegration[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: "",
    crm_type: "pipedrive",
    api_key: "",
    domain: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkPermissions();
    fetchIntegrations();
    fetchClients();
  }, []);

  const checkPermissions = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (userRole?.role === "client") {
      navigate("/area-cliente");
    }
  };

  const fetchIntegrations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("crm_integrations")
      .select(`
        *,
        clients(company_name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar integrações",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setIntegrations(data || []);
    }
    setLoading(false);
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, company_name")
      .order("company_name");

    if (error) {
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setClients(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("crm_integrations").insert({
      client_id: formData.client_id,
      crm_type: formData.crm_type,
      api_key_encrypted: formData.api_key,
      domain: formData.domain || null,
      is_active: true,
    });

    if (error) {
      toast({
        title: "Erro ao criar integração",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Integração criada!",
      description: "A integração CRM foi configurada com sucesso.",
    });

    setDialogOpen(false);
    setFormData({
      client_id: "",
      crm_type: "pipedrive",
      api_key: "",
      domain: "",
    });
    fetchIntegrations();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("crm_integrations").delete().eq("id", id);

    if (error) {
      toast({
        title: "Erro ao deletar integração",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Integração deletada",
      description: "A integração foi removida com sucesso.",
    });
    fetchIntegrations();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Integrações CRM</h1>
            <p className="text-muted-foreground">
              Configure integrações com sistemas CRM para seus clientes
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Integração
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Adicionar Integração CRM</DialogTitle>
                  <DialogDescription>
                    Configure uma nova integração com CRM
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="client_id">Cliente *</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, client_id: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="crm_type">Tipo de CRM *</Label>
                    <Select
                      value={formData.crm_type}
                      onValueChange={(value) =>
                        setFormData({ ...formData, crm_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pipedrive">Pipedrive</SelectItem>
                        <SelectItem value="salesforce">Salesforce</SelectItem>
                        <SelectItem value="hubspot">HubSpot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api_key">Chave API *</Label>
                    <Input
                      id="api_key"
                      type="password"
                      value={formData.api_key}
                      onChange={(e) =>
                        setFormData({ ...formData, api_key: e.target.value })
                      }
                      required
                      placeholder="Cole sua chave API aqui"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="domain">Domínio (opcional)</Label>
                    <Input
                      id="domain"
                      value={formData.domain}
                      onChange={(e) =>
                        setFormData({ ...formData, domain: e.target.value })
                      }
                      placeholder="Ex: company.pipedrive.com"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Criar Integração</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : integrations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhuma integração CRM configurada ainda.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="capitalize">{integration.crm_type}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(integration.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    {integration.clients?.company_name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {integration.domain && (
                    <p className="text-sm text-muted-foreground">
                      Domínio: {integration.domain}
                    </p>
                  )}
                  {integration.last_sync_at && (
                    <p className="text-sm text-muted-foreground">
                      Última sincronização:{" "}
                      {new Date(integration.last_sync_at).toLocaleString("pt-BR")}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        integration.is_active ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                    <span className="text-sm text-muted-foreground">
                      {integration.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CrmIntegrations;
