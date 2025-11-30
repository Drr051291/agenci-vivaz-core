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
import ClientTasks from "./pages/client-area/ClientTasks";
import ClientDashboards from "./pages/client-area/ClientDashboards";
import Collaborators from "./pages/Collaborators";
import Integrations from "./pages/Integrations";
import Messages from "./pages/Messages";
import Users from "./pages/Users";
import SharedMeeting from "./pages/SharedMeeting";
import NotFound from "./pages/NotFound";
import Financial from "./pages/Financial";

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
          <Route path="/area-cliente/atividades" element={<ClientTasks />} />
          <Route path="/area-cliente/dashboards" element={<ClientDashboards />} />
          <Route path="/clientes" element={<Clients />} />
          <Route path="/clientes/:id" element={<ClientDetails />} />
          <Route path="/clientes/:clientId/reunioes/:meetingId" element={<MeetingEditor />} />
          <Route path="/colaboradores" element={<Collaborators />} />
          <Route path="/integracoes" element={<Integrations />} />
          <Route path="/integracoes/:id" element={<Integrations />} />
          <Route path="/mensagens" element={<Messages />} />
          <Route path="/usuarios" element={<Users />} />
          <Route path="/financeiro" element={<Financial />} />
          <Route path="/atas/:token" element={<SharedMeeting />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
