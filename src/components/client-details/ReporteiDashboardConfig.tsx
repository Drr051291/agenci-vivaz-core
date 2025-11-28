import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Facebook, Instagram, Linkedin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReporteiClient {
  id: string;
  name: string;
}

interface Integration {
  id: string | number;
  source_name?: string;
  integration_name?: string;
  full_name?: string;
  type?: string | number;
}

interface Widget {
  id: string | number;
  name: string;
  description?: string;
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
  const [selectedChannel, setSelectedChannel] = useState<string>(currentConfig?.selected_channel || "");
  const [availableWidgets, setAvailableWidgets] = useState<Widget[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(
    Array.isArray(currentConfig?.selected_metrics) ? currentConfig.selected_metrics : []
  );

  useEffect(() => {
    fetchReporteiClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchIntegrations();
    }
  }, [selectedClient]);

  useEffect(() => {
    if (selectedChannel) {
      fetchWidgets();
    }
  }, [selectedChannel]);

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

  const fetchWidgets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reportei-data', {
        body: { 
          action: 'getWidgets',
          integrationId: selectedChannel
        }
      });

      if (error) throw error;
      
      console.log('Widgets disponíveis:', data.data);
      setAvailableWidgets(data.data || []);
    } catch (error) {
      console.error('Error fetching widgets:', error);
      toast.error('Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const selectedIntegration = integrations.find(int => String(int.id) === selectedChannel);
      
      const config = {
        reportei_client_id: selectedClient,
        selected_channel: selectedChannel,
        selected_metrics: selectedMetrics,
        channel_info: {
          name: selectedIntegration?.integration_name || '',
          account: selectedIntegration?.source_name || '',
          full_name: selectedIntegration?.full_name || ''
        }
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

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId) 
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  const getChannelIcon = (integrationName?: string) => {
    if (!integrationName) return null;
    const name = integrationName.toLowerCase();
    if (name.includes('meta') || name.includes('facebook')) return <Facebook className="h-5 w-5 text-[#1877F2]" />;
    if (name.includes('instagram')) return <Instagram className="h-5 w-5 text-[#E4405F]" />;
    if (name.includes('linkedin')) return <Linkedin className="h-5 w-5 text-[#0A66C2]" />;
    if (name.includes('google')) return <span className="text-xl">🔍</span>;
    if (name.includes('tiktok')) return <span className="text-xl">🎵</span>;
    return <span className="text-xl">📊</span>;
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">
          Configurar Dashboard Reportei - Etapa {step} de 3
        </h3>
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
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
          <Label>Selecione o Canal</Label>
          <RadioGroup value={selectedChannel} onValueChange={setSelectedChannel}>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {integrations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum canal encontrado</p>
              ) : (
                integrations.map((integration) => (
                  <div key={integration.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value={String(integration.id)} id={String(integration.id)} />
                    {getChannelIcon(integration.integration_name)}
                    <Label htmlFor={String(integration.id)} className="cursor-pointer flex-1">
                      <div className="font-medium">{integration.integration_name}</div>
                      <div className="text-sm text-muted-foreground">{integration.source_name}</div>
                    </Label>
                  </div>
                ))
              )}
            </div>
          </RadioGroup>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
            <Button onClick={() => setStep(3)} disabled={!selectedChannel || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Próximo
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <Label className="text-base">
              Métricas disponíveis para {integrations.find(int => String(int.id) === selectedChannel)?.integration_name}
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Selecione as métricas que deseja exibir no dashboard
            </p>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4">
              {availableWidgets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma métrica disponível para este canal
                </p>
              ) : (
                availableWidgets.map((widget) => (
                  <div key={widget.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50">
                    <Checkbox
                      id={String(widget.id)}
                      checked={selectedMetrics.includes(String(widget.id))}
                      onCheckedChange={() => toggleMetric(String(widget.id))}
                    />
                    <Label htmlFor={String(widget.id)} className="cursor-pointer flex-1">
                      <div className="font-medium">{widget.name}</div>
                      {widget.description && (
                        <div className="text-xs text-muted-foreground">{widget.description}</div>
                      )}
                    </Label>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedMetrics.length} métrica{selectedMetrics.length !== 1 ? 's' : ''} selecionada{selectedMetrics.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
              <Button onClick={handleSave} disabled={selectedMetrics.length === 0 || loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Configuração
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
