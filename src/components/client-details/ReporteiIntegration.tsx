import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Link2, Unlink, RefreshCw, Database, Calendar, Check, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReporteiIntegrationProps {
  clientId: string;
  clientName: string;
}

interface ReporteiClient {
  id: string | number;
  name: string;
}

interface ReporteiLink {
  id: string;
  reportei_client_id: string;
  reportei_client_name: string;
  created_at: string;
  updated_at: string;
  reportei_integrations: {
    id: string;
    channel_type: string;
    channel_name: string;
    is_active: boolean;
  }[];
}

export function ReporteiIntegration({ clientId, clientName }: ReporteiIntegrationProps) {
  const queryClient = useQueryClient();
  const [selectedReporteiClient, setSelectedReporteiClient] = useState<string>('');

  // Fetch linked Reportei client
  const { data: linkedClient, isLoading: isLoadingLink } = useQuery({
    queryKey: ['reportei-link', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('reportei-sync', {
        body: { action: 'getLinkedClient', clientId },
      });
      if (error) throw error;
      return data as { success: boolean; data: ReporteiLink | null; isLinked: boolean };
    },
  });

  // Fetch available Reportei clients
  const { data: reporteiClients, isLoading: isLoadingClients } = useQuery({
    queryKey: ['reportei-clients'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('reportei-sync', {
        body: { action: 'listReporteiClients' },
      });
      if (error) throw error;
      return (data?.data || []) as ReporteiClient[];
    },
    enabled: !linkedClient?.isLinked,
  });

  // Link client mutation
  const linkMutation = useMutation({
    mutationFn: async (reporteiClientId: string) => {
      const selectedClient = reporteiClients?.find(c => c.id.toString() === reporteiClientId);
      if (!selectedClient) throw new Error('Cliente Reportei não encontrado');

      const { data, error } = await supabase.functions.invoke('reportei-sync', {
        body: {
          action: 'linkClient',
          hubClientId: clientId,
          reporteiClientId: reporteiClientId,
          reporteiClientName: selectedClient.name,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Cliente vinculado ao Reportei com sucesso');
      queryClient.invalidateQueries({ queryKey: ['reportei-link', clientId] });
      setSelectedReporteiClient('');
    },
    onError: (error) => {
      toast.error(`Erro ao vincular: ${error.message}`);
    },
  });

  // Unlink client mutation
  const unlinkMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('reportei-sync', {
        body: { action: 'unlinkClient', clientId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Vínculo removido com sucesso');
      queryClient.invalidateQueries({ queryKey: ['reportei-link', clientId] });
    },
    onError: (error) => {
      toast.error(`Erro ao desvincular: ${error.message}`);
    },
  });

  // Sync metrics mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data, error } = await supabase.functions.invoke('reportei-sync', {
        body: { action: 'syncMetrics', clientId, startDate, endDate },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data.metricsCount} métricas sincronizadas`);
      queryClient.invalidateQueries({ queryKey: ['reportei-metrics', clientId] });
    },
    onError: (error) => {
      toast.error(`Erro ao sincronizar: ${error.message}`);
    },
  });

  if (isLoadingLink) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5" />
              Integração Reportei
            </CardTitle>
            <CardDescription>
              Vincule este cliente a uma conta do Reportei para sincronizar métricas
            </CardDescription>
          </div>
          {linkedClient?.isLinked && (
            <Badge variant="default" className="bg-green-500">
              <Check className="h-3 w-3 mr-1" />
              Vinculado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {linkedClient?.isLinked && linkedClient.data ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">{linkedClient.data.reportei_client_name}</p>
                <p className="text-sm text-muted-foreground">
                  ID: {linkedClient.data.reportei_client_id}
                </p>
                <p className="text-xs text-muted-foreground">
                  Vinculado em {format(new Date(linkedClient.data.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => unlinkMutation.mutate()}
                disabled={unlinkMutation.isPending}
              >
                {unlinkMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4" />
                )}
              </Button>
            </div>

            {linkedClient.data.reportei_integrations && linkedClient.data.reportei_integrations.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Canais vinculados:</p>
                <div className="flex flex-wrap gap-2">
                  {linkedClient.data.reportei_integrations.map((integration) => (
                    <Badge key={integration.id} variant="secondary">
                      {integration.channel_name || integration.channel_type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="w-full"
            >
              {syncMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sincronizar Métricas (últimos 30 dias)
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Select
                value={selectedReporteiClient}
                onValueChange={setSelectedReporteiClient}
                disabled={isLoadingClients}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={isLoadingClients ? "Carregando..." : "Selecione um cliente do Reportei"} />
                </SelectTrigger>
                <SelectContent>
                  {reporteiClients?.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={() => linkMutation.mutate(selectedReporteiClient)}
                disabled={!selectedReporteiClient || linkMutation.isPending}
              >
                {linkMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Vincule "{clientName}" a um cliente existente no Reportei para habilitar a sincronização de métricas e análise IA.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
