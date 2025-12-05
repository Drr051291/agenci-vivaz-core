import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Plus, Building2, Globe, Pencil, User, Phone, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePageMeta } from "@/hooks/usePageMeta";
import { motion } from "framer-motion";
import { StaggerContainer, StaggerItem } from "@/components/ui/animated";

interface Client {
  id: string;
  company_name: string;
  cnpj: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  status: string;
  segment: string;
  contract_start: string | null;
  monthly_fee: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
}

const Clients = () => {
  const navigate = useNavigate();
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
    segment: "local_business",
    contract_start: "",
    monthly_fee: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
  });
  const { toast } = useToast();

  usePageMeta({
    title: "Clientes",
    description: "Gerencie seus clientes, visualize informações de contato e acompanhe o status de cada cliente",
    keywords: "clientes, gestão de clientes, CRM, contatos, vivaz",
  });

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

    // Prepare data with proper types
    const submitData = {
      company_name: formData.company_name,
      cnpj: formData.cnpj || null,
      address: formData.address || null,
      website: formData.website || null,
      notes: formData.notes || null,
      status: formData.status,
      segment: formData.segment as "inside_sales" | "ecommerce" | "marketplace" | "local_business",
      contract_start: formData.contract_start || null,
      monthly_fee: formData.monthly_fee ? parseFloat(formData.monthly_fee) : null,
      contact_name: formData.contact_name || null,
      contact_phone: formData.contact_phone || null,
      contact_email: formData.contact_email || null,
    };

    if (editingClient) {
      // Atualizar cliente existente
      const { error } = await supabase
        .from("clients")
        .update(submitData)
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
      // Criar novo cliente (sem user_id - será vinculado depois via página de Usuários)
      const { data: newClient, error } = await supabase
        .from("clients")
        .insert([submitData])
        .select()
        .single();

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
        
        // Tentar vincular automaticamente com Asaas se houver CNPJ ou email
        if (newClient && (formData.cnpj || formData.contact_email)) {
          await tryLinkAsaasCustomer(newClient.id, formData.cnpj, formData.contact_email);
        }
        
        handleCloseDialog();
        fetchClients();
      }
    }
  };

  const tryLinkAsaasCustomer = async (clientId: string, cnpj: string | null, email: string | null) => {
    try {
      // Buscar clientes no Asaas
      const response = await supabase.functions.invoke('asaas-api', {
        body: { action: 'customers' }
      });

      if (response.error || !response.data?.data) return;

      const asaasCustomers = response.data.data;
      
      // Tentar encontrar cliente por CPF/CNPJ ou email
      const cleanCnpj = cnpj?.replace(/\D/g, '') || '';
      const matchedCustomer = asaasCustomers.find((c: any) => {
        const customerCpfCnpj = c.cpfCnpj?.replace(/\D/g, '') || '';
        return (cleanCnpj && customerCpfCnpj === cleanCnpj) || 
               (email && c.email?.toLowerCase() === email.toLowerCase());
      });

      if (matchedCustomer) {
        // Criar vínculo automaticamente
        const { error: linkError } = await supabase
          .from('asaas_customer_links')
          .insert({
            client_id: clientId,
            asaas_customer_id: matchedCustomer.id,
            asaas_customer_name: matchedCustomer.name,
            asaas_customer_email: matchedCustomer.email,
            asaas_customer_cpf_cnpj: matchedCustomer.cpfCnpj
          });

        if (!linkError) {
          toast({
            title: "Cliente Asaas vinculado!",
            description: `Cliente financeiro "${matchedCustomer.name}" vinculado automaticamente.`,
          });
        }
      }
    } catch (err) {
      // Silently fail - não bloquear criação do cliente
      console.error('Erro ao tentar vincular Asaas:', err);
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
      segment: client.segment,
      contract_start: client.contract_start || "",
      monthly_fee: client.monthly_fee?.toString() || "",
      contact_name: client.contact_name || "",
      contact_phone: client.contact_phone || "",
      contact_email: client.contact_email || "",
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
      segment: "local_business",
      contract_start: "",
      monthly_fee: "",
      contact_name: "",
      contact_phone: "",
      contact_email: "",
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

  const getSegmentColor = (segment: string) => {
    const colors = {
      inside_sales: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      ecommerce: "bg-green-500/10 text-green-500 border-green-500/20",
      marketplace: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      local_business: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    };
    return colors[segment as keyof typeof colors] || colors.local_business;
  };

  const getSegmentLabel = (segment: string) => {
    const labels = {
      inside_sales: "Inside Sales",
      ecommerce: "E-commerce",
      marketplace: "Marketplace",
      local_business: "Negócio Local",
    };
    return labels[segment as keyof typeof labels] || segment;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground">Gerencie seus clientes</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => open ? setDialogOpen(true) : handleCloseDialog()}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
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
                <div className="space-y-6 py-4">
                  {/* Informações da Empresa */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground">Informações da Empresa</h3>
                    <div className="grid gap-4">
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
                      <div className="grid grid-cols-2 gap-4">
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
                      <div className="grid grid-cols-2 gap-4">
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
                          <Label htmlFor="segment">Segmento *</Label>
                          <Select
                            value={formData.segment}
                            onValueChange={(value) =>
                              setFormData({ ...formData, segment: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inside_sales">Inside Sales</SelectItem>
                              <SelectItem value="ecommerce">E-commerce</SelectItem>
                              <SelectItem value="marketplace">Marketplace</SelectItem>
                              <SelectItem value="local_business">Negócio Local</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contato Principal */}
                  <div className="space-y-4 pt-4 border-t border-border">
                    <h3 className="text-sm font-semibold text-foreground">Contato Principal</h3>
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contact_name">Nome do Contato</Label>
                        <Input
                          id="contact_name"
                          value={formData.contact_name}
                          onChange={(e) =>
                            setFormData({ ...formData, contact_name: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contact_phone">Telefone</Label>
                          <Input
                            id="contact_phone"
                            value={formData.contact_phone}
                            onChange={(e) =>
                              setFormData({ ...formData, contact_phone: e.target.value })
                            }
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact_email">Email</Label>
                          <Input
                            id="contact_email"
                            type="email"
                            value={formData.contact_email}
                            onChange={(e) =>
                              setFormData({ ...formData, contact_email: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Informações do Contrato */}
                  <div className="space-y-4 pt-4 border-t border-border">
                    <h3 className="text-sm font-semibold text-foreground">Informações do Contrato</h3>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contract_start">Início do Contrato</Label>
                          <Input
                            id="contract_start"
                            type="date"
                            value={formData.contract_start}
                            onChange={(e) =>
                              setFormData({ ...formData, contract_start: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="monthly_fee">Mensalidade (R$)</Label>
                          <Input
                            id="monthly_fee"
                            type="number"
                            step="0.01"
                            value={formData.monthly_fee}
                            onChange={(e) =>
                              setFormData({ ...formData, monthly_fee: e.target.value })
                            }
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notes">Observações</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          rows={3}
                          placeholder="Informações adicionais sobre o cliente..."
                        />
                      </div>
                    </div>
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
          <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map((client, index) => (
              <StaggerItem key={client.id}>
                <Card
                  interactive
                  className="h-full group"
                  onClick={() => navigate(`/clientes/${client.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {client.company_name}
                          </CardTitle>
                          <Badge className={getSegmentColor(client.segment)}>
                            {getSegmentLabel(client.segment)}
                          </Badge>
                        </div>
                        {client.cnpj && (
                          <CardDescription className="text-xs mt-1">
                            CNPJ: {client.cnpj}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClient(client);
                            }}
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </motion.div>
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
                    {client.contact_name && (
                      <motion.div 
                        className="flex items-center text-sm text-muted-foreground"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <User className="h-4 w-4 mr-2 text-primary/60" />
                        <span>{client.contact_name}</span>
                      </motion.div>
                    )}
                    {client.contact_phone && (
                      <motion.div 
                        className="flex items-center text-sm text-muted-foreground"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 + 0.1 }}
                      >
                        <Phone className="h-4 w-4 mr-2 text-primary/60" />
                        <span>{client.contact_phone}</span>
                      </motion.div>
                    )}
                    {client.contact_email && (
                      <motion.div 
                        className="flex items-center text-sm text-muted-foreground"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 + 0.2 }}
                      >
                        <Mail className="h-4 w-4 mr-2 text-primary/60" />
                        <span>{client.contact_email}</span>
                      </motion.div>
                    )}
                    {client.monthly_fee && (
                      <motion.div 
                        className="text-sm font-semibold text-primary"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 + 0.3 }}
                      >
                        R$ {client.monthly_fee.toFixed(2)}/mês
                      </motion.div>
                    )}
                    {client.website && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Globe className="h-4 w-4 mr-2 text-primary/60" />
                        <a
                          href={client.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary truncate transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {client.website}
                        </a>
                      </div>
                    )}
                    {client.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {client.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Clients;
