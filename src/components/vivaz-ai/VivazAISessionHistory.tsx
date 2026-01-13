import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, Plus, Trash2, Clock, MoreVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Session {
  id: string;
  title: string | null;
  created_at: string;
  last_message_at: string | null;
  message_count: number | null;
}

interface VivazAISessionHistoryProps {
  clientId: string;
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession?: (sessionId: string) => void;
  isAgencyView?: boolean;
}

export function VivazAISessionHistory({
  clientId,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isAgencyView = false,
}: VivazAISessionHistoryProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, [clientId]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .select('id, title, created_at, last_message_at, message_count')
        .eq('client_id', clientId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      // First delete all messages
      await supabase
        .from('ai_chat_messages')
        .delete()
        .eq('session_id', sessionId);

      // Then delete the session
      const { error } = await supabase
        .from('ai_chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      onDeleteSession?.(sessionId);
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const formatSessionDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return format(date, "'Hoje,' HH:mm", { locale: ptBR });
    } else if (diffDays === 1) {
      return format(date, "'Ontem,' HH:mm", { locale: ptBR });
    } else if (diffDays < 7) {
      return format(date, "EEEE, HH:mm", { locale: ptBR });
    } else {
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    }
  };

  if (loading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border/50">
        <Button 
          onClick={onNewSession} 
          className="w-full gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Nova Conversa
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          <AnimatePresence>
            {sessions.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-muted-foreground text-sm"
              >
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma conversa ainda</p>
                <p className="text-xs">Inicie uma nova conversa</p>
              </motion.div>
            ) : (
              sessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <button
                    onClick={() => onSelectSession(session.id)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all",
                      "hover:bg-muted/50 group",
                      currentSessionId === session.id && "bg-primary/10 border border-primary/20"
                    )}
                  >
                    <div className={cn(
                      "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                      currentSessionId === session.id 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    )}>
                      <MessageSquare className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {session.title || 'Nova Conversa'}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatSessionDate(session.last_message_at || session.created_at)}
                        </span>
                        {session.message_count && session.message_count > 0 && (
                          <span className="text-xs text-muted-foreground">
                            · {session.message_count} msgs
                          </span>
                        )}
                      </div>
                    </div>

                    {isAgencyView && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(session.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
