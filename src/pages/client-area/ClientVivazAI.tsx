import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Bot, Menu, X, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { VivazAIChat, VivazAISessionHistory } from '@/components/vivaz-ai';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ClientVivazAI() {
  const [profile, setProfile] = useState<{ role: string } | null>(null);
  const [client, setClient] = useState<{ id: string; company_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    checkUserAccess();
  }, []);

  const checkUserAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profileData || profileData.role !== 'client') {
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Get client data
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, company_name')
        .eq('user_id', user.id)
        .single();

      if (clientData) {
        setClient(clientData);
      }
    } catch (error) {
      console.error('Error checking access:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = () => {
    setCurrentSessionId(null);
    setShowSidebar(false);
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setShowSidebar(false);
  };

  const handleSessionCreated = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const handleDeleteSession = (sessionId: string) => {
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!profile || profile.role !== 'client') {
    return <Navigate to="/auth" replace />;
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Nenhum cliente vinculado à sua conta.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 border-r border-border/50 bg-card/50 backdrop-blur-sm flex-col">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold">Vivaz AI</h1>
              <p className="text-xs text-muted-foreground">{client.company_name}</p>
            </div>
          </div>
        </div>
        
        <VivazAISessionHistory
          clientId={client.id}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          isAgencyView={false}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <h1 className="font-semibold">Vivaz AI</h1>
          </div>

          <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <MessageSquare className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="font-semibold">Vivaz AI</h1>
                    <p className="text-xs text-muted-foreground">{client.company_name}</p>
                  </div>
                </div>
              </div>
              
              <VivazAISessionHistory
                clientId={client.id}
                currentSessionId={currentSessionId}
                onSelectSession={handleSelectSession}
                onNewSession={handleNewSession}
                onDeleteSession={handleDeleteSession}
                isAgencyView={false}
              />
            </SheetContent>
          </Sheet>
        </header>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <VivazAIChat
            clientId={client.id}
            clientName={client.company_name}
            sessionId={currentSessionId}
            onSessionCreated={handleSessionCreated}
            showQuickActions={true}
            isClientView={true}
          />
        </div>
      </main>
    </div>
  );
}
