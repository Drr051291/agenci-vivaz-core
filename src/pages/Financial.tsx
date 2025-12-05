import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DollarSign, Users, FileText, CreditCard, Settings } from "lucide-react";
import { AsaasCustomerList } from "@/components/financial/AsaasCustomerList";
import { SubscriptionList } from "@/components/financial/SubscriptionList";
import { PaymentList } from "@/components/financial/PaymentList";
import { AsaasConfigDialog } from "@/components/financial/AsaasConfigDialog";
import { FinancialPeriodFilter } from "@/components/financial/FinancialPeriodFilter";
import { startOfMonth, endOfMonth } from "date-fns";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function Financial() {
  usePageMeta({
    title: "Financeiro",
    description: "Gerencie informações financeiras, assinaturas e cobranças dos clientes",
    keywords: "financeiro, cobranças, assinaturas, pagamentos, asaas, vivaz",
  });

  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));

  const handlePeriodChange = (newStartDate: Date, newEndDate: Date) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  // Buscar vínculos de clientes
  const { data: customerLinks } = useQuery({
    queryKey: ['asaas-customer-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asaas_customer_links')
        .select('asaas_customer_id');

      if (error) throw error;
      return data;
    },
  });

  // Buscar todas as cobranças do Asaas
  const { data: allPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['all-asaas-payments'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('asaas-api/payments', {
        method: 'GET',
      });

      if (error) throw error;
      return data?.data || [];
    },
  });

  // Filtrar apenas cobranças de clientes vinculados ao Hub
  const linkedCustomerIds = customerLinks?.map(link => link.asaas_customer_id) || [];
  const linkedPayments = allPayments?.filter((payment: any) => 
    linkedCustomerIds.includes(payment.customer)
  ) || [];

  // Filtrar cobranças por período
  const paymentsInPeriod = useMemo(() => {
    return linkedPayments.filter((payment: any) => {
      const dueDate = new Date(payment.dueDate);
      const paymentDate = payment.paymentDate ? new Date(payment.paymentDate) : null;
      const confirmedDate = payment.confirmedDate ? new Date(payment.confirmedDate) : null;
      
      // Para cobranças pagas, usar data de pagamento/confirmação
      const dateToCheck = paymentDate || confirmedDate || dueDate;
      
      return dateToCheck >= startDate && dateToCheck <= endDate;
    });
  }, [linkedPayments, startDate, endDate]);

  // Calcular métricas baseadas no período
  const totalReceivable = paymentsInPeriod
    .filter((p: any) => p.status === 'PENDING')
    .reduce((sum: number, p: any) => sum + (p.value || 0), 0);

  const receivedInPeriod = paymentsInPeriod
    .filter((p: any) => 
      p.status === 'RECEIVED' || p.status === 'CONFIRMED' || p.status === 'RECEIVED_IN_CASH'
    )
    .reduce((sum: number, p: any) => sum + (p.value || 0), 0);

  const overdue = paymentsInPeriod
    .filter((p: any) => p.status === 'OVERDUE')
    .reduce((sum: number, p: any) => sum + (p.value || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Financeiro</h1>
            <p className="text-muted-foreground">
              Gestão de clientes, assinaturas e cobranças via Asaas
            </p>
          </div>
          <Button variant="outline" onClick={() => setConfigDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configurar Asaas
          </Button>
        </div>

        <FinancialPeriodFilter
          startDate={startDate}
          endDate={endDate}
          onPeriodChange={handlePeriodChange}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A Receber</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {paymentsLoading ? '...' : totalReceivable.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground">
                Cobranças pendentes de clientes vinculados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recebido no Mês</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {paymentsLoading ? '...' : receivedInPeriod.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground">
                Total confirmado no período selecionado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inadimplência</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {paymentsLoading ? '...' : overdue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground">
                Cobranças vencidas
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="customers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="customers">
              <Users className="h-4 w-4 mr-2" />
              Clientes Asaas
            </TabsTrigger>
            <TabsTrigger value="subscriptions">
              <FileText className="h-4 w-4 mr-2" />
              Assinaturas
            </TabsTrigger>
            <TabsTrigger value="payments">
              <CreditCard className="h-4 w-4 mr-2" />
              Cobranças
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="space-y-4">
            <AsaasCustomerList />
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-4">
            <SubscriptionList />
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <PaymentList />
          </TabsContent>
        </Tabs>

        <AsaasConfigDialog 
          open={configDialogOpen} 
          onOpenChange={setConfigDialogOpen} 
        />
      </div>
    </DashboardLayout>
  );
}
