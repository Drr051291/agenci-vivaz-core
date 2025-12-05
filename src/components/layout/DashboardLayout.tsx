import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  Users,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  UserCog,
  FileText,
  CheckSquare,
  BarChart3,
  DollarSign,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const adminMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, adminOnly: false },
  { title: "Clientes", url: "/clientes", icon: Users, adminOnly: false },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign, adminOnly: false },
  { title: "Usuários", url: "/usuarios", icon: UserCog, adminOnly: true },
];

const clientMenuItems = [
  { title: "Visão Geral", url: "/area-cliente", icon: LayoutDashboard, adminOnly: false },
  { title: "Reuniões", url: "/area-cliente/atas", icon: FileText, adminOnly: false },
  { title: "Atividades", url: "/area-cliente/atividades", icon: CheckSquare, adminOnly: false },
  { title: "Dashboards", url: "/area-cliente/dashboards", icon: BarChart3, adminOnly: false },
  { title: "Financeiro", url: "/area-cliente/financeiro", icon: DollarSign, adminOnly: false },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

const AppSidebar = ({ user }: { user: User | null }) => {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isCollapsed = state === "collapsed";
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setUserRole(data.role);
        setIsAdmin(data.role === "admin");
      }
    };

    checkUserRole();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/auth");
  };

  const menuItems = userRole === "client" ? clientMenuItems : adminMenuItems;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarContent className="flex flex-col h-full">
        {/* Logo */}
        <div className={cn(
          "flex items-center gap-2 px-4 py-5 border-b border-sidebar-border",
          isCollapsed && "justify-center px-2"
        )}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-vivaz">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <span className="font-display font-bold text-lg text-foreground tracking-tight">
              HUB Vivaz
            </span>
          )}
        </div>

        {/* Navigation */}
        <SidebarGroup className="flex-1 py-4">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2">
              {menuItems
                .filter((item) => !item.adminOnly || isAdmin)
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-9">
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard" || item.url === "/area-cliente"}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium",
                          "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                          "transition-colors duration-150"
                        )}
                        activeClassName="bg-primary/10 text-primary font-semibold"
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer */}
        <div className="mt-auto border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent h-9",
              isCollapsed && "justify-center px-0"
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Sair</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
};

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-vivaz animate-pulse" />
          <div className="text-sm text-muted-foreground">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar user={user} />
        <main className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-4 gap-4">
            <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors">
              <PanelLeft className="h-4 w-4" />
            </SidebarTrigger>
          </header>
          <div className="flex-1 p-6 overflow-auto">
            <div className="animate-fade-in">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};