import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useClientUser } from "@/hooks/useClientUser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BibliotecaTab } from "@/components/education/BibliotecaTab";
import { PlaybookSDRTab } from "@/components/education/PlaybookSDRTab";
import { BookOpen, Target, GraduationCap } from "lucide-react";

const ClientEducation = () => {
  const { clientId, clientData, loading: authLoading, error } = useClientUser();

  usePageMeta({
    title: "Trilhas e Processos - Área do Cliente",
    description: "Acesse treinamentos, processos e materiais de apoio",
    keywords: "trilhas, processos, treinamento, playbook, área do cliente, vivaz",
  });

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">{error}</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Trilhas e Processos</h1>
          </div>
          <p className="text-muted-foreground">
            Acesse treinamentos, processos e materiais de apoio para {clientData?.company_name || 'sua empresa'}
          </p>
        </div>

        {clientId ? (
          <Tabs defaultValue="playbook" className="w-full">
            <TabsList>
              <TabsTrigger value="playbook" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Playbook SDR
              </TabsTrigger>
              <TabsTrigger value="biblioteca" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Biblioteca
              </TabsTrigger>
            </TabsList>

            <TabsContent value="playbook" className="mt-4">
              {/* Client can only view, not edit the playbook */}
              <PlaybookSDRTab clientId={clientId} clientName={clientData?.company_name} readOnly />
            </TabsContent>

            <TabsContent value="biblioteca" className="mt-4">
              {/* Client can view and add materials to the library */}
              <BibliotecaTabClient clientId={clientId} clientName={clientData?.company_name} />
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhum conteúdo disponível ainda.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

// Wrapper component that allows clients to add materials
function BibliotecaTabClient({ clientId, clientName }: { clientId: string; clientName?: string }) {
  return <BibliotecaTab clientId={clientId} clientName={clientName} allowClientUpload />;
}

export default ClientEducation;
