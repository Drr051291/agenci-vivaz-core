import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, AlertCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface DashboardAIAnalysisProps {
  clientId: string;
  clientName?: string;
}

export function DashboardAIAnalysis({ clientId, clientName }: DashboardAIAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [dataAvailable, setDataAvailable] = useState<{ reportei: boolean; pipedrive: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateAnalysis = async () => {
    setLoading(true);
    setDialogOpen(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-dashboard-analysis', {
        body: {
          clientId,
          clientName,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        setDialogOpen(false);
        return;
      }

      setAnalysis(data.analysis);
      setDataAvailable(data.dataAvailable);
    } catch (error) {
      console.error('Erro ao gerar análise:', error);
      toast.error('Erro ao gerar análise. Tente novamente.');
      setDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!analysis) return;
    
    try {
      await navigator.clipboard.writeText(analysis);
      setCopied(true);
      toast.success('Análise copiada!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  // Simple markdown renderer for the analysis
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
      // Headers
      if (line.startsWith('## ')) {
        return (
          <h2 key={index} className="text-lg font-semibold mt-6 mb-3 text-foreground">
            {line.replace('## ', '')}
          </h2>
        );
      }
      if (line.startsWith('### ')) {
        return (
          <h3 key={index} className="text-base font-medium mt-4 mb-2 text-foreground">
            {line.replace('### ', '')}
          </h3>
        );
      }
      
      // List items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <li key={index} className="ml-4 mb-1 text-muted-foreground">
            {line.replace(/^[-*] /, '')}
          </li>
        );
      }
      
      // Numbered lists
      if (/^\d+\. /.test(line)) {
        return (
          <li key={index} className="ml-4 mb-1 text-muted-foreground list-decimal">
            {line.replace(/^\d+\. /, '')}
          </li>
        );
      }
      
      // Bold text (simplified)
      if (line.includes('**')) {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={index} className="mb-2 text-muted-foreground">
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i} className="text-foreground">{part}</strong> : part
            )}
          </p>
        );
      }
      
      // Empty lines
      if (line.trim() === '') {
        return <div key={index} className="h-2" />;
      }
      
      // Regular paragraphs
      return (
        <p key={index} className="mb-2 text-muted-foreground">
          {line}
        </p>
      );
    });
  };

  return (
    <>
      <Button 
        onClick={handleGenerateAnalysis} 
        disabled={loading}
        variant="outline"
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Gerar Análise IA
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Análise de Performance
              {clientName && (
                <Badge variant="outline" className="ml-2 font-normal">
                  {clientName}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Analisando dados...</p>
                <p className="text-sm text-muted-foreground">
                  Buscando métricas do Reportei e Pipedrive
                </p>
              </div>
            </div>
          ) : analysis ? (
            <>
              {dataAvailable && (
                <div className="flex gap-2 mb-4">
                  <Badge 
                    variant="outline" 
                    className={dataAvailable.reportei 
                      ? "bg-green-500/10 text-green-600 border-green-500/20" 
                      : "bg-muted text-muted-foreground"
                    }
                  >
                    Reportei: {dataAvailable.reportei ? 'Conectado' : 'Não disponível'}
                  </Badge>
                  <Badge 
                    variant="outline"
                    className={dataAvailable.pipedrive 
                      ? "bg-blue-500/10 text-blue-600 border-blue-500/20" 
                      : "bg-muted text-muted-foreground"
                    }
                  >
                    Pipedrive: {dataAvailable.pipedrive ? 'Conectado' : 'Não disponível'}
                  </Badge>
                </div>
              )}
              
              <ScrollArea className="h-[60vh] pr-4">
                <div className="prose prose-sm max-w-none">
                  {renderMarkdown(analysis)}
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 mr-1" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
                <Button size="sm" onClick={() => setDialogOpen(false)}>
                  Fechar
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">
                Não foi possível gerar a análise. Verifique as integrações do cliente.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
