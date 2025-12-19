import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { HelpCircle, RefreshCw, ChevronDown } from "lucide-react";
import { useState } from "react";
import { InsideSalesInputs, InsideSalesOutputs, formatMetricByKey } from "@/lib/insideSalesMatrix/calc";
import { Targets, DEFAULT_TARGETS } from "@/lib/insideSalesMatrix/status";

interface InputTabsProps {
  inputs: InsideSalesInputs;
  outputs: InsideSalesOutputs;
  targets: Targets;
  onInputChange: (key: keyof InsideSalesInputs, value: string) => void;
  onTargetChange: (key: string, value: number) => void;
  onResetTargets: () => void;
}

function TooltipHelper({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function InputField({
  id,
  label,
  value,
  onChange,
  tooltip,
  prefix,
  suffix,
  error,
}: {
  id: string;
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  tooltip?: string;
  prefix?: string;
  suffix?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {tooltip && <TooltipHelper text={tooltip} />}
      </div>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {prefix}
          </span>
        )}
        <Input
          id={id}
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${prefix ? 'pl-8' : ''} ${suffix ? 'pr-10' : ''} ${error ? 'border-red-500' : ''}`}
          min="0"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function InputTabs({ inputs, outputs, targets, onInputChange, onTargetChange, onResetTargets }: InputTabsProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Validation
  const validationErrors: Record<string, string> = {};
  if (inputs.mql !== undefined && inputs.leads !== undefined && inputs.mql > inputs.leads) {
    validationErrors.mql = "MQL não pode ser maior que Leads";
  }
  if (inputs.sql !== undefined && inputs.mql !== undefined && inputs.sql > inputs.mql) {
    validationErrors.sql = "SQL não pode ser maior que MQL";
  }
  if (inputs.reunioes !== undefined && inputs.sql !== undefined && inputs.reunioes > inputs.sql) {
    validationErrors.reunioes = "Reuniões não pode ser maior que SQL";
  }
  if (inputs.contratos !== undefined && inputs.reunioes !== undefined && inputs.contratos > inputs.reunioes) {
    validationErrors.contratos = "Contratos não pode ser maior que Reuniões";
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Dados do Funil</CardTitle>
        <CardDescription>Preencha os números do período analisado</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="essencial" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="essencial">Essencial</TabsTrigger>
            <TabsTrigger value="midia">Mídia paga</TabsTrigger>
            <TabsTrigger value="metas">Metas</TabsTrigger>
          </TabsList>

          <TabsContent value="essencial" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <InputField
                id="investimento"
                label="Investimento"
                value={inputs.investimento ?? ''}
                onChange={v => onInputChange('investimento', v)}
                prefix="R$"
                tooltip="Valor total investido em mídia"
              />
              <InputField
                id="leads"
                label="Leads"
                value={inputs.leads ?? ''}
                onChange={v => onInputChange('leads', v)}
                tooltip="Total de leads captados"
              />
              <InputField
                id="mql"
                label="MQL"
                value={inputs.mql ?? ''}
                onChange={v => onInputChange('mql', v)}
                tooltip="Marketing Qualified Leads"
                error={validationErrors.mql}
              />
              <InputField
                id="sql"
                label="SQL"
                value={inputs.sql ?? ''}
                onChange={v => onInputChange('sql', v)}
                tooltip="Sales Qualified Leads"
                error={validationErrors.sql}
              />
              <InputField
                id="reunioes"
                label="Reuniões"
                value={inputs.reunioes ?? ''}
                onChange={v => onInputChange('reunioes', v)}
                tooltip="Reuniões agendadas/realizadas"
                error={validationErrors.reunioes}
              />
              <InputField
                id="contratos"
                label="Contratos"
                value={inputs.contratos ?? ''}
                onChange={v => onInputChange('contratos', v)}
                tooltip="Contratos fechados (wins)"
                error={validationErrors.contratos}
              />
              <div className="col-span-2">
                <InputField
                  id="receita"
                  label="Receita (opcional)"
                  value={inputs.receita ?? ''}
                  onChange={v => onInputChange('receita', v)}
                  prefix="R$"
                  tooltip="Receita total gerada no período"
                />
              </div>
            </div>

            {/* Preview das taxas calculadas */}
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-2">Taxas calculadas:</p>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {[
                  { key: 'leadToMql', label: 'Lead→MQL' },
                  { key: 'mqlToSql', label: 'MQL→SQL' },
                  { key: 'sqlToMeeting', label: 'SQL→Reunião' },
                  { key: 'meetingToWin', label: 'Win Rate' },
                ].map(({ key, label }) => (
                  <div key={key} className="bg-muted/50 rounded px-2 py-1.5 text-center">
                    <span className="text-muted-foreground block text-[10px]">{label}</span>
                    <span className="font-medium">{formatMetricByKey(key, outputs[key as keyof InsideSalesOutputs])}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div className="bg-muted/50 rounded px-2 py-1.5 text-center">
                  <span className="text-muted-foreground block text-[10px]">CPL</span>
                  <span className="font-medium">{formatMetricByKey('cpl', outputs.cpl)}</span>
                </div>
                <div className="bg-muted/50 rounded px-2 py-1.5 text-center">
                  <span className="text-muted-foreground block text-[10px]">CAC</span>
                  <span className="font-medium">{formatMetricByKey('cac', outputs.cac)}</span>
                </div>
              </div>
            </div>

            {/* Advanced fields collapsible */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                  Avançado (Inside Sales)
                  <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <InputField
                    id="ttft"
                    label="TTFT"
                    value={inputs.ttft ?? ''}
                    onChange={v => onInputChange('ttft', v)}
                    suffix="min"
                    tooltip="Tempo até 1º contato (minutos)"
                  />
                  <InputField
                    id="contactRate24h"
                    label="Contact 24h"
                    value={inputs.contactRate24h ?? ''}
                    onChange={v => onInputChange('contactRate24h', v)}
                    suffix="%"
                    tooltip="% contatados em até 24h"
                  />
                  <InputField
                    id="connectRate"
                    label="Connect rate"
                    value={inputs.connectRate ?? ''}
                    onChange={v => onInputChange('connectRate', v)}
                    suffix="%"
                    tooltip="% que atende/responde"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          <TabsContent value="midia" className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Opcional: dados de mídia paga para análise mais completa.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <InputField
                id="impressoes"
                label="Impressões"
                value={inputs.impressoes ?? ''}
                onChange={v => onInputChange('impressoes', v)}
              />
              <InputField
                id="cliques"
                label="Cliques"
                value={inputs.cliques ?? ''}
                onChange={v => onInputChange('cliques', v)}
              />
            </div>

            {(inputs.impressoes || inputs.cliques) && (
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">Métricas calculadas:</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-muted/50 rounded px-2 py-1.5 text-center">
                    <span className="text-muted-foreground block text-[10px]">CTR</span>
                    <span className="font-medium">{formatMetricByKey('ctr', outputs.ctr)}</span>
                  </div>
                  <div className="bg-muted/50 rounded px-2 py-1.5 text-center">
                    <span className="text-muted-foreground block text-[10px]">CPC</span>
                    <span className="font-medium">{formatMetricByKey('cpc', outputs.cpc)}</span>
                  </div>
                  <div className="bg-muted/50 rounded px-2 py-1.5 text-center">
                    <span className="text-muted-foreground block text-[10px]">CPM</span>
                    <span className="font-medium">{formatMetricByKey('cpm', outputs.cpm)}</span>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="metas" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Ajuste as metas conforme o histórico do cliente.
              </p>
              <Button variant="ghost" size="sm" onClick={onResetTargets}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Restaurar padrão
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'leadToMql', label: 'Lead → MQL (%)' },
                { key: 'mqlToSql', label: 'MQL → SQL (%)' },
                { key: 'sqlToMeeting', label: 'SQL → Reunião (%)' },
                { key: 'meetingToWin', label: 'Reunião → Contrato (%)' },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-sm">{label}</Label>
                  <Input
                    type="number"
                    value={targets[key]?.value ?? ''}
                    onChange={(e) => onTargetChange(key, parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
              ))}
            </div>

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                  Metas opcionais (mídia)
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'cpl', label: 'CPL máx (R$)' },
                    { key: 'ctr', label: 'CTR mín (%)' },
                    { key: 'cpc', label: 'CPC máx (R$)' },
                    { key: 'cvrClickLead', label: 'CVR clique→lead mín (%)' },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      <Input
                        type="number"
                        value={targets[key]?.value ?? ''}
                        onChange={(e) => onTargetChange(key, parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <p className="text-xs text-muted-foreground italic border-t pt-3">
              Benchmarks são estimativas — ajuste conforme o histórico do cliente.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
