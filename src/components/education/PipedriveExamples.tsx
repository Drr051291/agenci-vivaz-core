import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { motion } from 'framer-motion';
import { 
  Monitor,
  ZoomIn,
  Brain,
  Heart,
  User,
  Settings,
  Calendar,
  MessageSquare,
  FileText,
  BarChart3,
  Clock,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import images from assets
import pipelineOverview from '@/assets/pipedrive/pipeline-overview.png';
import dealDetail from '@/assets/pipedrive/deal-detail.png';

interface CRMFeatureCard {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  details: string[];
  color: string;
}

const CRM_FEATURES: CRMFeatureCard[] = [
  {
    id: 'contact-info',
    title: 'Informações de Contato',
    icon: User,
    description: 'Dados completos da empresa e pessoa de contato para comunicação efetiva.',
    details: [
      'Nome do contato e cargo',
      'Email e telefone',
      'Nome da empresa e CNPJ',
      'Website e redes sociais',
    ],
    color: 'bg-blue-500/10 border-blue-500/30 text-blue-600',
  },
  {
    id: 'custom-fields',
    title: 'Campos Personalizados',
    icon: Settings,
    description: 'Campos específicos para qualificação e segmentação de leads.',
    details: [
      'Faturamento mensal estimado',
      'Número de funcionários',
      'Segmento de atuação',
      'Origem do lead (campanha/canal)',
    ],
    color: 'bg-purple-500/10 border-purple-500/30 text-purple-600',
  },
  {
    id: 'activities',
    title: 'Timeline de Atividades',
    icon: Clock,
    description: 'Histórico completo de todas as interações com o lead.',
    details: [
      'Emails enviados e recebidos',
      'Ligações realizadas',
      'Reuniões agendadas',
      'Notas e observações',
    ],
    color: 'bg-teal-500/10 border-teal-500/30 text-teal-600',
  },
  {
    id: 'next-actions',
    title: 'Próximas Ações',
    icon: Calendar,
    description: 'Tarefas e follow-ups agendados para manter o lead engajado.',
    details: [
      'Lembretes automáticos',
      'Tarefas com prazo',
      'Follow-up estruturado',
      'Integração com calendário',
    ],
    color: 'bg-orange-500/10 border-orange-500/30 text-orange-600',
  },
  {
    id: 'notes',
    title: 'Notas e Observações',
    icon: MessageSquare,
    description: 'Registros de conversas e informações importantes do lead.',
    details: [
      'Notas de reunião',
      'Objeções identificadas',
      'Interesses específicos',
      'Próximos passos acordados',
    ],
    color: 'bg-green-500/10 border-green-500/30 text-green-600',
  },
  {
    id: 'documents',
    title: 'Documentos',
    icon: FileText,
    description: 'Propostas, contratos e arquivos anexados ao negócio.',
    details: [
      'Propostas comerciais',
      'Contratos assinados',
      'Apresentações',
      'Materiais de apoio',
    ],
    color: 'bg-rose-500/10 border-rose-500/30 text-rose-600',
  },
];

const CAROUSEL_IMAGES = [
  {
    id: 'pipeline',
    title: 'Visão Geral do Pipeline',
    image: pipelineOverview,
    description: 'Dashboard principal com todas as etapas do funil de vendas.',
  },
  {
    id: 'deal',
    title: 'Detalhes do Negócio',
    image: dealDetail,
    description: 'Visão detalhada de um negócio com histórico e informações.',
  },
];

export function PipedriveExamples() {
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomedImage, setZoomedImage] = useState({ title: '', image: '' });

  const handleZoom = (title: string, image: string) => {
    setZoomedImage({ title, image });
    setIsZoomed(true);
  };

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <div className="flex items-center gap-1">
                <Brain className="h-6 w-6 text-primary" />
                <Heart className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">O CRM é o Cérebro e Coração do Processo Comercial</h2>
              <p className="text-muted-foreground">
                O CRM (Customer Relationship Management) centraliza todas as informações e interações com seus leads e clientes. 
                É nele que você registra cada contato, acompanha o progresso no funil e garante que nenhuma oportunidade seja perdida.
                <strong className="text-foreground"> Um CRM bem utilizado é a diferença entre vendas consistentes e oportunidades desperdiçadas.</strong>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Carousel Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            Exemplos do CRM Pipedrive
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Navegue pelas telas principais do CRM para entender a estrutura
          </p>
        </CardHeader>
        <CardContent>
          <Carousel className="w-full">
            <CarouselContent>
              {CAROUSEL_IMAGES.map((item) => (
                <CarouselItem key={item.id}>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    <div 
                      className="relative group cursor-pointer"
                      onClick={() => handleZoom(item.title, item.image)}
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full max-h-[400px] object-contain rounded-lg border shadow-sm transition-transform group-hover:shadow-lg"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-lg">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="shadow-lg"
                        >
                          <ZoomIn className="h-4 w-4 mr-2" />
                          Ampliar
                        </Button>
                      </div>
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        </CardContent>
      </Card>

      {/* Feature Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Elementos Essenciais do CRM</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Cada elemento abaixo representa uma funcionalidade crítica para gestão de leads e acompanhamento de vendas.
        </p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CRM_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.id}
                whileHover={{ scale: 1.02 }}
                className="h-full"
              >
                <Card className={cn("h-full border-2 transition-all hover:shadow-md", feature.color.split(' ')[0], feature.color.split(' ')[1])}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg", feature.color.split(' ')[0])}>
                        <Icon className={cn("h-5 w-5", feature.color.split(' ')[2])} />
                      </div>
                      <div className="flex-1 space-y-2">
                        <h4 className="font-semibold text-sm">{feature.title}</h4>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                        <ul className="space-y-1 mt-2">
                          {feature.details.map((detail, idx) => (
                            <li key={idx} className="text-xs flex items-center gap-1.5">
                              <span className={cn("w-1.5 h-1.5 rounded-full", feature.color.split(' ')[0].replace('/10', ''))} />
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Zoom Dialog */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              {zoomedImage.title}
            </DialogTitle>
          </DialogHeader>
          <img
            src={zoomedImage.image}
            alt={zoomedImage.title}
            className="w-full rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
