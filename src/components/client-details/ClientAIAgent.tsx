import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Bot,
  Send,
  Sparkles,
  FileText,
  BarChart3,
  Calendar,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Loader2,
  Plus,
  Upload,
  Link as LinkIcon,
  X,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";

interface ClientAIAgentProps {
  clientId: string;
  clientName: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { type: string; name: string; reference?: string }[];
  timestamp: Date;
}

interface KnowledgeBaseEntry {
  id: string;
  source_type: string;
  source_name: string;
  source_reference?: string;
  created_at: string;
  is_active: boolean;
}

type QuickAction = "relatorio_mensal" | "analisar_gargalos" | "sugestao_melhoria";

const QUICK_ACTIONS = [
  {
    id: "relatorio_mensal" as QuickAction,
    label: "Gerar Relatório Mensal",
    icon: FileText,
    description: "Resumo executivo com métricas e insights",
  },
  {
    id: "analisar_gargalos" as QuickAction,
    label: "Analisar Gargalos",
    icon: AlertTriangle,
    description: "Identifica pontos fracos do funil",
  },
  {
    id: "sugestao_melhoria" as QuickAction,
    label: "Sugestão de Melhoria",
    icon: TrendingUp,
    description: "Recomendações baseadas nos dados",
  },
];

export function ClientAIAgent({ clientId, clientName }: ClientAIAgentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseEntry[]>([]);
  const [isLoadingKB, setIsLoadingKB] = useState(true);
  const [contextOptions, setContextOptions] = useState({
    includePerformanceMatrix: true,
    includeMeetings: true,
    meetingCount: 5,
  });
  
  // Dialog states
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkName, setNewLinkName] = useState("");
  const [isAddingLink, setIsAddingLink] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load knowledge base entries
  useEffect(() => {
    loadKnowledgeBase();
  }, [clientId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadKnowledgeBase = async () => {
    setIsLoadingKB(true);
    try {
      const { data, error } = await supabase
        .from("ai_knowledge_base")
        .select("id, source_type, source_name, source_reference, created_at, is_active")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setKnowledgeBase(data || []);
    } catch (error) {
      console.error("Error loading knowledge base:", error);
    } finally {
      setIsLoadingKB(false);
    }
  };

  const sendMessage = async (content: string, quickAction?: QuickAction) => {
    if (!content.trim() && !quickAction) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: quickAction 
        ? QUICK_ACTIONS.find(a => a.id === quickAction)?.label || content
        : content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Não autenticado");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vivaz-ai-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            clientId,
            message: content,
            quickAction,
            contextOptions,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit excedido. Aguarde alguns minutos.");
        }
        if (response.status === 402) {
          throw new Error("Créditos de IA esgotados.");
        }
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao processar");
      }

      // Parse SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      const sources = JSON.parse(response.headers.get("X-AI-Sources") || "[]");

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (reader) {
        let textBuffer = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          textBuffer += decoder.decode(value, { stream: true });
          
          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;
            
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            
            try {
              const parsed = JSON.parse(jsonStr);
              const deltaContent = parsed.choices?.[0]?.delta?.content;
              if (deltaContent) {
                assistantContent += deltaContent;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessage.id
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                );
              }
            } catch {
              // Incomplete JSON, put back and wait
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao enviar mensagem");
      // Remove the user message if there was an error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const addUrlToKnowledgeBase = async () => {
    if (!newLinkUrl.trim()) return;
    
    setIsAddingLink(true);
    try {
      // For now, we'll store the URL as a reference
      // In a full implementation, you'd scrape the content server-side
      const { error } = await supabase.from("ai_knowledge_base").insert({
        client_id: clientId,
        source_type: "url",
        source_name: newLinkName.trim() || new URL(newLinkUrl).hostname,
        source_reference: newLinkUrl.trim(),
        content_text: `URL: ${newLinkUrl.trim()}\nNome: ${newLinkName.trim() || 'Não especificado'}`,
      });

      if (error) throw error;
      
      toast.success("Link adicionado à base de conhecimento");
      setAddLinkOpen(false);
      setNewLinkUrl("");
      setNewLinkName("");
      loadKnowledgeBase();
    } catch (error) {
      console.error("Error adding link:", error);
      toast.error("Erro ao adicionar link");
    } finally {
      setIsAddingLink(false);
    }
  };

  const removeFromKnowledgeBase = async (id: string) => {
    try {
      const { error } = await supabase
        .from("ai_knowledge_base")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Removido da base de conhecimento");
      loadKnowledgeBase();
    } catch (error) {
      console.error("Error removing entry:", error);
      toast.error("Erro ao remover");
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case "file":
        return FileText;
      case "url":
        return LinkIcon;
      case "system_metric":
        return BarChart3;
      case "meeting":
        return Calendar;
      default:
        return FileText;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-200px)]">
      {/* Left Panel - Knowledge Base Manager */}
      <Card className="lg:col-span-1 flex flex-col">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Base de Conhecimento
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="flex-1 p-3 overflow-hidden flex flex-col">
          {/* Context Options */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeMatrix"
                checked={contextOptions.includePerformanceMatrix}
                onCheckedChange={(checked) =>
                  setContextOptions((prev) => ({
                    ...prev,
                    includePerformanceMatrix: !!checked,
                  }))
                }
              />
              <Label htmlFor="includeMatrix" className="text-xs flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                Matriz de Performance
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeMeetings"
                checked={contextOptions.includeMeetings}
                onCheckedChange={(checked) =>
                  setContextOptions((prev) => ({
                    ...prev,
                    includeMeetings: !!checked,
                  }))
                }
              />
              <Label htmlFor="includeMeetings" className="text-xs flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Últimas {contextOptions.meetingCount} Reuniões
              </Label>
            </div>
          </div>

          <Separator className="my-2" />

          {/* Knowledge Base Entries */}
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {isLoadingKB ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : knowledgeBase.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhuma fonte adicional
                </p>
              ) : (
                knowledgeBase.map((entry) => {
                  const Icon = getSourceIcon(entry.source_type);
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-xs group"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{entry.source_name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeFromKnowledgeBase(entry.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Add Source Buttons */}
          <div className="mt-3 flex gap-2">
            <Dialog open={addLinkOpen} onOpenChange={setAddLinkOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 text-xs">
                  <LinkIcon className="h-3 w-3 mr-1" />
                  Link
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Link</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkUrl">URL</Label>
                    <Input
                      id="linkUrl"
                      placeholder="https://..."
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkName">Nome (opcional)</Label>
                    <Input
                      id="linkName"
                      placeholder="Ex: Landing Page Principal"
                      value={newLinkName}
                      onChange={(e) => setNewLinkName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddLinkOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={addUrlToKnowledgeBase} disabled={isAddingLink}>
                    {isAddingLink && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Adicionar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" className="flex-1 text-xs" disabled>
              <Upload className="h-3 w-3 mr-1" />
              Arquivo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Panel - Chat Interface */}
      <Card className="lg:col-span-3 flex flex-col">
        <CardHeader className="py-3 px-4 flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">Vivaz AI</CardTitle>
              <p className="text-xs text-muted-foreground">
                Consultor estratégico de {clientName}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                className="text-xs hidden md:flex"
                onClick={() => sendMessage(action.label, action.id)}
                disabled={isLoading}
              >
                <action.icon className="h-3 w-3 mr-1" />
                {action.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <Separator />

        {/* Messages Area */}
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-violet-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                Olá! Sou o Vivaz AI
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Estou analisando os dados de <strong>{clientName}</strong>. Como posso ajudar hoje?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">
                {QUICK_ACTIONS.map((action) => (
                  <Button
                    key={action.id}
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-center gap-2"
                    onClick={() => sendMessage(action.label, action.id)}
                    disabled={isLoading}
                  >
                    <action.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs">{action.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/20"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{message.content || "..."}</ReactMarkdown>
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-violet-500/20">
                            <p className="text-xs text-muted-foreground mb-1">Fontes:</p>
                            <div className="flex flex-wrap gap-1">
                              {message.sources.map((source, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-[10px] bg-background"
                                >
                                  {source.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/20 rounded-lg px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              placeholder="Pergunte algo sobre o cliente..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[44px] max-h-32 resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={() => sendMessage(inputValue)}
              disabled={isLoading || !inputValue.trim()}
              className="shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
