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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings } from "lucide-react";

interface AsaasConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AsaasConfigDialog({
  open,
  onOpenChange,
}: AsaasConfigDialogProps) {
  const [environment, setEnvironment] = useState<string>("");
  const queryClient = useQueryClient();

  const { data: config } = useQuery({
    queryKey: ['asaas-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asaas_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (env: string) => {
      if (!config) return;
      
      const { error } = await supabase
        .from('asaas_config')
        .update({ environment: env })
        .eq('id', config.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Ambiente atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['asaas-config'] });
      queryClient.invalidateQueries({ queryKey: ['asaas-customers'] });
      queryClient.invalidateQueries({ queryKey: ['asaas-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['asaas-payments'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  const handleSave = () => {
    if (!environment) {
      toast.error('Selecione um ambiente');
      return;
    }
    updateMutation.mutate(environment);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração Asaas
          </DialogTitle>
          <DialogDescription>
            Configure o ambiente de integração com o Asaas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Ambiente Atual</label>
            <div>
              <Badge variant={config?.environment === 'production' ? 'default' : 'secondary'}>
                {config?.environment === 'production' ? 'Produção' : 'Sandbox'}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Alterar Ambiente</label>
            <Select value={environment} onValueChange={setEnvironment}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o ambiente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox (Testes)</SelectItem>
                <SelectItem value="production">Produção</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {environment === 'sandbox' 
                ? 'Use o ambiente de sandbox para testes sem cobranças reais'
                : 'Produção irá processar cobranças reais'}
            </p>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              <strong>API Key:</strong> Configurada via secrets (oculta por segurança)
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
