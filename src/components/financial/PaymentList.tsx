import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/dateUtils";

export function PaymentList() {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['asaas-payments'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('asaas-api/payments', {
        method: 'GET',
      });

      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      PENDING: { label: 'Pendente', variant: 'secondary' },
      RECEIVED: { label: 'Recebido', variant: 'default' },
      CONFIRMED: { label: 'Confirmado', variant: 'default' },
      OVERDUE: { label: 'Vencido', variant: 'destructive' },
      REFUNDED: { label: 'Reembolsado', variant: 'outline' },
      RECEIVED_IN_CASH: { label: 'Recebido em Dinheiro', variant: 'default' },
    };

    const config = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return <div>Carregando cobranças...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Cobranças</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Cobrança
        </Button>
      </div>

      <div className="grid gap-4">
        {payments?.data?.map((payment: any) => (
          <Card key={payment.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">
                    {payment.description || 'Sem descrição'}
                  </h3>
                  {getStatusBadge(payment.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Cliente: {payment.customer}
                </p>
                <div className="flex gap-4 text-sm">
                  <span className="font-semibold">
                    {payment.value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span>
                    Vencimento:{' '}
                    {format(parseLocalDate(payment.dueDate), 'dd/MM/yyyy', {
                      locale: ptBR,
                    })}
                  </span>
                  <span>Forma: {payment.billingType}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {payments?.data?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma cobrança encontrada
          </div>
        )}
      </div>
    </div>
  );
}
