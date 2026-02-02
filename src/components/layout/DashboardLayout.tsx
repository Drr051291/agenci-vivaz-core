import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  LogOut,
  PanelLeft,
  UserCog,
  FileText,
  CheckSquare,
  BarChart3,
  DollarSign,
  Wrench,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import logoVivaz from "@/assets/logo-vivaz.png";
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
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications";

const adminMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, adminOnly: false, disabled: false, comingSoon: false },
  { title: "Clientes", url: "/clientes", icon: Users, adminOnly: false, disabled: false, comingSoon: false },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign, adminOnly: false, disabled: false, comingSoon: false },
  { title: "Trilhas e Processos", url: "/educacao", icon: GraduationCap, adminOnly: false, disabled: false, comingSoon: false },
  { title: "Ferramentas", url: "/ferramentas", icon: Wrench, adminOnly: true, disabled: false, comingSoon: false },
  { title: "Usuários", url: "/usuarios", icon: UserCog, adminOnly: true, disabled: false, comingSoon: false },
];

const clientMenuItems = [
  { title: "Visão Geral", url: "/area-cliente", icon: LayoutDashboard, adminOnly: false, disabled: false },
  { title: "Reuniões", url: "/area-cliente/atas", icon: FileText, adminOnly: false, disabled: false },
  { title: "Atividades", url: "/area-cliente/atividades", icon: CheckSquare, adminOnly: false, disabled: false },
  { title: "Performance", url: "/area-cliente/performance", icon: BarChart3, adminOnly: false, disabled: false },
  { title: "Dashboards", url: "/area-cliente/dashboards", icon: BarChart3, adminOnly: false, disabled: false },
  { title: "Trilhas e Processos", url: "/area-cliente/trilhas", icon: GraduationCap, adminOnly: false, disabled: false },
  { title: "Vivaz AI", url: "/area-cliente/vivaz-ai", icon: Sparkles, adminOnly: false, disabled: true, comingSoon: true },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

const AppSidebar = ({ user }: { user: User | null }) => {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const isCollapsed = state === "collapsed";
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);

  // Check if user is in client area based on current route
  const isInClientArea = location.pathname.startsWith("/area-cliente");

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setRoleLoading(false);
        return;
      }
      
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setUserRole(data.role);
        setIsAdmin(data.role === "admin");
      }
      setRoleLoading(false);
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

  // Use client menu if user role is client OR if we're in client area (even while loading)
  // This prevents showing admin menu briefly during navigation in client area
  const menuItems = (userRole === "client" || (roleLoading && isInClientArea)) ? clientMenuItems : adminMenuItems;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarContent className="flex flex-col h-full">
        {/* Logo */}
        <motion.div 
          className={cn(
            "flex items-center gap-2.5 px-4 py-5 border-b border-sidebar-border",
            isCollapsed && "justify-center px-2"
          )}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="flex items-center justify-center w-10 h-10 rounded-lg overflow-hidden"
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <img src={logoVivaz} alt="Vivaz" className="w-10 h-10 object-contain" />
          </motion.div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span 
                className="font-display font-bold text-lg text-foreground tracking-tight"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                HUB Vivaz
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Navigation */}
        <SidebarGroup className="flex-1 py-4">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2">
              {menuItems
                .filter((item) => !item.adminOnly || isAdmin)
                .map((item, index) => {
                  const isActive = location.pathname === item.url || 
                    (item.url !== "/dashboard" && item.url !== "/area-cliente" && location.pathname.startsWith(item.url));
                  
                  return (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild className="h-9">
                          {item.disabled ? (
                            <div
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium relative overflow-hidden cursor-not-allowed",
                                "text-sidebar-foreground/40",
                              )}
                            >
                              <item.icon className="h-4 w-4 flex-shrink-0 relative z-10" />
                              {!isCollapsed && (
                                <span className="relative z-10 flex items-center gap-2">
                                  {item.title}
                                  {item.comingSoon && (
                                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                                      Em breve
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          ) : (
                            <NavLink
                              to={item.url}
                              end={item.url === "/dashboard" || item.url === "/area-cliente"}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium relative overflow-hidden",
                                "text-sidebar-foreground/70 hover:text-sidebar-foreground",
                                "transition-colors duration-200"
                              )}
                              activeClassName="text-primary font-semibold"
                            >
                              {isActive && (
                                <motion.div
                                  className="absolute inset-0 bg-primary/10 rounded-md"
                                  layoutId="activeMenuItem"
                                  initial={false}
                                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                              )}
                              <item.icon className="h-4 w-4 flex-shrink-0 relative z-10" />
                              {!isCollapsed && <span className="relative z-10">{item.title}</span>}
                            </NavLink>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </motion.div>
                  );
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer */}
        <motion.div 
          className="mt-auto border-t border-sidebar-border p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
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
        </motion.div>
      </SidebarContent>
    </Sidebar>
  );
};

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

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
        <motion.div 
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="w-10 h-10 rounded-xl bg-gradient-vivaz shadow-lg"
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <span className="text-sm text-muted-foreground">Carregando...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar user={user} />
        <main className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4">
            <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors">
              <PanelLeft className="h-4 w-4" />
            </SidebarTrigger>
            <NotificationBell />
          </header>
          <div className="flex-1 p-6 overflow-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};