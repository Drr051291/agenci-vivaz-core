import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Calendar, DollarSign, Phone, Mail, MapPin } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

interface ClientData {
  id: string;
  company_name: string;
  segment: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contract_start: string | null;
  monthly_fee: number | null;
  address: string | null;
  website: string | null;
  status: string;
}

const ClientDashboard = () => {
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  usePageMeta({
    title: "Área do Cliente",
    description: "Acompanhe suas informações, atividades e dashboards",
    keywords: "área do cliente, dashboard, informações, vivaz",
  });

  useEffect(() => {
    const checkAuthAndLoadClient = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      // Verificar se é cliente
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (userRole?.role !== "client") {
        navigate("/dashboard");
        return;
      }

      // Buscar dados do cliente vinculado
      const { data: client, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error || !client) {
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do cliente.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setClientData(client);
      setLoading(false);
    };

    checkAuthAndLoadClient();
  }, [navigate, toast]);

  const getSegmentColor = (segment: string) => {
    const colors = {
      inside_sales: "bg-blue-500",
      ecommerce: "bg-green-500",
      marketplace: "bg-purple-500",
      local_business: "bg-orange-500",
    };
    return colors[segment as keyof typeof colors] || "bg-gray-500";
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
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!clientData) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              Não foi possível carregar os dados do cliente.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bem-vindo, {clientData.company_name}
          </h1>
          <p className="text-muted-foreground">
            Acompanhe suas informações e atividades
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Empresa</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientData.company_name}</div>
              <Badge className={`mt-2 ${getSegmentColor(clientData.segment)}`}>
                {getSegmentLabel(clientData.segment)}
              </Badge>
            </CardContent>
          </Card>

          {clientData.contract_start && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Início do Contrato</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Date(clientData.contract_start).toLocaleDateString("pt-BR")}
                </div>
              </CardContent>
            </Card>
          )}

          {clientData.monthly_fee && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Investimento Mensal</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(clientData.monthly_fee)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações de Contato</CardTitle>
            <CardDescription>Dados do contato principal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {clientData.contact_name && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{clientData.contact_name}</span>
              </div>
            )}
            {clientData.contact_email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{clientData.contact_email}</span>
              </div>
            )}
            {clientData.contact_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{clientData.contact_phone}</span>
              </div>
            )}
            {clientData.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{clientData.address}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ClientDashboard;
