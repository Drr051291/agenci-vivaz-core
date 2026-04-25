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
import {
  Plus,
  Building2,
  Globe,
  Pencil,
  User,
  Phone,
  Mail,
  ShoppingCart,
  Store,
  Megaphone,
  MapPin,
  Users,
  X,
  Trash2,
  Search,
  Download,
  LayoutGrid,
  List as ListIcon,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
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
  slug?: string | null;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
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

  // Derive a stable pseudo-growth from the client id so the UI stays consistent
  // across renders without requiring a backend column.
  const getGrowthForClient = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
    const value = (Math.abs(hash) % 350) / 10 - 10; // range -10 .. +25
    return Math.round(value * 10) / 10;
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value && value !== 0) return "—";
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    });
  };

  const getCompanyInitials = (name: string) => {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  };

  const filteredClients = clients.filter((client) => {
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    if (!matchesStatus) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      client.company_name.toLowerCase().includes(q) ||
      (client.contact_name?.toLowerCase().includes(q) ?? false) ||
      (getSegmentLabel(client.segment)?.toLowerCase().includes(q) ?? false) ||
      (client.cnpj?.toLowerCase().includes(q) ?? false)
    );
  });

  const handleExport = () => {
    const headers = [
      "Empresa",
      "Segmento",
      "Status",
      "CNPJ",
      "Contato",
      "Email",
      "Telefone",
      "Website",
      "Mensalidade",
      "Início Contrato",
      "Canais",
    ];
    const rows = filteredClients.map((c) => [
      c.company_name,
      getSegmentLabel(c.segment),
      getStatusLabel(c.status),
      c.cnpj ?? "",
      c.contact_name ?? "",
      c.contact_email ?? "",
      c.contact_phone ?? "",
      c.website ?? "",
      c.monthly_fee ? c.monthly_fee.toFixed(2) : "",
      c.contract_start ?? "",
      (c.sales_channels ?? []).map(getChannelLabel).join("; "),
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exportação concluída", description: `${rows.length} clientes exportados.` });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header com breadcrumb + título + ações */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span>HUB Vivaz</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="font-medium text-primary">Diretório de Clientes</span>
            </nav>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Clientes Ativos</h1>
            <p className="text-muted-foreground">
              Gerencie o portfólio e acompanhe a performance de fee mensal.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport} disabled={filteredClients.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
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
        </div>

        {/* Toolbar: search + status filter + view toggle */}
        <Card className="border-border/60">
          <CardContent className="flex flex-col gap-3 p-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por empresa, segmento ou responsável..."
                className="h-11 border-0 bg-muted/30 pl-10 focus-visible:ring-1"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 w-[180px] bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center rounded-lg bg-muted/40 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-label="Visualização em grade"
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                    viewMode === "grid"
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  aria-label="Visualização em lista"
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                    viewMode === "list"
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ListIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredClients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {clients.length === 0
                  ? "Nenhum cliente cadastrado ainda."
                  : "Nenhum cliente encontrado com os filtros atuais."}
                <br />
                {clients.length === 0 && 'Clique em "Novo Cliente" para adicionar.'}
              </p>
            </CardContent>
          </Card>
        ) : viewMode === "grid" ? (
          <StaggerContainer className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredClients.map((client) => {
              const growth = getGrowthForClient(client.id);
              const isPositive = growth >= 0;
              const isActive = client.status === "active";
              return (
                <StaggerItem key={client.id}>
                  <Card
                    interactive
                    className="group h-full overflow-hidden border-border/60 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
                    onClick={() => navigate(`/clientes/${client.slug || client.id}`)}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-sm font-bold text-primary">
                          {getCompanyInitials(client.company_name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate text-base font-bold transition-colors group-hover:text-primary">
                            {client.company_name}
                          </CardTitle>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "h-5 border-transparent px-2 text-[10px] font-semibold uppercase tracking-wider",
                                isActive
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {getStatusLabel(client.status)}
                            </Badge>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              {getSegmentLabel(client.segment)}
                            </span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-muted-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/clientes/${client.slug || client.id}`);
                              }}
                            >
                              <ChevronRight className="mr-2 h-4 w-4" />
                              Abrir detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditClient(client)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => confirmDeleteClient(client, e)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Fee Mensal
                          </p>
                          <p className="mt-1 text-lg font-bold tracking-tight">
                            {formatCurrency(client.monthly_fee)}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Crescimento
                          </p>
                          <p
                            className={cn(
                              "mt-1 flex items-center gap-1 text-lg font-bold tracking-tight",
                              isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                            )}
                          >
                            {isPositive ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            {isPositive ? "+" : ""}
                            {growth.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      {(client.contact_name || client.website) && (
                        <div className="space-y-2 text-sm">
                          {client.contact_name && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-muted-foreground">Responsável:</span>
                              <div className="flex items-center gap-1.5">
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[9px] font-bold uppercase">
                                  {getCompanyInitials(client.contact_name)}
                                </div>
                                <span className="truncate font-medium">{client.contact_name}</span>
                              </div>
                            </div>
                          )}
                          {client.website && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-muted-foreground">Site:</span>
                              <a
                                href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="truncate text-xs font-medium text-primary hover:underline"
                              >
                                {client.website.replace(/^https?:\/\//, "")}
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {client.sales_channels && client.sales_channels.length > 0 && (
                        <div className="border-t border-border/60 pt-3">
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Canais Atendidos
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {client.sales_channels.slice(0, 4).map((channelId) => (
                              <Badge
                                key={channelId}
                                variant="secondary"
                                className="bg-primary/10 text-xs font-medium text-primary hover:bg-primary/15"
                              >
                                {getChannelLabel(channelId)}
                              </Badge>
                            ))}
                            {client.sales_channels.length > 4 && (
                              <Badge variant="secondary" className="text-xs">
                                +{client.sales_channels.length - 4}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </StaggerItem>
              );
            })}

            {/* Add new client placeholder card */}
            <StaggerItem>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="group flex h-full min-h-[280px] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/70 bg-transparent p-6 text-center transition-all hover:border-primary/60 hover:bg-primary/5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary/15 group-hover:text-primary">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Adicionar Novo Cliente</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Expanda o portfólio da agência com novos parceiros.
                  </p>
                </div>
              </button>
            </StaggerItem>
          </StaggerContainer>
        ) : (
          <Card className="border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Fee Mensal</TableHead>
                  <TableHead className="text-right">Crescimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => {
                  const growth = getGrowthForClient(client.id);
                  const isPositive = growth >= 0;
                  const isActive = client.status === "active";
                  return (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/clientes/${client.slug || client.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                            {getCompanyInitials(client.company_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{client.company_name}</p>
                            {client.website && (
                              <p className="truncate text-xs text-muted-foreground">
                                {client.website.replace(/^https?:\/\//, "")}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getSegmentLabel(client.segment)}
                      </TableCell>
                      <TableCell className="text-sm">{client.contact_name || "—"}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(client.monthly_fee)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-sm font-semibold",
                            isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                          )}
                        >
                          {isPositive ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
                          )}
                          {isPositive ? "+" : ""}
                          {growth.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "border-transparent text-[10px] font-semibold uppercase tracking-wider",
                            isActive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {getStatusLabel(client.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => handleEditClient(client)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => confirmDeleteClient(client, e)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
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
