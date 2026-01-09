import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetails from "./pages/ClientDetails";
import MeetingEditor from "./pages/MeetingEditor";
import ClientDashboard from "./pages/client-area/ClientDashboard";
import ClientMeetings from "./pages/client-area/ClientMeetings";
import ClientMeetingView from "./pages/client-area/ClientMeetingView";
import ClientTasks from "./pages/client-area/ClientTasks";
import ClientDashboards from "./pages/client-area/ClientDashboards";
import ClientFinancial from "./pages/client-area/ClientFinancial";
import Users from "./pages/Users";
import SharedMeeting from "./pages/SharedMeeting";
import GoogleCalendarCallback from "./pages/GoogleCalendarCallback";
import NotFound from "./pages/NotFound";
import Financial from "./pages/Financial";
import Ferramentas from "./pages/Ferramentas";
import ProjecaoFaturamento from "./pages/ferramentas/ProjecaoFaturamento";
import MatrizInsideSales from "./pages/ferramentas/MatrizInsideSales";
import MatrizEcommerce from "./pages/ferramentas/MatrizEcommerce";
import MatrizPerformancePro from "./pages/ferramentas/MatrizPerformancePro";
import PrecificacaoMercadoLivre from "./pages/ferramentas/PrecificacaoMercadoLivre";
import PrecificacaoProduto from "./pages/ferramentas/PrecificacaoProduto";
import DREProjetado from "./pages/ferramentas/DREProjetado";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/area-cliente" element={<ClientDashboard />} />
          <Route path="/area-cliente/atas" element={<ClientMeetings />} />
          <Route path="/area-cliente/reunioes/:meetingId" element={<ClientMeetingView />} />
          <Route path="/area-cliente/atividades" element={<ClientTasks />} />
          <Route path="/area-cliente/dashboards" element={<ClientDashboards />} />
          <Route path="/area-cliente/financeiro" element={<ClientFinancial />} />
          <Route path="/clientes" element={<Clients />} />
          <Route path="/clientes/:id" element={<ClientDetails />} />
          <Route path="/clientes/:clientId/reunioes/:meetingId" element={<MeetingEditor />} />
          <Route path="/usuarios" element={<Users />} />
          <Route path="/financeiro" element={<Financial />} />
          <Route path="/ferramentas" element={<Ferramentas />} />
          <Route path="/ferramentas/projecao" element={<ProjecaoFaturamento />} />
          <Route path="/ferramentas/matriz-inside-sales" element={<MatrizInsideSales />} />
          <Route path="/ferramentas/matriz-ecommerce" element={<MatrizEcommerce />} />
          <Route path="/ferramentas/matriz-performance-pro" element={<MatrizPerformancePro />} />
          <Route path="/ferramentas/precificacao-mercado-livre" element={<PrecificacaoMercadoLivre />} />
          <Route path="/ferramentas/precificacao-produto" element={<PrecificacaoProduto />} />
          <Route path="/ferramentas/dre-projetado" element={<DREProjetado />} />
          <Route path="/atas/:token" element={<SharedMeeting />} />
          <Route path="/google-calendar/callback" element={<GoogleCalendarCallback />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;