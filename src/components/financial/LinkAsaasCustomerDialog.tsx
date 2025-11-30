import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LinkAsaasCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asaasCustomer: any;
}

export function LinkAsaasCustomerDialog({
  open,
  onOpenChange,
  asaasCustomer,
}: LinkAsaasCustomerDialogProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ['clients-for-linking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name')
        .order('company_name');

      if (error) throw error;
      return data;
    },
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('asaas_customer_links')
        .insert({
          client_id: selectedClientId,
          asaas_customer_id: asaasCustomer.id,
          asaas_customer_name: asaasCustomer.name,
          asaas_customer_email: asaasCustomer.email,
          asaas_customer_cpf_cnpj: asaasCustomer.cpfCnpj,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cliente vinculado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['asaas-customer-links'] });
      onOpenChange(false);
      setSelectedClientId("");
    },
    onError: (error: any) => {
      toast.error('Erro ao vincular cliente: ' + error.message);
    },
  });

  const handleLink = () => {
    if (!selectedClientId) {
      toast.error('Selecione um cliente');
      return;
    }
    linkMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular Cliente Asaas</DialogTitle>
          <DialogDescription>
            Vincule o cliente {asaasCustomer?.name} a um cliente do Hub
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Cliente do Hub</label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleLink} disabled={linkMutation.isPending}>
              {linkMutation.isPending ? 'Vinculando...' : 'Vincular'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
