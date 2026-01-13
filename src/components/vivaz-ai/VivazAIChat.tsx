import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Bot, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { VivazAIMessage } from './VivazAIMessage';
import { VivazAIQuickActions, QuickActionType } from './VivazAIQuickActions';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ type: string; name: string; url?: string }>;
  isStreaming?: boolean;
}

interface VivazAIChatProps {
  clientId: string;
  clientName: string;
  sessionId: string | null;
  onSessionCreated?: (sessionId: string) => void;
  showQuickActions?: boolean;
  isClientView?: boolean;
}

export function VivazAIChat({
  clientId,
  clientName,
  sessionId,
  onSessionCreated,
  showQuickActions = true,
  isClientView = false,
}: VivazAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Load messages when session changes
  useEffect(() => {
    if (sessionId) {
      setCurrentSessionId(sessionId);
      loadMessages(sessionId);
    } else {
      setMessages([]);
      setCurrentSessionId(null);
    }
  }, [sessionId]);

  const loadMessages = async (sid: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('session_id', sid)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loadedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        sources: msg.sources as Message['sources'],
      }));

      setMessages(loadedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const createSession = async (): Promise<string> => {
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .insert({
        client_id: clientId,
        created_by: userData.user?.id,
        title: 'Nova Conversa',
      })
      .select()
      .single();

    if (error) throw error;
    
    onSessionCreated?.(data.id);
    return data.id;
  };

  const saveMessage = async (
    sid: string, 
    role: 'user' | 'assistant', 
    content: string,
    sources?: Message['sources']
  ) => {
    await supabase.from('ai_chat_messages').insert({
      session_id: sid,
      role,
      content,
      sources: sources || [],
    });
  };

  const handleSendMessage = async (message: string, quickAction?: QuickActionType) => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Create session if needed
      let sid = currentSessionId;
      if (!sid) {
        sid = await createSession();
        setCurrentSessionId(sid);
      }

      // Save user message
      await saveMessage(sid, 'user', userMessage.content);

      // Update session title based on first message
      if (messages.length === 0) {
        const title = message.trim().slice(0, 50) + (message.length > 50 ? '...' : '');
        await supabase
          .from('ai_chat_sessions')
          .update({ title })
          .eq('id', sid);
      }

      // Create streaming assistant message
      const assistantId = `assistant-${Date.now()}`;
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
      }]);

      // Call edge function with streaming
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vivaz-ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            message: message.trim(),
            clientId,
            sessionId: sid,
            quickAction,
            includePerformance: true,
            includeMeetings: true,
            includeKnowledge: true,
            includeTasks: true,
            isClientView,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Muitas requisições. Aguarde um momento e tente novamente.');
        }
        if (response.status === 402) {
          throw new Error('Créditos insuficientes. Entre em contato com o suporte.');
        }
        throw new Error('Erro ao processar sua mensagem');
      }

      // Get sources from header
      const sourcesHeader = response.headers.get('X-Sources');
      const sources = sourcesHeader ? JSON.parse(sourcesHeader) : [];

      // Stream response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let textBuffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === assistantId 
                    ? { ...msg, content: fullContent }
                    : msg
                )
              );
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Finalize message
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantId 
            ? { ...msg, isStreaming: false, sources }
            : msg
        )
      );

      // Save assistant message
      await saveMessage(sid, 'assistant', fullContent, sources);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao enviar mensagem',
        variant: 'destructive',
      });
      // Remove failed streaming message
      setMessages(prev => prev.filter(m => !m.isStreaming));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const handleQuickAction = (prompt: string, actionId: QuickActionType) => {
    handleSendMessage(prompt, actionId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          <AnimatePresence>
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Olá! Sou a Vivaz AI
                </h3>
                <p className="text-muted-foreground text-sm max-w-md mb-6">
                  {isClientView 
                    ? `Estou aqui para ajudar você a entender seus resultados e sugerir melhorias estratégicas para ${clientName}.`
                    : `Posso analisar dados, gerar relatórios e identificar oportunidades para ${clientName}.`
                  }
                </p>

                {showQuickActions && (
                  <div className="w-full max-w-2xl">
                    <VivazAIQuickActions
                      onSelectAction={handleQuickAction}
                      disabled={isLoading}
                    />
                  </div>
                )}
              </motion.div>
            ) : (
              <>
                {messages.map(message => (
                  <VivazAIMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    sources={message.sources}
                    isStreaming={message.isStreaming}
                  />
                ))}
              </>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Quick Actions (compact when there are messages) */}
      {showQuickActions && messages.length > 0 && (
        <div className="px-4 py-2 border-t border-border/50 bg-muted/20">
          <VivazAIQuickActions
            onSelectAction={handleQuickAction}
            disabled={isLoading}
            compact
          />
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-border/50 bg-background">
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              className={cn(
                "min-h-[48px] max-h-[200px] resize-none pr-12",
                "focus-visible:ring-primary/50"
              )}
              rows={1}
              disabled={isLoading}
            />
            <div className="absolute bottom-2 right-2">
              <Sparkles className="h-4 w-4 text-muted-foreground/50" />
            </div>
          </div>
          <Button
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isLoading}
            size="icon"
            className="h-12 w-12 rounded-xl"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Vivaz AI pode cometer erros. Verifique informações importantes.
        </p>
      </div>
    </div>
  );
}
