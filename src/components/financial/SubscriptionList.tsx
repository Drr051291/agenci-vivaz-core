import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function SubscriptionList() {
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['asaas-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('asaas-api/subscriptions', {
        method: 'GET',
      });

      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      ACTIVE: { label: 'Ativa', variant: 'default' },
      INACTIVE: { label: 'Inativa', variant: 'secondary' },
      EXPIRED: { label: 'Expirada', variant: 'destructive' },
    };

    const config = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return <div>Carregando assinaturas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Assinaturas</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Assinatura
        </Button>
      </div>

      <div className="grid gap-4">
        {subscriptions?.data?.map((subscription: any) => (
          <Card key={subscription.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{subscription.description || 'Sem descrição'}</h3>
                  {getStatusBadge(subscription.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Cliente: {subscription.customer}
                </p>
                <div className="flex gap-4 text-sm">
                  <span>Valor: R$ {subscription.value?.toFixed(2)}</span>
                  <span>Ciclo: {subscription.cycle}</span>
                  {subscription.nextDueDate && (
                    <span>
                      Próx. Vencimento:{' '}
                      {format(new Date(subscription.nextDueDate), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}

        {subscriptions?.data?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma assinatura encontrada
          </div>
        )}
      </div>
    </div>
  );
}
