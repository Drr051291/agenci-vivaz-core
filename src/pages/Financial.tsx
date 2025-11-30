import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Users, FileText, CreditCard } from "lucide-react";
import { AsaasCustomerList } from "@/components/financial/AsaasCustomerList";
import { SubscriptionList } from "@/components/financial/SubscriptionList";
import { PaymentList } from "@/components/financial/PaymentList";

export default function Financial() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">
            Gestão de clientes, assinaturas e cobranças via Asaas
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A Receber</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ --</div>
              <p className="text-xs text-muted-foreground">
                Aguardando implementação
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recebido no Mês</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ --</div>
              <p className="text-xs text-muted-foreground">
                Aguardando implementação
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inadimplência</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ --</div>
              <p className="text-xs text-muted-foreground">
                Aguardando implementação
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
      </div>
    </DashboardLayout>
  );
}
