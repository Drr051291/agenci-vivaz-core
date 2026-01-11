import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  created_at: string;
}

interface InsideSalesDiagnostic {
  id: string;
  period_label: string | null;
  channel: string | null;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  stage_status: Record<string, unknown>;
  created_at: string;
}

const entryTypeLabels: Record<string, string> = {
  inside_sales_matrix: "Inside Sales",
  ecommerce_matrix: "E-commerce",
};

const channelLabels: Record<string, string> = {
  landing_page: "Landing Page",
  lead_nativo: "Lead Nativo",
  whatsapp: "WhatsApp",
};

const ClientPerformance = () => {
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [performanceEntries, setPerformanceEntries] = useState<PerformanceEntry[]>([]);
  const [diagnostics, setDiagnostics] = useState<InsideSalesDiagnostic[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  usePageMeta({
    title: "Performance - Área do Cliente",
    description: "Visualize análises de performance e diagnósticos",
    keywords: "performance, análise, diagnóstico, vivaz",
  });

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      // Verificar se é cliente
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (userRole?.role !== "client") {
        navigate("/dashboard");
        return;
      }

      // Buscar cliente vinculado
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (!client) {
        toast({
          title: "Erro",
          description: "Cliente não encontrado",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setClientId(client.id);

      // Buscar performance entries
      const { data: entries } = await supabase
        .from("client_performance_entries")
        .select("*")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false });

      setPerformanceEntries((entries || []) as PerformanceEntry[]);

      // Buscar diagnósticos de inside sales
      const { data: diags } = await supabase
        .from("inside_sales_diagnostics")
        .select("*")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false });

      setDiagnostics((diags || []) as InsideSalesDiagnostic[]);
      setLoading(false);
    };

    checkAuthAndLoadData();
  }, [navigate, toast]);

  const formatPeriod = (start: string | null, end: string | null): string => {
    if (!start && !end) return "Sem período";
    if (!start) return `até ${format(new Date(end!), "dd/MM/yyyy", { locale: ptBR })}`;
    if (!end) return `desde ${format(new Date(start), "dd/MM/yyyy", { locale: ptBR })}`;
    return `${format(new Date(start), "dd/MM", { locale: ptBR })} - ${format(new Date(end), "dd/MM/yyyy", { locale: ptBR })}`;
  };

  const getConfidenceColor = (score?: number): string => {
    if (!score) return "bg-muted text-muted-foreground";
    if (score >= 80) return "bg-green-500/10 text-green-600 border-green-500/20";
    if (score >= 50) return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    return "bg-red-500/10 text-red-600 border-red-500/20";
  };

  const getGapTrend = (gap: number) => {
    if (gap > 0) return <TrendingDown className="h-3 w-3 text-red-500" />;
    if (gap < 0) return <TrendingUp className="h-3 w-3 text-green-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const hasData = performanceEntries.length > 0 || diagnostics.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
          <p className="text-muted-foreground">
            Visualize análises de performance e diagnósticos do seu funil
          </p>
        </div>

        {/* Empty State */}
        {!hasData && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-lg mb-1">Nenhuma análise disponível</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                As análises de performance serão exibidas aqui quando disponíveis.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Performance Entries */}
        {performanceEntries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Análises de Performance</CardTitle>
              <CardDescription>Diagnósticos e análises de funil salvos</CardDescription>
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
                    <TableHead className="text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performanceEntries.map((entry) => (
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
                        {entry.channel ? channelLabels[entry.channel] || entry.channel : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", getConfidenceColor(entry.summary?.confidence_score))}
                        >
                          {entry.summary?.confidence_score ? `${entry.summary.confidence_score}%` : "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">
                        {entry.summary?.bottleneck || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                        >
                          <ChevronDown
                            className={cn(
                              "h-3 w-3 mr-1 transition-transform",
                              expandedId === entry.id && "rotate-180"
                            )}
                          />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Expanded Details */}
        {expandedId && performanceEntries.find((e) => e.id === expandedId) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Detalhes da Análise</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const entry = performanceEntries.find((e) => e.id === expandedId)!;
                return (
                  <div className="space-y-4">
                    {/* Gaps */}
                    {entry.summary?.gaps && entry.summary.gaps.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                          Maiores Gaps
                        </p>
                        <div className="space-y-1">
                          {entry.summary.gaps.slice(0, 5).map((gap, i) => (
                            <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                              <div className="flex items-center gap-2">
                                {getGapTrend(gap.gap)}
                                <span>{gap.stage}</span>
                              </div>
                              <Badge
                                variant="outline"
                                className={gap.gap > 0 ? "text-red-600 border-red-500/30" : "text-green-600 border-green-500/30"}
                              >
                                {gap.gap > 0 ? "+" : ""}
                                {gap.gap.toFixed(1)}pp
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key Rates */}
                    {entry.summary?.key_rates && Object.keys(entry.summary.key_rates).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                          Taxas Principais
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.entries(entry.summary.key_rates).slice(0, 8).map(([key, value]) => (
                            <div key={key} className="flex flex-col p-2 rounded bg-muted/50">
                              <span className="text-xs text-muted-foreground truncate">{key}</span>
                              <span className="font-medium">
                                {typeof value === "number" ? `${value.toFixed(1)}%` : value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Diagnostics History */}
        {diagnostics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Diagnósticos</CardTitle>
              <CardDescription>Análises anteriores do funil de vendas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {diagnostics.slice(0, 10).map((diag) => (
                  <div
                    key={diag.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">
                          {diag.period_label || "Diagnóstico"}
                          {diag.channel && ` - ${channelLabels[diag.channel] || diag.channel}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(diag.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {Object.keys(diag.stage_status || {}).length} etapas
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClientPerformance;