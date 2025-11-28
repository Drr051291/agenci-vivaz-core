import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, FileText, CheckSquare, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ClientArea = () => {
  const [user, setUser] = useState<User | null>(null);
  const [clientData, setClientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // Buscar dados do cliente vinculado ao usuário
      const { data: client, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error || !client) {
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do cliente.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setClientData(client);
      setLoading(false);
    };

    checkAuth();
  }, [navigate, toast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Acesso negado</h2>
          <p className="text-muted-foreground">
            Seu usuário não está vinculado a nenhum cliente.
          </p>
          <Button onClick={handleLogout}>Fazer Logout</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-vivaz bg-clip-text text-transparent">
              HUB Vivaz
            </h1>
            <p className="text-sm text-muted-foreground">{clientData.company_name}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="meetings" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Atas de Reuniões</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Atividades</span>
            </TabsTrigger>
            <TabsTrigger value="dashboards" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboards</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="p-6 rounded-lg border bg-card">
                <h3 className="font-semibold mb-2">Empresa</h3>
                <p className="text-2xl font-bold">{clientData.company_name}</p>
              </div>
              <div className="p-6 rounded-lg border bg-card">
                <h3 className="font-semibold mb-2">Segmento</h3>
                <p className="text-2xl font-bold capitalize">{clientData.segment}</p>
              </div>
              <div className="p-6 rounded-lg border bg-card">
                <h3 className="font-semibold mb-2">Contato</h3>
                <p className="text-sm">{clientData.contact_name}</p>
                <p className="text-sm text-muted-foreground">{clientData.contact_email}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="meetings">
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Atas de reuniões em breve
              </p>
            </div>
          </TabsContent>

          <TabsContent value="tasks">
            <div className="text-center py-12">
              <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Atividades em breve
              </p>
            </div>
          </TabsContent>

          <TabsContent value="dashboards">
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Dashboards em breve
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ClientArea;
