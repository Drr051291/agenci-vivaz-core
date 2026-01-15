import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarDays, CheckSquare, BarChart3 } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import logoVivaz from "@/assets/logo-vivaz.png";

const Index = () => {
  const navigate = useNavigate();

  usePageMeta({
    title: "Home",
    description: "HUB Vivaz - Seu espaço de parceria com a Vivaz Marketing e Growth",
    keywords: "gestão de clientes, CRM, projetos, marketing, growth, vivaz",
  });

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      if (session) {
        const { data: userRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();

        if (userRole?.role === "client") {
          navigate("/area-cliente");
        } else {
          navigate("/dashboard");
        }
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="text-center space-y-6 mb-16">
          {/* Logo */}
          <div className="flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <img 
              src={logoVivaz} 
              alt="Vivaz" 
              className="h-16 w-auto"
            />
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-vivaz bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
            HUB Vivaz
          </h1>
          
          {/* Tagline */}
          <p className="text-xl text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
            Marketing e Growth
          </p>

          {/* Main message */}
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
            <p className="text-2xl md:text-3xl font-medium text-foreground">
              Seu espaço de parceria com a Vivaz
            </p>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Reuniões, atividades e resultados — tudo conectado em tempo real.
            </p>
          </div>

          {/* CTA */}
          <div className="pt-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="group text-base px-8"
            >
              Entrar
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="text-center space-y-3 p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:bg-card/80 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-600">
            <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Reuniões</h3>
            <p className="text-sm text-muted-foreground">
              Atas e alinhamentos sempre acessíveis
            </p>
          </div>

          <div className="text-center space-y-3 p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:bg-card/80 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-700">
            <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <CheckSquare className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Atividades</h3>
            <p className="text-sm text-muted-foreground">
              Tarefas e prazos em andamento
            </p>
          </div>

          <div className="text-center space-y-3 p-6 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:bg-card/80 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-[800ms]">
            <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Performance</h3>
            <p className="text-sm text-muted-foreground">
              Dashboards e métricas de resultados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
