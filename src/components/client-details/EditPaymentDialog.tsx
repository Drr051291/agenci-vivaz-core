import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";

interface EditPaymentDialogProps {
  payment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPaymentDialog({
  payment,
  open,
  onOpenChange,
}: EditPaymentDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    value: payment?.value || 0,
    dueDate: payment?.dueDate ? format(new Date(payment.dueDate), "yyyy-MM-dd") : "",
    description: payment?.description || "",
    billingType: payment?.billingType || "BOLETO",
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase.functions.invoke(
        `asaas-api/payment-${payment.id}`,
        {
          method: "PUT",
          body: data,
        }
      );

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asaas-payments"] });
      toast.success("Cobrança atualizada com sucesso!");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar cobrança");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePaymentMutation.mutate({
      value: parseFloat(formData.value.toString()),
      dueDate: formData.dueDate,
      description: formData.description,
      billingType: formData.billingType,
    });
  };

  const handleCopyPaymentLink = () => {
    const link = payment.billingType === "PIX" 
      ? payment.invoiceUrl 
      : payment.bankSlipUrl || payment.invoiceUrl;
    
    if (link) {
      navigator.clipboard.writeText(link);
      toast.success("Link copiado para a área de transferência!");
    } else {
      toast.error("Link de pagamento não disponível");
    }
  };

  const handleShareWhatsApp = () => {
    const link = payment.billingType === "PIX" 
      ? payment.invoiceUrl 
      : payment.bankSlipUrl || payment.invoiceUrl;
    
    if (link) {
      const message = encodeURIComponent(
        `Olá! Segue o link para pagamento da cobrança:\n\n` +
        `Descrição: ${payment.description || "Cobrança"}\n` +
        `Valor: R$ ${payment.value.toFixed(2)}\n` +
        `Vencimento: ${format(new Date(payment.dueDate), "dd/MM/yyyy")}\n\n` +
        `Link: ${link}`
      );
      window.open(`https://wa.me/?text=${message}`, "_blank");
    } else {
      toast.error("Link de pagamento não disponível");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Cobrança</DialogTitle>
          <DialogDescription>
            Atualize as informações da cobrança. As alterações serão sincronizadas
            com o Asaas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Descrição da cobrança"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="value">Valor (R$)</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                min="0"
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: parseFloat(e.target.value) })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Vencimento</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billingType">Forma de Pagamento</Label>
            <Select
              value={formData.billingType}
              onValueChange={(value) =>
                setFormData({ ...formData, billingType: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BOLETO">Boleto</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t">
            <Label className="text-sm text-muted-foreground">
              Compartilhar Cobrança
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleCopyPaymentLink}
              >
                Copiar Link
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleShareWhatsApp}
              >
                WhatsApp
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updatePaymentMutation.isPending}>
              {updatePaymentMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
