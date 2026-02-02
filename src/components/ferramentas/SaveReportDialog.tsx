import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { FunnelInputsV2, FunnelOutputsV2, ScenarioType } from "@/lib/performanceMatrixPro/calcV2";
import { BENCHMARKS, getScenarioConfig } from "@/lib/performanceMatrixPro/calcV2";

interface Client {
  id: string;
  company_name: string;
}

interface SaveReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputs: FunnelInputsV2;
  outputs: FunnelOutputsV2;
  scenario: ScenarioType;
  onSaved?: () => void;
}

export function SaveReportDialog({
  open,
  onOpenChange,
  inputs,
  outputs,
  scenario,
  onSaved,
}: SaveReportDialogProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Load clients when dialog opens
  useEffect(() => {
    if (open) {
      loadClients();
    }
  }, [open]);

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, company_name")
        .eq("status", "active")
        .order("company_name");

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error loading clients:", error);
      toast({ title: "Erro ao carregar clientes", variant: "destructive" });
    } finally {
      setLoadingClients(false);
    }
  };

  const handleSave = async () => {
    if (!selectedClientId) {
      toast({ title: "Selecione um cliente", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Digite um título para o relatório", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Faça login para salvar", variant: "destructive" });
        return;
      }

      const scenarioConfig = getScenarioConfig(scenario);

      // Build benchmarks JSON
      const benchmarksJson = {
        ranges: {
          global: BENCHMARKS.global,
          lead_mql: BENCHMARKS.lead_mql,
          mql_sql: BENCHMARKS.mql_sql,
          sql_opp: BENCHMARKS.sql_opp,
          opp_contrato: BENCHMARKS.opp_contrato,
        },
        scenarioRates: scenarioConfig,
      };

      // Build outputs JSON
      const outputsJson = {
        costs: outputs.costs,
        projectedCosts: outputs.projectedCosts,
        costSteps: outputs.costSteps,
        largestCostStep: outputs.largestCostStep,
        conversions: outputs.conversions.map(c => ({
          key: c.key,
          label: c.label,
          rate: c.rate,
          status: c.status,
          isProjected: c.isProjected,
        })),
        globalConversion: outputs.globalConversion,
        projectedStages: outputs.projectedStages,
        leadsForContract: outputs.leadsForContract,
      };

      const { error } = await supabase.from("performance_reports").insert([{
        client_id: selectedClientId,
        title: title.trim(),
        period_label: inputs.periodo || null,
        scenario,
        source_tool: "matriz_performance_pro",
        inputs_json: JSON.parse(JSON.stringify(inputs)),
        benchmarks_json: JSON.parse(JSON.stringify(benchmarksJson)),
        outputs_json: JSON.parse(JSON.stringify(outputsJson)),
        created_by: user.id,
      }]);

      if (error) throw error;

      toast({ title: "Relatório salvo com sucesso!" });
      onOpenChange(false);
      setTitle("");
      setSelectedClientId("");
      onSaved?.();
    } catch (error) {
      console.error("Error saving report:", error);
      toast({ title: "Erro ao salvar relatório", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTitle("");
    setSelectedClientId("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-primary" />
            Salvar Relatório por Cliente
          </DialogTitle>
          <DialogDescription>
            O relatório será salvo como snapshot imutável e visível para o cliente na área de Performance.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Client Selector */}
          <div className="space-y-2">
            <Label htmlFor="client" className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Cliente *
            </Label>
            {loadingClients ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando clientes...
              </div>
            ) : (
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título do relatório *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Inbound — Jan/2026"
            />
          </div>

          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
            <p className="font-medium text-muted-foreground">Resumo do relatório:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span>Cenário: <strong className="text-foreground capitalize">{scenario}</strong></span>
              <span>Período: <strong className="text-foreground">{inputs.periodo || "—"}</strong></span>
              <span>Leads: <strong className="text-foreground">{inputs.leads.toLocaleString("pt-BR")}</strong></span>
              <span>Oportunidades: <strong className="text-foreground">{inputs.oportunidades.toLocaleString("pt-BR")}</strong></span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !selectedClientId || !title.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Relatório
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
