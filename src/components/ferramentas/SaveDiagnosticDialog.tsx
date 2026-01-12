import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Users, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type ToolType = 'performance_pro' | 'ecommerce' | 'inside_sales';

interface SaveDiagnosticDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolType: ToolType;
  setor?: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  insights?: unknown[];
  simulationData?: Record<string, unknown> | null;
  periodLabel?: string;
  defaultName?: string;
  preSelectedClientId?: string | null;
  onSaved?: () => void;
}

const TOOL_LABELS: Record<ToolType, { name: string; color: string }> = {
  performance_pro: { name: 'Performance Pro', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  ecommerce: { name: 'E-commerce', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  inside_sales: { name: 'Inside Sales', color: 'bg-green-100 text-green-700 border-green-200' },
};

export function SaveDiagnosticDialog({
  open,
  onOpenChange,
  toolType,
  setor,
  inputs,
  outputs,
  insights,
  simulationData,
  periodLabel,
  defaultName,
  preSelectedClientId,
  onSaved,
}: SaveDiagnosticDialogProps) {
  const [name, setName] = useState(defaultName || `Diagnóstico ${new Date().toLocaleDateString('pt-BR')}`);
  const [notes, setNotes] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(preSelectedClientId || null);
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && clients.length === 0) {
      loadClients();
    }
  }, [open]);

  useEffect(() => {
    if (defaultName) setName(defaultName);
    if (preSelectedClientId) setSelectedClientId(preSelectedClientId);
  }, [defaultName, preSelectedClientId]);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name')
        .eq('status', 'active')
        .order('company_name');
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Digite um nome para o diagnóstico", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Faça login para salvar", variant: "destructive" });
        return;
      }

      const payload = {
        user_id: user.id,
        client_id: selectedClientId || null,
        name: name.trim(),
        tool_type: toolType,
        setor: setor || 'geral',
        inputs: inputs,
        outputs: outputs,
        insights: insights || [],
        simulation_data: simulationData || null,
        period_label: periodLabel || null,
        notes: notes.trim() || null,
        status: 'published',
      };

      const { error } = await supabase
        .from('performance_matrix_diagnostics' as never)
        .insert(payload as never);

      if (error) throw error;

      toast({ 
        title: "Diagnóstico salvo com sucesso!",
        description: selectedClientId 
          ? "O cliente poderá visualizar na área de performance."
          : "Diagnóstico salvo sem vinculação a cliente."
      });

      onOpenChange(false);
      setName(`Diagnóstico ${new Date().toLocaleDateString('pt-BR')}`);
      setNotes('');
      setSelectedClientId(null);
      onSaved?.();
    } catch (error) {
      console.error('Error saving diagnostic:', error);
      toast({ title: "Erro ao salvar diagnóstico", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const toolInfo = TOOL_LABELS[toolType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Salvar Análise
          </DialogTitle>
          <DialogDescription>
            Salve este diagnóstico para acompanhamento e visualização pelo cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tool Type Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Ferramenta:</span>
            <Badge variant="outline" className={toolInfo.color}>
              {toolInfo.name}
            </Badge>
            {setor && (
              <Badge variant="secondary" className="text-xs">
                {setor}
              </Badge>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="diag-name">Nome do Diagnóstico</Label>
            <Input
              id="diag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Análise Q1 2025"
            />
          </div>

          {/* Client Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              Vincular a Cliente
            </Label>
            <Select
              value={selectedClientId || ''}
              onValueChange={(value) => setSelectedClientId(value || null)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione um cliente (opcional)"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sem vínculo</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClientId && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Cliente poderá visualizar na área de performance
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="diag-notes">Observações (opcional)</Label>
            <Textarea
              id="diag-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione contexto ou observações..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Análise
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
