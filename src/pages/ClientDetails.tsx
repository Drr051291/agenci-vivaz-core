import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, User, Phone, Mail, Calendar, DollarSign, Plug } from "lucide-react";
import { toast } from "sonner";
import { ClientOverview } from "@/components/client-details/ClientOverview";
import { ClientTasks } from "@/components/client-details/ClientTasks";
import { ClientMeetings } from "@/components/client-details/ClientMeetings";
import { ClientDashboardsNew } from "@/components/client-details/ClientDashboardsNew";
import { ClientFinancial } from "@/components/client-details/ClientFinancial";
import { usePageMeta } from "@/hooks/usePageMeta";

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

  usePageMeta({
    title: client ? `${client.company_name}` : "Detalhes do Cliente",
    description: `Gerencie atividades, reuniões, dashboards e informações financeiras do cliente ${client?.company_name || ''}`,
    keywords: "cliente, detalhes, atividades, reuniões, financeiro, vivaz",
  });

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
        {/* Header mínimo */}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/integracoes/${client.id}`)}
          >
            <Plug className="h-4 w-4 mr-2" />
            Configurar Integrações
          </Button>
        </div>

        {/* Tabs com foco no conteúdo */}
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="tasks">Atividades</TabsTrigger>
            <TabsTrigger value="meetings">Reuniões</TabsTrigger>
            <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <ClientOverview clientId={client.id} client={client} />
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

          <TabsContent value="financial" className="mt-4">
            <ClientFinancial clientId={client.id} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
