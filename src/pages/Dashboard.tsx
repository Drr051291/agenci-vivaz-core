import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Briefcase, MessageSquare, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const [stats, setStats] = useState({
    clients: 0,
    projects: 0,
    messages: 0,
    collaborators: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [clientsRes, projectsRes, messagesRes, collaboratorsRes] = await Promise.all([
        supabase.from("clients").select("*", { count: "exact", head: true }),
        supabase.from("projects").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "collaborator"),
      ]);

      setStats({
        clients: clientsRes.count || 0,
        projects: projectsRes.count || 0,
        messages: messagesRes.count || 0,
        collaborators: collaboratorsRes.count || 0,
      });
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Clientes Ativos",
      value: stats.clients,
      icon: Users,
      description: "Total de clientes cadastrados",
      color: "text-primary",
    },
    {
      title: "Projetos",
      value: stats.projects,
      icon: TrendingUp,
      description: "Projetos em andamento",
      color: "text-secondary",
    },
    {
      title: "Mensagens",
      value: stats.messages,
      icon: MessageSquare,
      description: "Comunicações recentes",
      color: "text-accent",
    },
    {
      title: "Colaboradores",
      value: stats.collaborators,
      icon: Briefcase,
      description: "Equipe Vivaz",
      color: "text-muted-foreground",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do HUB Vivaz</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => (
            <Card
              key={index}
              className="border-border/50 hover:border-primary/50 transition-colors"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Bem-vindo ao HUB Vivaz</CardTitle>
            <CardDescription>
              Sistema de gerenciamento de clientes e projetos da Vivaz Marketing e Growth
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold mb-2">🚀 Começando</h3>
                <p className="text-sm text-muted-foreground">
                  Gerencie seus clientes, acompanhe projetos e mantenha uma comunicação fluida
                  com toda a equipe através do HUB Vivaz.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-card border border-border rounded-lg">
                  <Users className="h-8 w-8 text-primary mb-2" />
                  <h4 className="font-semibold">Clientes</h4>
                  <p className="text-sm text-muted-foreground">
                    Cadastre e gerencie informações de clientes
                  </p>
                </div>
                <div className="p-4 bg-card border border-border rounded-lg">
                  <Briefcase className="h-8 w-8 text-secondary mb-2" />
                  <h4 className="font-semibold">Projetos</h4>
                  <p className="text-sm text-muted-foreground">
                    Acompanhe o progresso de cada projeto
                  </p>
                </div>
                <div className="p-4 bg-card border border-border rounded-lg">
                  <MessageSquare className="h-8 w-8 text-accent mb-2" />
                  <h4 className="font-semibold">Comunicação</h4>
                  <p className="text-sm text-muted-foreground">
                    Mantenha contato direto com clientes
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
