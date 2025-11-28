import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClientCrmIntegrationProps {
  clientId: string;
}

export const ClientCrmIntegration = ({ clientId }: ClientCrmIntegrationProps) => {
  const [loading, setLoading] = useState(false);
  const [hasIntegration, setHasIntegration] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [domain, setDomain] = useState("api.pipedrive.com");
  const { toast } = useToast();

  useEffect(() => {
    checkExistingIntegration();
  }, [clientId]);

  const checkExistingIntegration = async () => {
    try {
      const { data, error } = await supabase
        .from("crm_integrations")
        .select("*")
        .eq("client_id", clientId)
        .eq("crm_type", "pipedrive")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setHasIntegration(true);
        setDomain(data.domain || "api.pipedrive.com");
      }
    } catch (error) {
      console.error("Erro ao verificar integração:", error);
    }
  };

  const handleSaveIntegration = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira a chave API do Pipedrive.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Verificar se já existe integração
      const { data: existing } = await supabase
        .from("crm_integrations")
        .select("id")
        .eq("client_id", clientId)
        .eq("crm_type", "pipedrive")
        .maybeSingle();

      if (existing) {
        // Atualizar integração existente
        const { error } = await supabase
          .from("crm_integrations")
          .update({
            api_key_encrypted: apiKey,
            domain: domain,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Criar nova integração
        const { error } = await supabase
          .from("crm_integrations")
          .insert({
            client_id: clientId,
            crm_type: "pipedrive",
            api_key_encrypted: apiKey,
            domain: domain,
            is_active: true,
          });

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Integração com Pipedrive configurada com sucesso!",
      });

      setHasIntegration(true);
      setApiKey("");
      checkExistingIntegration();
    } catch (error) {
      console.error("Erro ao salvar integração:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a integração.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveIntegration = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from("crm_integrations")
        .delete()
        .eq("client_id", clientId)
        .eq("crm_type", "pipedrive");

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Integração com Pipedrive removida.",
      });

      setHasIntegration(false);
      setApiKey("");
      setDomain("api.pipedrive.com");
    } catch (error) {
      console.error("Erro ao remover integração:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a integração.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Integração Pipedrive</CardTitle>
              <CardDescription>
                Configure a conexão com a conta Pipedrive deste cliente
              </CardDescription>
            </div>
          </div>
          {hasIntegration && (
            <Badge variant="default" className="gap-1">
              <Check className="h-3 w-3" />
              Ativa
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-key">Chave API do Pipedrive</Label>
          <Input
            id="api-key"
            type="password"
            placeholder="Insira a chave API do Pipedrive"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="domain">Domínio (opcional)</Label>
          <Input
            id="domain"
            type="text"
            placeholder="api.pipedrive.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSaveIntegration} disabled={loading}>
            {hasIntegration ? "Atualizar Integração" : "Salvar Integração"}
          </Button>

          {hasIntegration && (
            <Button
              variant="destructive"
              onClick={handleRemoveIntegration}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Remover
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
