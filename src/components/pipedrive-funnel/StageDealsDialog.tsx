import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, User, Calendar, Building2, Tag, Megaphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StageInfo, ViewMode, PIPEDRIVE_DOMAIN, LeadSource } from './types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Deal {
  id: number;
  title: string;
  person_name?: string;
  org_name?: string;
  add_time?: string;
  status?: string;
  value?: number;
  lead_source?: LeadSource;
  campaign?: string | null;
  adset?: string | null;
  creative?: string | null;
}

interface StageDealsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: StageInfo | null;
  pipelineId: number;
  viewMode: ViewMode;
  dateRange?: { start: Date; end: Date };
}

// Check if stage is MQL or later (order_nr >= 2)
function isMQLOrLater(stage: StageInfo | null): boolean {
  if (!stage) return false;
  const stageName = stage.name.toLowerCase();
  // MQL is typically the second stage (order_nr = 2), but check by name to be safe
  return stageName.includes('mql') || 
         stageName.includes('sql') || 
         stageName.includes('oportunidade') || 
         stageName.includes('contrato') ||
         stageName.includes('negociação') ||
         stage.order_nr >= 2;
}

// Colors for lead source badges
const SOURCE_COLORS: Record<LeadSource, string> = {
  'Landing Page': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Base Sétima': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Lead Nativo': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export function StageDealsDialog({
  open,
  onOpenChange,
  stage,
  pipelineId,
  viewMode,
  dateRange,
}: StageDealsDialogProps) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showEnrichedData = isMQLOrLater(stage);

  useEffect(() => {
    if (open && stage) {
      fetchDeals();
    }
  }, [open, stage, pipelineId, viewMode, dateRange]);

  const fetchDeals = async () => {
    if (!stage) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('pipedrive-proxy', {
        body: {
          action: 'get_stage_deals',
          pipeline_id: pipelineId,
          stage_id: stage.id,
          view_mode: viewMode,
          start_date: dateRange?.start ? format(dateRange.start, 'yyyy-MM-dd') : undefined,
          end_date: dateRange?.end ? format(dateRange.end, 'yyyy-MM-dd') : undefined,
        },
      });

      if (fnError) throw fnError;
      
      if (data?.success && data?.data) {
        setDeals(data.data);
      } else {
        throw new Error(data?.error || 'Erro ao buscar negócios');
      }
    } catch (e) {
      console.error('Error fetching stage deals:', e);
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const pipedriveUrl = (dealId: number) => 
    `https://${PIPEDRIVE_DOMAIN}.pipedrive.com/deal/${dealId}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{stage?.name || 'Etapa'}</span>
            {deals.length > 0 && !loading && (
              <Badge variant="secondary" className="ml-2">
                {deals.length} negócio{deals.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {viewMode === 'period' 
              ? 'Negócios que chegaram nesta etapa no período' 
              : 'Negócios atualmente nesta etapa'}
          </p>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Skeleton className="h-4 w-4" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">{error}</p>
            </div>
          ) : deals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhum negócio nesta etapa</p>
            </div>
          ) : (
            <div className="space-y-2">
              {deals.map((deal) => (
                <a
                  key={deal.id}
                  href={pipedriveUrl(deal.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  {/* Title row */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {deal.title}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                      
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {deal.person_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {deal.person_name}
                          </span>
                        )}
                        {deal.org_name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {deal.org_name}
                          </span>
                        )}
                        {deal.add_time && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(deal.add_time), "dd/MM/yy", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {deal.value !== undefined && deal.value > 0 && (
                      <Badge variant="outline" className="flex-shrink-0">
                        R$ {deal.value.toLocaleString('pt-BR')}
                      </Badge>
                    )}
                  </div>

                  {/* Enriched data row - only for MQL+ stages */}
                  {showEnrichedData && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-dashed">
                      {/* Lead Source Badge */}
                      {deal.lead_source && (
                        <Badge 
                          variant="secondary" 
                          className={`text-[10px] px-1.5 py-0 ${SOURCE_COLORS[deal.lead_source] || ''}`}
                        >
                          <Tag className="h-2.5 w-2.5 mr-1" />
                          {deal.lead_source}
                        </Badge>
                      )}

                      {/* Creative/Ad info */}
                      {deal.creative && (
                        <Badge 
                          variant="outline" 
                          className="text-[10px] px-1.5 py-0 max-w-[200px] truncate"
                          title={deal.creative}
                        >
                          <Megaphone className="h-2.5 w-2.5 mr-1 flex-shrink-0" />
                          <span className="truncate">{deal.creative}</span>
                        </Badge>
                      )}

                      {/* Fallback: Show campaign if no creative */}
                      {!deal.creative && deal.campaign && (
                        <Badge 
                          variant="outline" 
                          className="text-[10px] px-1.5 py-0 max-w-[200px] truncate"
                          title={deal.campaign}
                        >
                          <Megaphone className="h-2.5 w-2.5 mr-1 flex-shrink-0" />
                          <span className="truncate">{deal.campaign}</span>
                        </Badge>
                      )}

                      {/* No tracking info */}
                      {!deal.creative && !deal.campaign && (
                        <span className="text-[10px] text-muted-foreground italic">
                          Sem rastreamento
                        </span>
                      )}
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
