import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Target } from 'lucide-react';
import { BibliotecaTab } from '@/components/education/BibliotecaTab';
import { PlaybookSDRTab } from '@/components/education/PlaybookSDRTab';
import { usePageMeta } from '@/hooks/usePageMeta';
import { supabase } from '@/integrations/supabase/client';

export default function EducacaoProcessos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'biblioteca';
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);

  usePageMeta({
    title: 'Educação & Processos - Hub Vivaz',
    description: 'Biblioteca de recursos e Playbook SDR',
    keywords: 'educação, treinamento, processos, sdr, playbook, vivaz',
  });

  useEffect(() => {
    const fetchClients = async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, company_name')
        .eq('status', 'active')
        .order('company_name');
      setClients(data || []);
    };
    fetchClients();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Educação & Processos</h1>
          <p className="text-muted-foreground text-sm">
            Biblioteca de recursos e documentação de processos
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="biblioteca" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Biblioteca
            </TabsTrigger>
            <TabsTrigger value="playbook" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Playbook SDR
            </TabsTrigger>
          </TabsList>

          <TabsContent value="biblioteca" className="mt-4">
            <BibliotecaTab />
          </TabsContent>

          <TabsContent value="playbook" className="mt-4">
            <PlaybookSDRTab clients={clients} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
