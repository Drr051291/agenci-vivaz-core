import { useState } from "react";
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

export default function Financial() {
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

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

  // Calcular métricas
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const totalReceivable = linkedPayments
    .filter((p: any) => p.status === 'PENDING')
    .reduce((sum: number, p: any) => sum + (p.value || 0), 0);

  const receivedThisMonth = linkedPayments
    .filter((p: any) => {
      const paymentDate = p.paymentDate || p.confirmedDate;
      if (!paymentDate) return false;
      
      const date = new Date(paymentDate);
      return (
        (p.status === 'RECEIVED' || p.status === 'CONFIRMED' || p.status === 'RECEIVED_IN_CASH') &&
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear
      );
    })
    .reduce((sum: number, p: any) => sum + (p.value || 0), 0);

  const overdue = linkedPayments
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

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A Receber</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {paymentsLoading ? '...' : `R$ ${totalReceivable.toFixed(2)}`}
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
                {paymentsLoading ? '...' : `R$ ${receivedThisMonth.toFixed(2)}`}
              </div>
              <p className="text-xs text-muted-foreground">
                Total confirmado no mês atual
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
                {paymentsLoading ? '...' : `R$ ${overdue.toFixed(2)}`}
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
