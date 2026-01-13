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
  Settings2,
  Building2,
  Target,
  Zap,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const BUSINESS_STAGES = [
  { value: "validating", label: "Validação", description: "Testando product-market fit" },
  { value: "growing", label: "Crescimento", description: "Escalando aquisição" },
  { value: "scaling", label: "Escala", description: "Otimizando operações" },
  { value: "mature", label: "Maturidade", description: "Foco em retenção e LTV" },
];

const AGENT_TONES = [
  { value: "strategic", label: "Estratégico", description: "Foco em visão de longo prazo" },
  { value: "tactical", label: "Tático", description: "Foco em ações práticas" },
  { value: "analytical", label: "Analítico", description: "Foco em dados e métricas" },
  { value: "creative", label: "Criativo", description: "Foco em ideias inovadoras" },
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
  
  // Agent context settings
  const [agentContext, setAgentContext] = useState({
    businessStage: "growing",
    agentTone: "strategic",
    customInstructions: "",
    mainGoals: "",
    challenges: "",
  });
  
  // Dialog states
  const [addLinkOpen, setAddLinkOpen] = useState(false);
  const [contextSettingsOpen, setContextSettingsOpen] = useState(false);
  const [uploadFileOpen, setUploadFileOpen] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkName, setNewLinkName] = useState("");
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load knowledge base entries
  useEffect(() => {
    loadKnowledgeBase();
    loadAgentContext();
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

  const loadAgentContext = async () => {
    try {
      // Load context from a special knowledge base entry
      const { data } = await supabase
        .from("ai_knowledge_base")
        .select("content_text, metadata")
        .eq("client_id", clientId)
        .eq("source_type", "agent_context")
        .single();

      if (data?.metadata) {
        const meta = data.metadata as Record<string, any>;
        setAgentContext({
          businessStage: meta.businessStage || "growing",
          agentTone: meta.agentTone || "strategic",
          customInstructions: meta.customInstructions || "",
          mainGoals: meta.mainGoals || "",
          challenges: meta.challenges || "",
        });
      }
    } catch (error) {
      // No context saved yet, use defaults
      console.log("No agent context found, using defaults");
    }
  };

  const saveAgentContext = async () => {
    try {
      // Check if context entry exists
      const { data: existing } = await supabase
        .from("ai_knowledge_base")
        .select("id")
        .eq("client_id", clientId)
        .eq("source_type", "agent_context")
        .single();

      const contextText = `
Estágio do Negócio: ${BUSINESS_STAGES.find(s => s.value === agentContext.businessStage)?.label || agentContext.businessStage}
Tom do Agente: ${AGENT_TONES.find(t => t.value === agentContext.agentTone)?.label || agentContext.agentTone}
Objetivos Principais: ${agentContext.mainGoals || 'Não definido'}
Desafios Atuais: ${agentContext.challenges || 'Não definido'}
Instruções Customizadas: ${agentContext.customInstructions || 'Nenhuma'}
      `.trim();

      if (existing) {
        await supabase
          .from("ai_knowledge_base")
          .update({
            content_text: contextText,
            metadata: agentContext,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("ai_knowledge_base").insert({
          client_id: clientId,
          source_type: "agent_context",
          source_name: "Contexto do Agente",
          content_text: contextText,
          metadata: agentContext,
        });
      }

      toast.success("Contexto do agente salvo");
      setContextSettingsOpen(false);
    } catch (error) {
      console.error("Error saving agent context:", error);
      toast.error("Erro ao salvar contexto");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/csv',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipo de arquivo não suportado. Use PDF, DOCX, XLSX, PPTX ou CSV.");
      return;
    }

    // Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 50MB.");
      return;
    }

    setIsUploadingFile(true);
    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const storagePath = `${clientId}/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("ai-knowledge-files")
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("ai-knowledge-files")
        .getPublicUrl(storagePath);

      // Save to knowledge base with temporary content
      const { data: kbEntry, error: dbError } = await supabase
        .from("ai_knowledge_base")
        .insert({
          client_id: clientId,
          source_type: "file",
          source_name: file.name,
          source_reference: storagePath,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
          content_text: `Processando arquivo: ${file.name}...`,
        })
        .select("id")
        .single();

      if (dbError) throw dbError;

      toast.success("Arquivo enviado! Processando conteúdo...");
      loadKnowledgeBase();
      setUploadFileOpen(false);

      // Process file content in background
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.access_token && kbEntry?.id) {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-document`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            fileUrl: urlData.publicUrl,
            fileName: file.name,
            fileType: file.type,
            knowledgeBaseId: kbEntry.id,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              toast.success(`Conteúdo do arquivo extraído (${data.textLength} caracteres)`);
              loadKnowledgeBase();
            }
          })
          .catch((err) => {
            console.error("Error processing file:", err);
          });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Erro ao fazer upload do arquivo");
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Base de Conhecimento
            </CardTitle>
            <Dialog open={contextSettingsOpen} onOpenChange={setContextSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    Configurar Agente
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Business Stage */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Estágio do Negócio
                    </Label>
                    <Select
                      value={agentContext.businessStage}
                      onValueChange={(value) =>
                        setAgentContext((prev) => ({ ...prev, businessStage: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUSINESS_STAGES.map((stage) => (
                          <SelectItem key={stage.value} value={stage.value}>
                            <div>
                              <span className="font-medium">{stage.label}</span>
                              <span className="text-muted-foreground ml-2 text-xs">
                                - {stage.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Agent Tone */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Tom do Agente
                    </Label>
                    <Select
                      value={agentContext.agentTone}
                      onValueChange={(value) =>
                        setAgentContext((prev) => ({ ...prev, agentTone: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AGENT_TONES.map((tone) => (
                          <SelectItem key={tone.value} value={tone.value}>
                            <div>
                              <span className="font-medium">{tone.label}</span>
                              <span className="text-muted-foreground ml-2 text-xs">
                                - {tone.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Main Goals */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Objetivos Principais
                    </Label>
                    <Textarea
                      placeholder="Ex: Aumentar taxa de conversão, reduzir CAC, escalar faturamento..."
                      value={agentContext.mainGoals}
                      onChange={(e) =>
                        setAgentContext((prev) => ({ ...prev, mainGoals: e.target.value }))
                      }
                      rows={2}
                    />
                  </div>

                  {/* Challenges */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Desafios Atuais
                    </Label>
                    <Textarea
                      placeholder="Ex: Baixo volume de leads qualificados, alto churn, time comercial pequeno..."
                      value={agentContext.challenges}
                      onChange={(e) =>
                        setAgentContext((prev) => ({ ...prev, challenges: e.target.value }))
                      }
                      rows={2}
                    />
                  </div>

                  {/* Custom Instructions */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Instruções Customizadas
                    </Label>
                    <Textarea
                      placeholder="Ex: Sempre mencionar benchmarks do setor, focar em métricas de funil, usar linguagem técnica..."
                      value={agentContext.customInstructions}
                      onChange={(e) =>
                        setAgentContext((prev) => ({
                          ...prev,
                          customInstructions: e.target.value,
                        }))
                      }
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setContextSettingsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={saveAgentContext}>Salvar Contexto</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
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
              ) : knowledgeBase.filter(e => e.source_type !== "agent_context").length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhuma fonte adicional
                </p>
              ) : (
                knowledgeBase
                  .filter(e => e.source_type !== "agent_context")
                  .map((entry) => {
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
            
            {/* File Upload */}
            <Dialog open={uploadFileOpen} onOpenChange={setUploadFileOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 text-xs">
                  <Upload className="h-3 w-3 mr-1" />
                  Arquivo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload de Arquivo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      PDF, DOCX, XLSX, PPTX ou CSV
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">Máximo 50MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.xlsx,.pptx,.csv"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingFile}
                    >
                      {isUploadingFile ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        "Selecionar Arquivo"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
