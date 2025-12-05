import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link2, ExternalLink } from "lucide-react";
import { LinkAsaasCustomerDialog } from "./LinkAsaasCustomerDialog";
import { toast } from "sonner";

export function AsaasCustomerList() {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const { data: asaasCustomers, isLoading, error } = useQuery({
    queryKey: ['asaas-customers'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('asaas-api', {
        body: { action: 'customers' },
      });

      if (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }
      return data;
    },
  });

  const { data: links } = useQuery({
    queryKey: ['asaas-customer-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asaas_customer_links')
        .select('*, clients(company_name)');

      if (error) throw error;
      return data;
    },
  });

  const handleLinkCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setLinkDialogOpen(true);
  };

  const isLinked = (asaasCustomerId: string) => {
    return links?.some(link => link.asaas_customer_id === asaasCustomerId);
  };

  const getLinkedClientName = (asaasCustomerId: string) => {
    const link = links?.find(l => l.asaas_customer_id === asaasCustomerId);
    return link?.clients?.company_name;
  };

  if (isLoading) {
    return <div>Carregando clientes do Asaas...</div>;
  }

  if (error) {
    return (
      <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
        <p className="text-sm text-destructive">
          Erro ao carregar clientes do Asaas. Verifique se a API key está configurada corretamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Clientes Asaas</h2>
        <Button variant="outline" size="sm">
          <ExternalLink className="h-4 w-4 mr-2" />
          Criar Cliente no Asaas
        </Button>
      </div>

      <div className="grid gap-4">
        {asaasCustomers?.data?.map((customer: any) => (
          <Card key={customer.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{customer.name}</h3>
                  {isLinked(customer.id) ? (
                    <Badge variant="secondary">
                      <Link2 className="h-3 w-3 mr-1" />
                      Vinculado: {getLinkedClientName(customer.id)}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Não vinculado</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{customer.email}</p>
                <p className="text-sm text-muted-foreground">
                  {customer.cpfCnpj || 'CPF/CNPJ não informado'}
                </p>
              </div>

              {!isLinked(customer.id) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLinkCustomer(customer)}
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Vincular ao Hub
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <LinkAsaasCustomerDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        asaasCustomer={selectedCustomer}
      />
    </div>
  );
}
