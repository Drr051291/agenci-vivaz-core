import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BibliotecaTab } from "@/components/education/BibliotecaTab";
import { PlaybookSDRTab } from "@/components/education/PlaybookSDRTab";
import { BookOpen, Target } from "lucide-react";

interface ClientEducationProps {
  clientId: string;
  clientName?: string;
}

export function ClientEducation({ clientId, clientName }: ClientEducationProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Educação & Processos</h2>
          <p className="text-sm text-muted-foreground">
            Recursos de treinamento e documentação de processos para {clientName || 'este cliente'}
          </p>
        </div>
      </div>

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
          <PlaybookSDRTab clientId={clientId} clientName={clientName} />
        </TabsContent>

        <TabsContent value="biblioteca" className="mt-4">
          <BibliotecaTab clientId={clientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
