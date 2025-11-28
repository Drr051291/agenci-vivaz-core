import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, User, Phone, Mail, Calendar, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { ClientOverview } from "@/components/client-details/ClientOverview";
import { ClientTasks } from "@/components/client-details/ClientTasks";
import { ClientMeetings } from "@/components/client-details/ClientMeetings";
import { ClientDashboardsNew } from "@/components/client-details/ClientDashboardsNew";

interface Client {
  id: string;
  company_name: string;
  cnpj?: string;
  address?: string;
  website?: string;
  notes?: string;
  status: string;
  segment: string;
  contract_start?: string;
  monthly_fee?: number;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  created_at: string;
}

export default function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchClient();
    }
  }, [id]);

  const fetchClient = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setClient(data);
    } catch (error) {
      console.error("Erro ao buscar cliente:", error);
      toast.error("Erro ao carregar detalhes do cliente");
      navigate("/clientes");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: "bg-green-500/10 text-green-500 border-green-500/20",
      inactive: "bg-red-500/10 text-red-500 border-red-500/20",
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      active: "Ativo",
      inactive: "Inativo",
      pending: "Pendente",
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header compacto */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/clientes")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{client.company_name}</h1>
                <Badge className={getSegmentColor(client.segment)}>
                  {getSegmentLabel(client.segment)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Detalhes e gestão do cliente</p>
            </div>
          </div>
          <Badge className={getStatusColor(client.status)}>
            {getStatusLabel(client.status)}
          </Badge>
        </div>

        {/* Informações compactadas em uma linha */}
        <Card className="border-muted">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
              {client.cnpj && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">CNPJ</p>
                    <p className="font-medium truncate">{client.cnpj}</p>
                  </div>
                </div>
              )}
              {client.contact_name && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Contato</p>
                    <p className="font-medium truncate">{client.contact_name}</p>
                  </div>
                </div>
              )}
              {client.contact_phone && (
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="font-medium truncate">{client.contact_phone}</p>
                  </div>
                </div>
              )}
              {client.contact_email && (
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium truncate">{client.contact_email}</p>
                  </div>
                </div>
              )}
              {client.contract_start && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Início</p>
                    <p className="font-medium">
                      {new Date(client.contract_start).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              )}
              {client.monthly_fee && (
                <div className="flex items-start gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Mensalidade</p>
                    <p className="font-semibold text-primary">
                      R$ {client.monthly_fee.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs com foco no conteúdo */}
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="tasks">Atividades</TabsTrigger>
            <TabsTrigger value="meetings">Atas</TabsTrigger>
            <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <ClientOverview clientId={client.id} />
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <ClientTasks clientId={client.id} />
          </TabsContent>

          <TabsContent value="meetings" className="mt-4">
            <ClientMeetings clientId={client.id} />
          </TabsContent>

          <TabsContent value="dashboards" className="mt-4">
            <ClientDashboardsNew clientId={client.id} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
