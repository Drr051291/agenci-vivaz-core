import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

interface AdAccountsConfigProps {
  config: {
    id: string;
    meta_ad_account_id?: string | null;
    google_ads_account_id?: string | null;
    ga4_property_id?: string | null;
  };
  onUpdate: (config: any) => void;
}

export function AdAccountsConfig({ config, onUpdate }: AdAccountsConfigProps) {
  const [metaAdAccountId, setMetaAdAccountId] = useState(config.meta_ad_account_id || "");
  const [googleAdsAccountId, setGoogleAdsAccountId] = useState(config.google_ads_account_id || "");
  const [ga4PropertyId, setGa4PropertyId] = useState(config.ga4_property_id || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('vivaz_dashboard_config')
        .update({
          meta_ad_account_id: metaAdAccountId || null,
          google_ads_account_id: googleAdsAccountId || null,
          ga4_property_id: ga4PropertyId || null,
        })
        .eq('id', config.id)
        .select()
        .single();

      if (error) throw error;
      onUpdate(data);
      toast.success('Contas de anúncios salvas!');
    } catch (error) {
      console.error('Error saving ad accounts:', error);
      toast.error('Erro ao salvar contas');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-medium">IDs das Contas de Anúncios</h4>
          <p className="text-sm text-muted-foreground">
            Configure os IDs para que o Make busque métricas automaticamente
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="meta_account">Meta Ads Account ID</Label>
          <Input
            id="meta_account"
            placeholder="act_123456789"
            value={metaAdAccountId}
            onChange={(e) => setMetaAdAccountId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Formato: act_XXXXXXXXX
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="google_ads_account">Google Ads Account ID</Label>
          <Input
            id="google_ads_account"
            placeholder="123-456-7890"
            value={googleAdsAccountId}
            onChange={(e) => setGoogleAdsAccountId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Formato: XXX-XXX-XXXX
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ga4_property">GA4 Property ID</Label>
          <Input
            id="ga4_property"
            placeholder="123456789"
            value={ga4PropertyId}
            onChange={(e) => setGa4PropertyId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            ID numérico da propriedade
          </p>
        </div>
      </div>
    </div>
  );
}
