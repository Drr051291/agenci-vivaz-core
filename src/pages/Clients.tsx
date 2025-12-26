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
import { Plus, Building2, Globe, Pencil, User, Phone, Mail, ShoppingCart, Store, Megaphone, MapPin, Users, X, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  sales_channels: string[] | null;
}

const SALES_CHANNELS = [
  { id: "ecommerce", label: "E-commerce", description: "Loja Virtual Própria", icon: ShoppingCart },
  { id: "marketplace", label: "Marketplace", description: "ML, Amazon, Shopee", icon: Store },
  { id: "social_commerce", label: "Social Commerce", description: "Instagram, WhatsApp", icon: Megaphone },
  { id: "local_business", label: "Negócio Local", description: "Loja Física", icon: MapPin },
  { id: "inside_sales", label: "Inside Sales", description: "Geração de Leads", icon: Users },
];

const COMPANY_SEGMENTS = [
  { id: "moda_feminina", label: "Moda Feminina" },
  { id: "moda_masculina", label: "Moda Masculina" },
  { id: "moda_infantil", label: "Moda Infantil" },
  { id: "semijoias", label: "Semijoias e Acessórios" },
  { id: "casa_decoracao", label: "Casa e Decoração" },
  { id: "quadros_arte", label: "Quadros e Arte" },
  { id: "cosmeticos", label: "Cosméticos e Beleza" },
  { id: "saude_fitness", label: "Saúde e Fitness" },
  { id: "alimentos", label: "Alimentos e Bebidas" },
  { id: "pet", label: "Pet Shop" },
  { id: "eletronicos", label: "Eletrônicos" },
  { id: "moveis", label: "Móveis" },
  { id: "brinquedos", label: "Brinquedos" },
  { id: "papelaria", label: "Papelaria e Escritório" },
  { id: "saas", label: "SaaS / Software" },
  { id: "agencia_consultoria", label: "Agência / Consultoria" },
  { id: "servicos_b2b", label: "Serviços B2B" },
  { id: "servicos_b2c", label: "Serviços B2C" },
  { id: "educacao", label: "Educação" },
  { id: "imobiliario", label: "Imobiliário" },
  { id: "automotivo", label: "Automotivo" },
  { id: "industria", label: "Indústria" },
  { id: "outro", label: "Outro" },
];

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
    status: "active",
    segment: "outro",
    contract_start: "",
    monthly_fee: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    sales_channels: [] as string[],
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
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
      segment: formData.segment,
      contract_start: formData.contract_start || null,
      monthly_fee: formData.monthly_fee ? parseFloat(formData.monthly_fee) : null,
      contact_name: formData.contact_name || null,
      contact_phone: formData.contact_phone || null,
      contact_email: formData.contact_email || null,
      sales_channels: formData.sales_channels.length > 0 ? formData.sales_channels : null,
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
      sales_channels: client.sales_channels || [],
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
      status: "active",
      segment: "outro",
      contract_start: "",
      monthly_fee: "",
      contact_name: "",
      contact_phone: "",
      contact_email: "",
      sales_channels: [],
    });
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientToDelete.id);

    if (error) {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Cliente excluído!",
        description: "O cliente foi removido com sucesso.",
      });
      fetchClients();
    }
    setDeleteDialogOpen(false);
    setClientToDelete(null);
  };

  const confirmDeleteClient = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const toggleChannel = (channelId: string) => {
    setFormData(prev => ({
      ...prev,
      sales_channels: prev.sales_channels.includes(channelId)
        ? prev.sales_channels.filter(c => c !== channelId)
        : [...prev.sales_channels, channelId]
    }));
  };

  const getChannelLabel = (channelId: string) => {
    return SALES_CHANNELS.find(c => c.id === channelId)?.label || channelId;
  };

  const getChannelIcon = (channelId: string) => {
    const channel = SALES_CHANNELS.find(c => c.id === channelId);
    return channel?.icon || ShoppingCart;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-primary/20 text-primary",
      inactive: "bg-muted text-muted-foreground",
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      active: "Ativo",
      inactive: "Inativo",
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getSegmentLabel = (segment: string) => {
    const found = COMPANY_SEGMENTS.find(s => s.id === segment);
    return found?.label || segment;
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
                              <SelectItem value="active">Ativo</SelectItem>
                              <SelectItem value="inactive">Inativo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="segment">Segmento da Empresa *</Label>
                          <Select
                            value={formData.segment}
                            onValueChange={(value) =>
                              setFormData({ ...formData, segment: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o segmento" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {COMPANY_SEGMENTS.map((segment) => (
                                <SelectItem key={segment.id} value={segment.id}>
                                  {segment.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* Canais de Venda */}
                      <div className="space-y-3">
                        <Label>Canais de Venda / Serviços Contratados</Label>
                        <p className="text-xs text-muted-foreground">
                          Selecione todos os canais onde o cliente vende ou serviços contratados
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {SALES_CHANNELS.map((channel) => {
                            const Icon = channel.icon;
                            const isSelected = formData.sales_channels.includes(channel.id);
                            return (
                              <button
                                type="button"
                                key={channel.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all text-left ${
                                  isSelected 
                                    ? "border-primary bg-primary/5" 
                                    : "border-border hover:border-primary/50"
                                }`}
                                onClick={() => toggleChannel(channel.id)}
                              >
                                <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                                  isSelected 
                                    ? "bg-primary border-primary" 
                                    : "border-muted-foreground"
                                }`}>
                                  {isSelected && (
                                    <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <Icon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{channel.label}</p>
                                  <p className="text-xs text-muted-foreground">{channel.description}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        {formData.sales_channels.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {formData.sales_channels.map(channelId => (
                              <Badge 
                                key={channelId} 
                                variant="secondary"
                                className="flex items-center gap-1 pr-1"
                              >
                                {getChannelLabel(channelId)}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleChannel(channelId);
                                  }}
                                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
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
                          <Badge variant="secondary">
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
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => confirmDeleteClient(client, e)}
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
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
                        {client.monthly_fee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
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
                    {client.sales_channels && client.sales_channels.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {client.sales_channels.slice(0, 3).map(channelId => {
                          const Icon = getChannelIcon(channelId);
                          return (
                            <Badge 
                              key={channelId} 
                              variant="outline"
                              className="text-xs flex items-center gap-1"
                            >
                              <Icon className="h-3 w-3" />
                              {getChannelLabel(channelId)}
                            </Badge>
                          );
                        })}
                        {client.sales_channels.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{client.sales_channels.length - 3}
                          </Badge>
                        )}
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

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{clientToDelete?.company_name}"? 
              Esta ação não pode ser desfeita e todos os dados relacionados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteClient}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Clients;
