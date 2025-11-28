import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, MessageSquare, TrendingUp } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 mb-16">
          <h1 className="text-6xl font-bold bg-gradient-vivaz bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000">
            HUB Vivaz
          </h1>
          <p className="text-2xl text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
            Marketing e Growth
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
            Sistema completo de gerenciamento de clientes e projetos para agências modernas
          </p>
          <div className="flex gap-4 justify-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="group"
            >
              Acessar Sistema
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center space-y-4 p-6 rounded-lg border border-border/50 bg-card/50 hover:border-primary/50 transition-colors animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-400">
            <Users className="h-12 w-12 mx-auto text-primary" />
            <h3 className="text-xl font-semibold">Gestão de Clientes</h3>
            <p className="text-muted-foreground">
              Cadastre e gerencie informações completas de todos os seus clientes
            </p>
          </div>
          <div className="text-center space-y-4 p-6 rounded-lg border border-border/50 bg-card/50 hover:border-primary/50 transition-colors animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
            <TrendingUp className="h-12 w-12 mx-auto text-primary" />
            <h3 className="text-xl font-semibold">Projetos</h3>
            <p className="text-muted-foreground">
              Acompanhe o progresso e status de cada projeto em tempo real
            </p>
          </div>
          <div className="text-center space-y-4 p-6 rounded-lg border border-border/50 bg-card/50 hover:border-primary/50 transition-colors animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-600">
            <MessageSquare className="h-12 w-12 mx-auto text-primary" />
            <h3 className="text-xl font-semibold">Comunicação</h3>
            <p className="text-muted-foreground">
              Mantenha contato direto com clientes e equipe em um só lugar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
