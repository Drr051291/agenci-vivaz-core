import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Link2Off, DollarSign, FileText, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientFinancialProps {
  clientId: string;
}

export function ClientFinancial({ clientId }: ClientFinancialProps) {
  // Buscar vínculo com Asaas
  const { data: asaasLink, isLoading: linkLoading } = useQuery({
    queryKey: ['asaas-link', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asaas_customer_links')
        .select('*')
        .eq('client_id', clientId)
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
      
      // Filtrar assinaturas deste cliente
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
      
      // Filtrar cobranças deste cliente
      const filtered = data?.data?.filter(
        (payment: any) => payment.customer === asaasLink?.asaas_customer_id
      ) || [];
      
      return filtered;
    },
  });

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

  if (linkLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Carregando informações financeiras...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!asaasLink) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2Off className="h-5 w-5" />
            Cliente não vinculado ao Asaas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Este cliente ainda não foi vinculado a um cliente do Asaas. Vincule-o no módulo
            Financeiro para visualizar assinaturas e cobranças.
          </p>
          <Button variant="outline" asChild>
            <a href="/financeiro" target="_blank">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ir para Financeiro
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totalReceived = payments?.filter((p: any) => 
    p.status === 'RECEIVED' || p.status === 'CONFIRMED' || p.status === 'RECEIVED_IN_CASH'
  ).reduce((sum: number, p: any) => sum + (p.value || 0), 0) || 0;

  const totalPending = payments?.filter((p: any) => 
    p.status === 'PENDING'
  ).reduce((sum: number, p: any) => sum + (p.value || 0), 0) || 0;

  const totalOverdue = payments?.filter((p: any) => 
    p.status === 'OVERDUE'
  ).reduce((sum: number, p: any) => sum + (p.value || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Info do vínculo */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Cliente Asaas Vinculado</p>
              <p className="text-sm text-muted-foreground">{asaasLink.asaas_customer_name}</p>
              <p className="text-xs text-muted-foreground">{asaasLink.asaas_customer_email}</p>
            </div>
            <Badge variant="secondary">
              <Link2Off className="h-3 w-3 mr-1" />
              Vinculado
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Métricas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recebido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalReceived.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total confirmado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendente</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalPending.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Aguardando pagamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencido</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              R$ {totalOverdue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Em atraso</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Assinaturas e Cobranças */}
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
          {paymentsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando cobranças...
            </div>
          ) : payments && payments.length > 0 ? (
            <div className="space-y-3">
              {payments.map((payment: any) => (
                <Card key={payment.id}>
                  <CardContent className="py-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">
                            {payment.description || 'Sem descrição'}
                          </h4>
                          {getStatusBadge(payment.status, 'payment')}
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            R$ {payment.value?.toFixed(2)}
                          </span>
                          <span>
                            Venc:{' '}
                            {format(new Date(payment.dueDate), 'dd/MM/yyyy', {
                              locale: ptBR,
                            })}
                          </span>
                          <span>{payment.billingType}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma cobrança encontrada para este cliente
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
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">
                            {sub.description || 'Sem descrição'}
                          </h4>
                          {getStatusBadge(sub.status, 'subscription')}
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">
                            R$ {sub.value?.toFixed(2)}
                          </span>
                          <span>Ciclo: {sub.cycle}</span>
                          {sub.nextDueDate && (
                            <span>
                              Próx:{' '}
                              {format(new Date(sub.nextDueDate), 'dd/MM/yyyy', {
                                locale: ptBR,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma assinatura encontrada para este cliente
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
