import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReporteiClient {
  id: string;
  name: string;
}

interface Integration {
  id: string | number;
  name?: string;
  title?: string;
  type?: string | number;
  network?: string;
  network_name?: string;
  widgets_count?: number;
}

interface Template {
  id: string;
  name: string;
  description: string;
  metrics: string[];
}

const TEMPLATES: Template[] = [
  {
    id: "meta_ads",
    name: "Meta Ads",
    description: "Métricas completas para campanhas no Facebook e Instagram Ads",
    metrics: ["impressions", "clicks", "ctr", "cpc", "cpm", "conversions", "roas", "spend"]
  },
  {
    id: "google_ads",
    name: "Google Ads",
    description: "Principais indicadores de campanhas do Google Ads",
    metrics: ["impressions", "clicks", "ctr", "cpc", "conversions", "cost_per_conversion"]
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Métricas orgânicas do Instagram",
    metrics: ["followers", "reach", "impressions", "engagement", "saves", "shares"]
  },
  {
    id: "facebook",
    name: "Facebook",
    description: "Métricas da página do Facebook",
    metrics: ["page_likes", "reach", "engagement", "reactions"]
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    description: "Indicadores de vendas online",
    metrics: ["transactions", "revenue", "average_order_value", "conversion_rate"]
  },
  {
    id: "custom",
    name: "Personalizado",
    description: "Escolha suas próprias métricas",
    metrics: []
  }
];

interface ReporteiDashboardConfigProps {
  dashboardId: string;
  clientId: string;
  currentConfig?: any;
  onSave: () => void;
  onCancel: () => void;
}

export const ReporteiDashboardConfig = ({ 
  dashboardId, 
  clientId,
  currentConfig,
  onSave, 
  onCancel 
}: ReporteiDashboardConfigProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [reporteiClients, setReporteiClients] = useState<ReporteiClient[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedClient, setSelectedClient] = useState(currentConfig?.reportei_client_id || "");
  const [selectedChannels, setSelectedChannels] = useState<string[]>(currentConfig?.selected_channels || []);
  const [selectedTemplate, setSelectedTemplate] = useState(currentConfig?.template || "custom");

  useEffect(() => {
    fetchReporteiClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchIntegrations();
    }
  }, [selectedClient]);

  const fetchReporteiClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reportei-data', {
        body: { action: 'getClients' }
      });

      if (error) throw error;
      setReporteiClients(data.data || []);
    } catch (error) {
      console.error('Error fetching Reportei clients:', error);
      toast.error('Erro ao carregar projetos do Reportei');
    } finally {
      setLoading(false);
    }
  };

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reportei-data', {
        body: { 
          action: 'getIntegrations',
          clientId: selectedClient
        }
      });

      if (error) throw error;
      
      console.log('Raw integrations data from Reportei API:', data);
      console.log('Integrations array:', data.data);
      
      setIntegrations(data.data || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast.error('Erro ao carregar integrações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const config = {
        reportei_client_id: selectedClient,
        selected_channels: selectedChannels,
        template: selectedTemplate,
        selected_metrics: {}
      };

      const { error } = await supabase
        .from('client_dashboards')
        .update({ config })
        .eq('id', dashboardId);

      if (error) throw error;

      toast.success('Configuração salva com sucesso!');
      onSave();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = (channelId: string) => {
    setSelectedChannels(prev => 
      prev.includes(channelId) 
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">
          Configurar Dashboard Reportei - Etapa {step} de 4
        </h3>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div 
              key={s} 
              className={`h-1 flex-1 rounded ${s <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label>Selecione o Projeto do Reportei</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um projeto..." />
              </SelectTrigger>
              <SelectContent>
                {reporteiClients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button onClick={() => setStep(2)} disabled={!selectedClient || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Próximo
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Label>Selecione os Canais</Label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {integrations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum canal encontrado</p>
            ) : (
              integrations.map((integration) => {
                const channelName = integration.title || integration.name || `Canal ${integration.id}`;
                const channelType = integration.network_name || integration.network || '';
                const widgetCount = integration.widgets_count || 0;
                
                return (
                  <div key={integration.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50">
                    <Checkbox
                      id={String(integration.id)}
                      checked={selectedChannels.includes(String(integration.id))}
                      onCheckedChange={() => toggleChannel(String(integration.id))}
                    />
                    <Label htmlFor={String(integration.id)} className="cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{channelName}</span>
                        {channelType && (
                          <span className="text-xs text-muted-foreground capitalize">
                            {channelType}
                          </span>
                        )}
                        {widgetCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({widgetCount} métricas)
                          </span>
                        )}
                      </div>
                    </Label>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
            <Button onClick={() => setStep(3)} disabled={selectedChannels.length === 0}>
              Próximo
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <Label>Escolha um Template</Label>
          <RadioGroup value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <div className="space-y-3">
              {TEMPLATES.map((template) => (
                <div key={template.id} className="flex items-start space-x-2">
                  <RadioGroupItem value={template.id} id={template.id} className="mt-1" />
                  <Label htmlFor={template.id} className="cursor-pointer">
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm text-muted-foreground">{template.description}</div>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
            <Button onClick={() => setStep(4)}>Próximo</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-medium">Resumo da Configuração</h4>
            <div className="text-sm space-y-1">
              <p><strong>Projeto:</strong> {reporteiClients.find(c => c.id === selectedClient)?.name}</p>
              <p><strong>Canais:</strong> {selectedChannels.length} selecionados</p>
              <p><strong>Template:</strong> {TEMPLATES.find(t => t.id === selectedTemplate)?.name}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep(3)}>Voltar</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Configuração
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
