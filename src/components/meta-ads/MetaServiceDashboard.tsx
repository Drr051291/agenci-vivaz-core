import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RefreshCw, Settings, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMetaAdsByService, getPeriodRange, type PeriodPreset, type DateRange, type ServiceFilter } from "./useMetaAdsByService";
import { MetaServiceKPIStrip } from "./MetaServiceKPIStrip";
import { MetaServiceTrendChart } from "./MetaServiceTrendChart";
import { MetaServiceCampaignTable } from "./MetaServiceCampaignTable";
import { MetaSettingsPanel } from "./MetaSettingsPanel";

const SERVICE_LABELS: Record<ServiceFilter, string> = {
  brandspot: 'Brandspot',
  '3d_cgi': '3D/CGI',
};

const SERVICE_DESCRIPTIONS: Record<ServiceFilter, string> = {
  brandspot: 'Campanhas com identificação [Brandspot]',
  '3d_cgi': 'Campanhas com identificação [Sétima] / 3D / CGI',
};

interface Props {
  clientId: string;
  service: ServiceFilter;
  isAdmin: boolean;
  onBack: () => void;
}

const PRESET_LABELS: Record<PeriodPreset, string> = {
  thisMonth: 'Este mês',
  lastMonth: 'Mês anterior',
  last7: 'Últimos 7 dias',
  last30: 'Últimos 30 dias',
  last90: 'Últimos 90 dias',
};

export function MetaServiceDashboard({ clientId, service, isAdmin, onBack }: Props) {
  const [preset, setPreset] = useState<PeriodPreset>('thisMonth');
  const [showComparison, setShowComparison] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const dateRange: DateRange = getPeriodRange(preset);

  const {
    connection, campaignRows, dailyRows, creativeRows,
    kpis, prevKpis, loading, syncing, error, refetch, syncNow,
  } = useMetaAdsByService(clientId, service, dateRange, showComparison);

  const noConnection = !connection && !loading;
  const hasError = connection?.status === 'error' || (error && !loading);

  const fromFmt = format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR });
  const toFmt = format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Dashboards
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">Meta Ads · {SERVICE_LABELS[service]}</h2>
              <Badge variant="secondary" className="text-xs">Proprietário</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {SERVICE_DESCRIPTIONS[service]} · {fromFmt} — {toFmt}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={preset} onValueChange={v => setPreset(v as PeriodPreset)}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(PRESET_LABELS) as [PeriodPreset, string][]).map(([k, l]) => (
                <SelectItem key={k} value={k} className="text-xs">{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            <Switch id={`compare-${service}`} checked={showComparison} onCheckedChange={setShowComparison} className="h-4 w-8" />
            <Label htmlFor={`compare-${service}`} className="text-xs cursor-pointer">Comparar</Label>
          </div>

          {isAdmin && (
            <Button variant="outline" size="sm" className="h-8 text-xs" disabled={syncing} onClick={() => syncNow()}>
              {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Sincronizar
            </Button>
          )}

          {isAdmin && (
            <Button
              variant={showSettings ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowSettings(s => !s)}
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Configurações
            </Button>
          )}
        </div>
      </div>

      {/* Last sync info */}
      {connection?.last_sync_at && (
        <p className="text-xs text-muted-foreground">
          Última atualização: {format(new Date(connection.last_sync_at), "HH:mm '·' dd/MM/yyyy", { locale: ptBR })}
        </p>
      )}

      {/* Settings panel */}
      {showSettings && isAdmin && (
        <MetaSettingsPanel
          clientId={clientId}
          connection={connection}
          onSaved={refetch}
          syncNow={syncNow}
          syncing={syncing}
          dateFrom={format(dateRange.from, 'yyyy-MM-dd')}
          dateTo={format(dateRange.to, 'yyyy-MM-dd')}
        />
      )}

      {/* Error state */}
      {hasError && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Erro na integração Meta Ads</p>
              <p className="text-xs text-muted-foreground mt-1">
                {connection?.last_error || error || 'Verifique as configurações e tente sincronizar novamente.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No connection CTA */}
      {noConnection && !showSettings && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Settings className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold mb-1">Meta Ads não configurado</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Configure a conta de anúncios para visualizar as métricas de {SERVICE_LABELS[service]}.
              </p>
            </div>
            {isAdmin ? (
              <Button onClick={() => setShowSettings(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Configurar Meta Ads
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Solicite ao administrador para configurar a integração.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dashboard content */}
      {!noConnection && !showSettings && (
        <>
          <MetaServiceKPIStrip kpis={kpis} prevKpis={prevKpis} loading={loading} showComparison={showComparison} />
          <MetaServiceTrendChart rows={dailyRows} loading={loading} />
          <MetaServiceCampaignTable campaignRows={campaignRows} creativeRows={creativeRows} loading={loading} />
        </>
      )}
    </div>
  );
}
