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
import { parseLocalDate } from "@/lib/dateUtils";

interface EditSubscriptionDialogProps {
  subscription: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSubscriptionDialog({
  subscription,
  open,
  onOpenChange,
}: EditSubscriptionDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    value: subscription?.value || 0,
    nextDueDate: subscription?.nextDueDate ? format(parseLocalDate(subscription.nextDueDate), "yyyy-MM-dd") : "",
    description: subscription?.description || "",
    cycle: subscription?.cycle || "MONTHLY",
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await supabase.functions.invoke(
        `asaas-api/update-subscription-${subscription.id}`,
        {
          method: "PUT",
          body: data,
        }
      );

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-subscriptions"] });
      toast.success("Assinatura atualizada com sucesso!");
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error updating subscription:", error);
      toast.error(error.message || "Erro ao atualizar assinatura");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSubscriptionMutation.mutate({
      value: parseFloat(formData.value.toString()),
      nextDueDate: formData.nextDueDate,
      description: formData.description,
      cycle: formData.cycle,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Assinatura</DialogTitle>
          <DialogDescription>
            Atualize as informações da assinatura. As alterações serão sincronizadas
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
              placeholder="Descrição da assinatura"
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
              <Label htmlFor="nextDueDate">Próximo Vencimento</Label>
              <Input
                id="nextDueDate"
                type="date"
                value={formData.nextDueDate}
                onChange={(e) =>
                  setFormData({ ...formData, nextDueDate: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cycle">Ciclo de Cobrança</Label>
            <Select
              value={formData.cycle}
              onValueChange={(value) =>
                setFormData({ ...formData, cycle: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WEEKLY">Semanal</SelectItem>
                <SelectItem value="BIWEEKLY">Quinzenal</SelectItem>
                <SelectItem value="MONTHLY">Mensal</SelectItem>
                <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                <SelectItem value="SEMIANNUALLY">Semestral</SelectItem>
                <SelectItem value="YEARLY">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateSubscriptionMutation.isPending}>
              {updateSubscriptionMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
