import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, RefreshCw, Settings, TrendingUp, DollarSign, MousePointer, Eye, Target, Users, Loader2, ExternalLink, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdAccountsConfig } from "./AdAccountsConfig";

interface VivazDashboardProps {
  clientId: string;
  clientName?: string;
}

interface VivazConfig {
  id: string;
  webhook_token: string;
  is_active: boolean;
  meta_ad_account_id?: string | null;
  google_ads_account_id?: string | null;
  ga4_property_id?: string | null;
}

interface VivazMetric {
  id: string;
  channel: string;
  metric_date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  reach: number;
  ctr: number;
  cpc: number;
}

const CHANNEL_COLORS: Record<string, string> = {
  meta_ads: "#1877F2",
  google_ads: "#4285F4",
  ga4: "#E37400",
  tiktok_ads: "#000000",
  linkedin_ads: "#0A66C2",
};

const CHANNEL_LABELS: Record<string, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  ga4: "Google Analytics 4",
  tiktok_ads: "TikTok Ads",
  linkedin_ads: "LinkedIn Ads",
};

export function VivazDashboard({ clientId, clientName }: VivazDashboardProps) {
  const [config, setConfig] = useState<VivazConfig | null>(null);
  const [metrics, setMetrics] = useState<VivazMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [period, setPeriod] = useState("30");
  const [selectedChannel, setSelectedChannel] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vivaz-webhook`;

  useEffect(() => {
    fetchConfig();
  }, [clientId]);

  useEffect(() => {
    if (config) {
      fetchMetrics();
    }
  }, [config, period, selectedChannel]);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('vivaz_dashboard_config')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
      setConfig(data);
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    if (!config) return;
    
    setLoadingMetrics(true);
    try {
      const startDate = format(subDays(new Date(), parseInt(period)), 'yyyy-MM-dd');
      
      let query = supabase
        .from('vivaz_metrics')
        .select('*')
        .eq('client_id', clientId)
        .gte('metric_date', startDate)
        .order('metric_date', { ascending: true });

      if (selectedChannel !== 'all') {
        query = query.eq('channel', selectedChannel);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMetrics(data || []);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast.error('Erro ao carregar métricas');
    } finally {
      setLoadingMetrics(false);
    }
  };

  const createConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('vivaz_dashboard_config')
        .insert({ client_id: clientId })
        .select()
        .single();

      if (error) throw error;
      setConfig(data);
      toast.success('Webhook configurado com sucesso!');
    } catch (error) {
      console.error('Error creating config:', error);
      toast.error('Erro ao configurar webhook');
    }
  };

  const regenerateToken = async () => {
    if (!config) return;
    
    try {
      const { data, error } = await supabase
        .from('vivaz_dashboard_config')
        .update({ webhook_token: crypto.randomUUID() })
        .eq('id', config.id)
        .select()
        .single();

      if (error) throw error;
      setConfig(data);
      toast.success('Token regenerado com sucesso!');
    } catch (error) {
      console.error('Error regenerating token:', error);
      toast.error('Erro ao regenerar token');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const getUniqueChannels = () => {
    const channels = [...new Set(metrics.map(m => m.channel))];
    return channels;
  };

  const getTotals = () => {
    return metrics.reduce((acc, m) => ({
      impressions: acc.impressions + (m.impressions || 0),
      clicks: acc.clicks + (m.clicks || 0),
      conversions: acc.conversions + (m.conversions || 0),
      cost: acc.cost + (m.cost || 0),
      reach: acc.reach + (m.reach || 0),
    }), { impressions: 0, clicks: 0, conversions: 0, cost: 0, reach: 0 });
  };

  const getChartData = () => {
    const dataByDate: Record<string, any> = {};
    
    metrics.forEach(m => {
      const date = m.metric_date;
      if (!dataByDate[date]) {
        dataByDate[date] = { date, displayDate: format(parseISO(date), 'dd/MM', { locale: ptBR }) };
      }
      
      const channel = m.channel;
      dataByDate[date][`${channel}_impressions`] = (dataByDate[date][`${channel}_impressions`] || 0) + m.impressions;
      dataByDate[date][`${channel}_clicks`] = (dataByDate[date][`${channel}_clicks`] || 0) + m.clicks;
      dataByDate[date][`${channel}_cost`] = (dataByDate[date][`${channel}_cost`] || 0) + m.cost;
      dataByDate[date][`${channel}_conversions`] = (dataByDate[date][`${channel}_conversions`] || 0) + m.conversions;
      
      // Totals
      dataByDate[date].total_impressions = (dataByDate[date].total_impressions || 0) + m.impressions;
      dataByDate[date].total_clicks = (dataByDate[date].total_clicks || 0) + m.clicks;
      dataByDate[date].total_cost = (dataByDate[date].total_cost || 0) + m.cost;
      dataByDate[date].total_conversions = (dataByDate[date].total_conversions || 0) + m.conversions;
    });

    return Object.values(dataByDate).sort((a, b) => a.date.localeCompare(b.date));
  };

  const getChannelDistribution = () => {
    const distribution: Record<string, number> = {};
    
    metrics.forEach(m => {
      distribution[m.channel] = (distribution[m.channel] || 0) + m.cost;
    });

    return Object.entries(distribution).map(([channel, value]) => ({
      name: CHANNEL_LABELS[channel] || channel,
      value,
      color: CHANNEL_COLORS[channel] || '#8884d8',
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Dashboard Vivaz
          </CardTitle>
          <CardDescription>
            Configure o webhook para receber métricas do Make.com
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Nenhum webhook configurado para este cliente.
            </p>
            <Button onClick={createConfig}>
              <Settings className="h-4 w-4 mr-2" />
              Configurar Webhook
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totals = getTotals();
  const chartData = getChartData();
  const channels = getUniqueChannels();

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="charts">Gráficos</TabsTrigger>
            <TabsTrigger value="config">Configuração</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="14">Últimos 14 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="60">Últimos 60 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os canais</SelectItem>
                {channels.map(channel => (
                  <SelectItem key={channel} value={channel}>
                    {CHANNEL_LABELS[channel] || channel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={fetchMetrics} disabled={loadingMetrics}>
              <RefreshCw className={`h-4 w-4 ${loadingMetrics ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Eye className="h-4 w-4" />
                  Impressões
                </div>
                <p className="text-2xl font-bold">{totals.impressions.toLocaleString('pt-BR')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <MousePointer className="h-4 w-4" />
                  Cliques
                </div>
                <p className="text-2xl font-bold">{totals.clicks.toLocaleString('pt-BR')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Target className="h-4 w-4" />
                  Conversões
                </div>
                <p className="text-2xl font-bold">{totals.conversions.toLocaleString('pt-BR')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <DollarSign className="h-4 w-4" />
                  Investimento
                </div>
                <p className="text-2xl font-bold">{totals.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Users className="h-4 w-4" />
                  Alcance
                </div>
                <p className="text-2xl font-bold">{totals.reach.toLocaleString('pt-BR')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Evolution Chart */}
          {chartData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Evolução de Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="total_clicks" 
                      stroke="hsl(var(--primary))" 
                      name="Cliques"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total_conversions" 
                      stroke="#10B981" 
                      name="Conversões"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma métrica recebida ainda. Configure o Make.com para enviar dados via webhook.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="charts" className="space-y-6">
          {chartData.length > 0 ? (
            <>
              {/* Investment by Channel */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Investimento por Canal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={getChannelDistribution()}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {getChannelDistribution().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Investimento Diário</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="total_cost" fill="hsl(var(--primary))" name="Investimento" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Impressions Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Impressões e Alcance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="total_impressions" 
                        stroke="#8B5CF6" 
                        name="Impressões"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma métrica para exibir gráficos. Aguardando dados do Make.com.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuração do Webhook
              </CardTitle>
              <CardDescription>
                Use estas informações para configurar seu cenário no Make.com
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">URL do Webhook</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono break-all">
                    {webhookUrl}
                  </code>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl, 'URL')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Token de Autenticação</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono break-all">
                    {config.webhook_token}
                  </code>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(config.webhook_token, 'Token')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={regenerateToken}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant={config.is_active ? "default" : "secondary"}>
                    {config.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>

              <AdAccountsConfig config={config} onUpdate={setConfig} />

              <div className="border-t pt-6">
                <h4 className="font-medium mb-3">Formato do JSON esperado</h4>
                <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
{`{
  "token": "${config.webhook_token}",
  "channel": "meta_ads",
  "date": "2025-01-15",
  "metrics": {
    "impressions": 15000,
    "clicks": 450,
    "conversions": 23,
    "cost": 850.50,
    "reach": 12000
  }
}`}
                </pre>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-3">Canais suportados</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CHANNEL_LABELS).map(([key, label]) => (
                    <Badge key={key} variant="outline" style={{ borderColor: CHANNEL_COLORS[key] }}>
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-3">Instruções para o Make.com</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Crie um novo cenário no Make.com</li>
                  <li>Adicione um módulo de conexão com Meta Ads, Google Ads ou GA4</li>
                  <li>Configure para buscar métricas diárias</li>
                  <li>Adicione um módulo HTTP - Make a request</li>
                  <li>Configure como POST para a URL acima</li>
                  <li>Envie o JSON no formato especificado</li>
                  <li>Agende para executar diariamente</li>
                </ol>
              </div>

              <Button variant="outline" asChild>
                <a href="https://www.make.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Make.com
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
