import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Briefcase, MessageSquare, TrendingUp } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { motion } from "framer-motion";
import { StaggerContainer, StaggerItem } from "@/components/ui/animated";

const Dashboard = () => {
  const [stats, setStats] = useState({
    clients: 0,
    projects: 0,
    messages: 0,
    collaborators: 0,
  });

  usePageMeta({
    title: "Dashboard",
    description: "Visão geral do HUB Vivaz com estatísticas de clientes, projetos e comunicações",
    keywords: "dashboard, estatísticas, clientes, projetos, vivaz",
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

        <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => (
            <StaggerItem key={index}>
              <Card interactive className="h-full group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <stat.icon className={`h-5 w-5 ${stat.color} transition-colors group-hover:text-primary`} />
                  </motion.div>
                </CardHeader>
                <CardContent>
                  <motion.div 
                    className="text-3xl font-bold"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1, type: "spring", stiffness: 200 }}
                  >
                    {stat.value}
                  </motion.div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card>
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
                <StaggerContainer className="grid gap-4 md:grid-cols-3">
                  {[
                    { icon: Users, title: "Clientes", desc: "Cadastre e gerencie informações de clientes", color: "text-primary" },
                    { icon: Briefcase, title: "Projetos", desc: "Acompanhe o progresso de cada projeto", color: "text-secondary" },
                    { icon: MessageSquare, title: "Comunicação", desc: "Mantenha contato direto com clientes", color: "text-accent" },
                  ].map((item, index) => (
                    <StaggerItem key={index}>
                      <motion.div
                        className="p-4 bg-card border border-border rounded-lg cursor-pointer group"
                        whileHover={{ 
                          y: -4, 
                          boxShadow: "0 10px 25px -5px hsl(var(--primary) / 0.1)",
                          borderColor: "hsl(var(--primary) / 0.3)"
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      >
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          <item.icon className={`h-8 w-8 ${item.color} mb-2 transition-transform`} />
                        </motion.div>
                        <h4 className="font-semibold group-hover:text-primary transition-colors">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </motion.div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
