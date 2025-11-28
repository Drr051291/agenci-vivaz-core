import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building2, Globe, Pencil } from "lucide-react";

interface Client {
  id: string;
  company_name: string;
  cnpj: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  status: string;
}

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    company_name: "",
    cnpj: "",
    address: "",
    website: "",
    notes: "",
    status: "prospecting",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para gerenciar clientes.",
        variant: "destructive",
      });
      return;
    }

    if (editingClient) {
      // Atualizar cliente existente
      const { error } = await supabase
        .from("clients")
        .update(formData)
        .eq("id", editingClient.id);

      if (error) {
        toast({
          title: "Erro ao atualizar cliente",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Cliente atualizado!",
          description: "Dados do cliente atualizados com sucesso.",
        });
        handleCloseDialog();
        fetchClients();
      }
    } else {
      // Criar novo cliente
      const { error } = await supabase.from("clients").insert([{
        ...formData,
        user_id: user.id
      }]);

      if (error) {
        toast({
          title: "Erro ao adicionar cliente",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Cliente adicionado!",
          description: "Cliente cadastrado com sucesso.",
        });
        handleCloseDialog();
        fetchClients();
      }
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setFormData({
      company_name: client.company_name,
      cnpj: client.cnpj || "",
      address: client.address || "",
      website: client.website || "",
      notes: client.notes || "",
      status: client.status,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingClient(null);
    setFormData({
      company_name: "",
      cnpj: "",
      address: "",
      website: "",
      notes: "",
      status: "prospecting",
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-primary/20 text-primary",
      inactive: "bg-muted text-muted-foreground",
      prospecting: "bg-secondary/20 text-secondary",
    };
    return colors[status as keyof typeof colors] || colors.prospecting;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      active: "Ativo",
      inactive: "Inativo",
      prospecting: "Prospecção",
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground">Gerencie seus clientes</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>
                    {editingClient ? "Editar Cliente" : "Adicionar Cliente"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingClient 
                      ? "Atualize as informações do cliente" 
                      : "Preencha as informações do novo cliente"}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Nome da Empresa *</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) =>
                        setFormData({ ...formData, company_name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) =>
                        setFormData({ ...formData, website: e.target.value })
                      }
                      placeholder="https://exemplo.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prospecting">Prospecção</SelectItem>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">
                    {editingClient ? "Salvar Alterações" : "Adicionar Cliente"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : clients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhum cliente cadastrado ainda.
                <br />
                Clique em "Novo Cliente" para adicionar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <Card
                key={client.id}
                className="border-border/50 hover:border-primary/50 transition-colors"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{client.company_name}</CardTitle>
                      {client.cnpj && (
                        <CardDescription className="text-xs mt-1">
                          CNPJ: {client.cnpj}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClient(client)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                          client.status
                        )}`}
                      >
                        {getStatusLabel(client.status)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {client.website && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Globe className="h-4 w-4 mr-2" />
                      <a
                        href={client.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary truncate"
                      >
                        {client.website}
                      </a>
                    </div>
                  )}
                  {client.address && (
                    <p className="text-sm text-muted-foreground truncate">
                      {client.address}
                    </p>
                  )}
                  {client.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {client.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Clients;
