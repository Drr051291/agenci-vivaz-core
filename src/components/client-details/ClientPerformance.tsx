import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, ExternalLink, Copy, ListTodo, ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ClientPerformanceProps {
  clientId: string;
}

interface PerformanceEntry {
  id: string;
  entry_type: string;
  period_start: string | null;
  period_end: string | null;
  channel: string | null;
  summary: {
    bottleneck?: string;
    gaps?: { stage: string; gap: number }[];
    confidence_score?: number;
    key_rates?: Record<string, number>;
  };
  diagnostic_id: string | null;
  created_at: string;
}

const entryTypeLabels: Record<string, string> = {
  inside_sales_matrix: 'Inside Sales',
  ecommerce_matrix: 'E-commerce',
};

const channelLabels: Record<string, string> = {
  landing_page: 'Landing Page',
  lead_nativo: 'Lead Nativo',
  whatsapp: 'WhatsApp',
};

export function ClientPerformance({ clientId }: ClientPerformanceProps) {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<PerformanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadEntries();
  }, [clientId]);

  async function loadEntries() {
    try {
      const { data, error } = await supabase
        .from('client_performance_entries')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries((data || []) as PerformanceEntry[]);
    } catch (error: any) {
      toast.error('Erro ao carregar análises');
    } finally {
      setLoading(false);
    }
  }

  function formatPeriod(start: string | null, end: string | null): string {
    if (!start && !end) return 'Sem período';
    if (!start) return `até ${format(new Date(end!), 'dd/MM/yyyy', { locale: ptBR })}`;
    if (!end) return `desde ${format(new Date(start), 'dd/MM/yyyy', { locale: ptBR })}`;
    return `${format(new Date(start), 'dd/MM', { locale: ptBR })} - ${format(new Date(end), 'dd/MM/yyyy', { locale: ptBR })}`;
  }

  function getConfidenceColor(score?: number): string {
    if (!score) return 'bg-muted text-muted-foreground';
    if (score >= 80) return 'bg-green-500/10 text-green-600 border-green-500/20';
    if (score >= 50) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    return 'bg-red-500/10 text-red-600 border-red-500/20';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Performance</h2>
          <p className="text-sm text-muted-foreground">Análises de funil e diagnósticos salvos</p>
        </div>
        <Button 
          onClick={() => navigate('/ferramentas/matriz-inside-sales')}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova análise
        </Button>
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-lg mb-1">Nenhuma análise salva</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              Use a Matriz de Performance — Inside Sales em Ferramentas para criar sua primeira análise.
            </p>
            <Button 
              variant="outline" 
              onClick={() => navigate('/ferramentas/matriz-inside-sales')}
            >
              Ir para Ferramentas
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Entries list */}
      {entries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Análises recentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Confiança</TableHead>
                  <TableHead>Gargalo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id} className="group">
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {entryTypeLabels[entry.entry_type] || entry.entry_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatPeriod(entry.period_start, entry.period_end)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.channel ? (channelLabels[entry.channel] || entry.channel) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", getConfidenceColor(entry.summary?.confidence_score))}
                      >
                        {entry.summary?.confidence_score ? `${entry.summary.confidence_score}%` : '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">
                      {entry.summary?.bottleneck || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                        >
                          <ChevronDown className={cn(
                            "h-3 w-3 mr-1 transition-transform",
                            expandedId === entry.id && "rotate-180"
                          )} />
                          Detalhes
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={() => toast.info('Duplicar análise em breve')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Expanded details */}
      {expandedId && entries.find(e => e.id === expandedId) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Detalhes da análise</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const entry = entries.find(e => e.id === expandedId)!;
              return (
                <div className="space-y-4">
                  {/* Gaps */}
                  {entry.summary?.gaps && entry.summary.gaps.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                        Maiores gaps
                      </p>
                      <div className="space-y-1">
                        {entry.summary.gaps.slice(0, 3).map((gap, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span>{gap.stage}</span>
                            <Badge variant="outline" className="text-destructive border-destructive/30">
                              {gap.gap > 0 ? '+' : ''}{gap.gap.toFixed(1)}pp
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key rates */}
                  {entry.summary?.key_rates && Object.keys(entry.summary.key_rates).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                        Taxas principais
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(entry.summary.key_rates).slice(0, 4).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-sm bg-muted/30 rounded px-2 py-1">
                            <span className="text-muted-foreground truncate">{key}</span>
                            <span className="font-medium">{typeof value === 'number' ? `${value.toFixed(1)}%` : value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/ferramentas/matriz-inside-sales')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Abrir análise
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toast.info('Plano de ação em breve')}
                    >
                      <ListTodo className="h-3 w-3 mr-1" />
                      Ver plano
                    </Button>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}