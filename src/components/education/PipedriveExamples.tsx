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
      <Card className="bg-muted/30 border">
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

      {/* Carousel Section with Browser Frame */}
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
                    {/* Browser Frame */}
                    <div 
                      className="relative bg-muted/30 rounded-lg border shadow-sm p-2 cursor-pointer group"
                      onClick={() => handleZoom(item.title, item.image)}
                    >
                      {/* Browser Header */}
                      <div className="bg-muted/50 rounded-t h-8 flex items-center px-3 gap-2 mb-2">
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                          <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                        </div>
                        <span className="text-xs text-muted-foreground ml-2">Pipedrive CRM</span>
                      </div>
                      
                      {/* Image Container */}
                      <div className="relative bg-background rounded-b overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full max-h-[350px] object-contain"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
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

      {/* Feature Cards Grid - Neutral styling */}
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
                whileHover={{ scale: 1.01 }}
                className="h-full"
              >
                <Card className="h-full border hover:border-primary/30 transition-all hover:shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <h4 className="font-semibold text-sm">{feature.title}</h4>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                        <ul className="space-y-1 mt-2">
                          {feature.details.map((detail, idx) => (
                            <li key={idx} className="text-xs flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
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
