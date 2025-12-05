import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";

const paymentSchema = z.object({
  value: z.string()
    .trim()
    .nonempty({ message: "Valor é obrigatório" })
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Valor deve ser um número positivo",
    })
    .refine((val) => Number(val) <= 1000000, {
      message: "Valor máximo é R$ 1.000.000,00",
    }),
  dueDate: z.string()
    .nonempty({ message: "Data de vencimento é obrigatória" })
    .refine((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    }, {
      message: "Data de vencimento não pode ser no passado",
    }),
  description: z.string()
    .trim()
    .nonempty({ message: "Descrição é obrigatória" })
    .min(3, { message: "Descrição deve ter no mínimo 3 caracteres" })
    .max(500, { message: "Descrição deve ter no máximo 500 caracteres" }),
  billingType: z.enum(["BOLETO", "PIX", "CREDIT_CARD"], {
    required_error: "Selecione uma forma de pagamento",
  }),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface CreatePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asaasCustomerId: string;
  clientName: string;
}

export function CreatePaymentDialog({
  open,
  onOpenChange,
  asaasCustomerId,
  clientName,
}: CreatePaymentDialogProps) {
  const queryClient = useQueryClient();
  
  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      value: "",
      dueDate: format(new Date(), 'yyyy-MM-dd'),
      description: "",
      billingType: "PIX",
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const payload = {
        customer: asaasCustomerId,
        value: Number(data.value),
        dueDate: data.dueDate,
        description: data.description.trim(),
        billingType: data.billingType,
      };

      const { data: result, error } = await supabase.functions.invoke('asaas-api', {
        body: { action: 'create-payment', ...payload },
      });

      if (error) throw error;
      if (result.errors) {
        throw new Error(result.errors[0]?.description || 'Erro ao criar cobrança');
      }
      
      return result;
    },
    onSuccess: () => {
      toast.success('Cobrança criada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['client-payments'] });
      queryClient.invalidateQueries({ queryKey: ['asaas-payments'] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Error creating payment:', error);
      toast.error('Erro ao criar cobrança: ' + (error.message || 'Erro desconhecido'));
    },
  });

  const onSubmit = (data: PaymentFormData) => {
    createPaymentMutation.mutate(data);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !createPaymentMutation.isPending) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Cobrança Avulsa</DialogTitle>
          <DialogDescription>
            Criar cobrança para {clientName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Pagamento de serviço mensal..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Descreva o motivo da cobrança (até 500 caracteres)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="1000000"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vencimento *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        min={format(new Date(), 'yyyy-MM-dd')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="billingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de Pagamento *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a forma de pagamento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
                      <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    O cliente receberá as instruções de pagamento por email
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createPaymentMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createPaymentMutation.isPending}>
                {createPaymentMutation.isPending ? 'Criando...' : 'Criar Cobrança'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
