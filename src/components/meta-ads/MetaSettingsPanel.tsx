import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Play, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import type { MetaConnection } from "./useMetaAds";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  clientId: string;
  connection: MetaConnection | null;
  onSaved: () => void;
  syncNow: (adAccountId?: string) => Promise<void>;
  syncing: boolean;
  dateFrom: string;
  dateTo: string;
}

export function MetaSettingsPanel({ clientId, connection, onSaved, syncNow, syncing, dateFrom, dateTo }: Props) {
  const [adAccountId, setAdAccountId] = useState(connection?.ad_account_id || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAdAccountId(connection?.ad_account_id || '');
  }, [connection]);

  const handleSave = async () => {
    if (!adAccountId.trim()) {
      toast.error('Informe o ID da conta de anúncios');
      return;
    }
    setSaving(true);
    try {
      const normalized = adAccountId.trim().startsWith('act_') ? adAccountId.trim() : `act_${adAccountId.trim()}`;
      const { error } = await supabase
        .from('meta_connections')
        .upsert({
          client_id: clientId,
          ad_account_id: normalized,
          token_source: 'lovable_secret',
          status: 'active',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'client_id' });
      if (error) throw error;
      toast.success('Configuração salva com sucesso!');
      onSaved();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    const acc = adAccountId.trim() || connection?.ad_account_id;
    if (!acc) {
      toast.error('Configure o ID da conta antes de sincronizar.');
      return;
    }
    await syncNow(acc);
    toast.success('Sincronização concluída!');
    onSaved();
  };

  const statusColor = connection?.status === 'active' ? 'bg-green-500/10 text-green-700 border-green-500/20'
    : connection?.status === 'error' ? 'bg-red-500/10 text-red-700 border-red-500/20'
    : connection?.status === 'needs_attention' ? 'bg-amber-500/10 text-amber-700 border-amber-500/20'
    : 'bg-muted text-muted-foreground border-border';

  const statusLabel = connection?.status === 'active' ? 'Ativo' : connection?.status === 'error' ? 'Erro' : connection?.status === 'needs_attention' ? 'Atenção' : 'Não configurado';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configurações do Meta Ads</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          {connection && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
              {connection.status === 'active' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status da conexão</span>
                  <Badge variant="outline" className={statusColor}>{statusLabel}</Badge>
                </div>
                {connection.last_sync_at && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Última sync: {format(new Date(connection.last_sync_at), "HH:mm '·' dd/MM/yyyy", { locale: ptBR })}
                  </p>
                )}
                {connection.last_error && (
                  <p className="text-xs text-red-500 mt-1">{connection.last_error}</p>
                )}
              </div>
            </div>
          )}

          {/* Ad account ID */}
          <div className="space-y-1.5">
            <Label htmlFor="ad-account">ID da Conta de Anúncios</Label>
            <Input
              id="ad-account"
              placeholder="act_123456789"
              value={adAccountId}
              onChange={e => setAdAccountId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Formato: act_XXXXXXXXX (encontre em Gerenciador de Anúncios → configurações da conta)</p>
          </div>

          {/* Token info */}
          <div className="flex gap-2 p-3 rounded-lg border border-dashed bg-muted/30">
            <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              O token de acesso é lido do secret <strong>META_ACCESS_TOKEN</strong> configurado no Lovable Cloud. Certifique-se que o System User tem permissão de leitura (<code>ads_read</code>, <code>read_insights</code>) na conta de anúncios.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
            <Button variant="outline" onClick={handleSync} disabled={syncing} className="flex-1">
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Sincronizar agora
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Permissions checklist */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Permissões necessárias</p>
          <ul className="space-y-1.5 text-sm">
            {['ads_read — leitura de anúncios', 'read_insights — leitura de métricas de insights', 'business_management — acesso à conta de negócios (opcional)'].map(p => (
              <li key={p} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">{p}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
