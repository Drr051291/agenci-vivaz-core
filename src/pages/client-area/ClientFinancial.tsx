import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, FileText, CreditCard, Eye, Download, Link2Off, ExternalLink } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/dateUtils";
import { PaymentFilters, PaymentFilterState } from "@/components/client-details/PaymentFilters";

const ClientFinancial = () => {
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [paymentFilters, setPaymentFilters] = useState<PaymentFilterState>({
    status: "all",
  });

  usePageMeta({
    title: "Financeiro - Área do Cliente",
    description: "Acompanhe suas cobranças e assinaturas",
    keywords: "financeiro, cobranças, assinaturas, área do cliente, vivaz",
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

      // Buscar cliente vinculado
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (!client) {
        toast({
          title: "Erro",
          description: "Cliente não encontrado",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setClientId(client.id);
      setLoading(false);
    };

    checkAuthAndLoadClient();
  }, [navigate, toast]);

  // Buscar vínculo com Asaas
  const { data: asaasLink, isLoading: linkLoading } = useQuery({
    queryKey: ['asaas-link', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asaas_customer_links')
        .select('*')
        .eq('client_id', clientId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Buscar assinaturas do cliente
  const { data: subscriptions, isLoading: subsLoading } = useQuery({
    queryKey: ['client-subscriptions', asaasLink?.asaas_customer_id],
    enabled: !!asaasLink?.asaas_customer_id,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('asaas-api/subscriptions', {
        method: 'GET',
      });

      if (error) throw error;
      
      const filtered = data?.data?.filter(
        (sub: any) => sub.customer === asaasLink?.asaas_customer_id
      ) || [];
      
      return filtered;
    },
  });

  // Buscar cobranças do cliente
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['client-payments', asaasLink?.asaas_customer_id],
    enabled: !!asaasLink?.asaas_customer_id,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('asaas-api/payments', {
        method: 'GET',
      });

      if (error) throw error;
      
      const filtered = data?.data?.filter(
        (payment: any) => payment.customer === asaasLink?.asaas_customer_id
      ) || [];
      
      return filtered;
    },
  });

  // Buscar notas fiscais
  const { data: invoices } = useQuery({
    queryKey: ['payment-invoices', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_invoices')
        .select('*')
        .eq('client_id', clientId!);

      if (error) throw error;
      return data;
    },
  });

  const handleDownloadInvoice = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('invoices')
        .download(filePath);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Sucesso",
        description: "Download iniciado",
      });
    } catch (error: any) {
      console.error("Erro ao baixar nota fiscal:", error);
      toast({
        title: "Erro",
        description: "Erro ao baixar nota fiscal",
        variant: "destructive",
      });
    }
  };

  const getInvoiceForPayment = (paymentId: string) => {
    return invoices?.find(inv => inv.payment_id === paymentId);
  };

  const filteredPayments = useMemo(() => {
    if (!payments) return [];

    return payments.filter((payment: any) => {
      if (paymentFilters.status !== "all" && payment.status !== paymentFilters.status) {
        return false;
      }

      const dueDate = new Date(payment.dueDate);
      
      if (paymentFilters.startDate) {
        const startDate = new Date(paymentFilters.startDate);
        startDate.setHours(0, 0, 0, 0);
        if (dueDate < startDate) {
          return false;
        }
      }

      if (paymentFilters.endDate) {
        const endDate = new Date(paymentFilters.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (dueDate > endDate) {
          return false;
        }
      }

      return true;
    });
  }, [payments, paymentFilters]);

  const getStatusBadge = (status: string, type: 'subscription' | 'payment') => {
    if (type === 'subscription') {
      const statusMap: Record<string, { label: string; variant: any }> = {
        ACTIVE: { label: 'Ativa', variant: 'default' },
        INACTIVE: { label: 'Inativa', variant: 'secondary' },
        EXPIRED: { label: 'Expirada', variant: 'destructive' },
      };
      const config = statusMap[status] || { label: status, variant: 'outline' };
      return <Badge variant={config.variant}>{config.label}</Badge>;
    } else {
      const statusMap: Record<string, { label: string; variant: any }> = {
        PENDING: { label: 'Pendente', variant: 'secondary' },
        RECEIVED: { label: 'Recebido', variant: 'default' },
        CONFIRMED: { label: 'Confirmado', variant: 'default' },
        OVERDUE: { label: 'Vencido', variant: 'destructive' },
        REFUNDED: { label: 'Reembolsado', variant: 'outline' },
        RECEIVED_IN_CASH: { label: 'Recebido', variant: 'default' },
      };
      const config = statusMap[status] || { label: status, variant: 'outline' };
      return <Badge variant={config.variant}>{config.label}</Badge>;
    }
  };

  if (loading || linkLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!asaasLink) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
            <p className="text-muted-foreground">
              Acompanhe suas cobranças e assinaturas
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2Off className="h-5 w-5" />
                Informações Financeiras Não Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                As informações financeiras ainda não estão disponíveis. Entre em contato com a
                agência para mais detalhes.
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
          <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">
            Acompanhe suas cobranças e assinaturas
          </p>
        </div>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Informações da Conta</p>
                <p className="text-sm text-muted-foreground">{asaasLink.asaas_customer_name}</p>
                <p className="text-xs text-muted-foreground">{asaasLink.asaas_customer_email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="payments" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payments">
              <CreditCard className="h-4 w-4 mr-2" />
              Cobranças
            </TabsTrigger>
            <TabsTrigger value="subscriptions">
              <FileText className="h-4 w-4 mr-2" />
              Assinaturas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-4">
            <PaymentFilters onFilterChange={setPaymentFilters} />

            {paymentsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando cobranças...
              </div>
            ) : filteredPayments && filteredPayments.length > 0 ? (
              <div className="space-y-3">
                {filteredPayments.map((payment: any) => {
                  const invoice = getInvoiceForPayment(payment.id);
                  
                  return (
                    <Card key={payment.id}>
                      <CardContent className="py-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">
                                {payment.description || 'Sem descrição'}
                              </h4>
                              {getStatusBadge(payment.status, 'payment')}
                            </div>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {payment.value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                              <span>
                                Venc:{' '}
                                {format(parseLocalDate(payment.dueDate), 'dd/MM/yyyy', {
                                  locale: ptBR,
                                })}
                              </span>
                              <span>{payment.billingType}</span>
                            </div>
                            {payment.invoiceUrl && (
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0"
                                asChild
                              >
                                <a href={payment.invoiceUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Ver Link de Pagamento
                                </a>
                              </Button>
                            )}
                          </div>
                          {invoice && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadInvoice(invoice.file_path, invoice.file_name)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Baixar Nota Fiscal
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {payments && payments.length > 0 
                  ? 'Nenhuma cobrança encontrada com os filtros aplicados'
                  : 'Nenhuma cobrança disponível'
                }
              </div>
            )}
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-4">
            {subsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando assinaturas...
              </div>
            ) : subscriptions && subscriptions.length > 0 ? (
              <div className="space-y-3">
                {subscriptions.map((sub: any) => (
                  <Card key={sub.id}>
                    <CardContent className="py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">
                            {sub.description || 'Sem descrição'}
                          </h4>
                          {getStatusBadge(sub.status, 'subscription')}
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {sub.value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                          <span>Ciclo: {sub.cycle}</span>
                          {sub.nextDueDate && (
                            <span>
                              Próx:{' '}
                              {format(parseLocalDate(sub.nextDueDate), 'dd/MM/yyyy', {
                                locale: ptBR,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma assinatura disponível
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ClientFinancial;
