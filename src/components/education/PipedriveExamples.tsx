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
import { motion } from 'framer-motion';
import { 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  Monitor,
  ZoomIn,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import images from assets
import pipelineOverview from '@/assets/pipedrive/pipeline-overview.png';
import dealDetail from '@/assets/pipedrive/deal-detail.png';

interface PipedriveExample {
  id: string;
  title: string;
  description: string;
  image: string;
  highlights: { label: string; description: string }[];
}

const PIPEDRIVE_EXAMPLES: PipedriveExample[] = [
  {
    id: 'pipeline-overview',
    title: 'Visão Geral do Pipeline',
    description: 'Dashboard principal mostrando todas as etapas do funil de vendas com cards de negócios em cada coluna.',
    image: pipelineOverview,
    highlights: [
      { label: 'Colunas de Etapas', description: 'Cada coluna representa uma fase do funil (Lead, MQL, SQL, etc.)' },
      { label: 'Cards de Negócios', description: 'Cada card é um lead/negócio com informações resumidas' },
      { label: 'Valores Totais', description: 'Total de valor potencial em cada etapa do funil' },
      { label: 'Drag & Drop', description: 'Arraste cards entre colunas para mover leads no funil' },
    ],
  },
  {
    id: 'deal-detail',
    title: 'Detalhes do Negócio',
    description: 'Visão detalhada de um negócio específico com histórico de atividades e informações de contato.',
    image: dealDetail,
    highlights: [
      { label: 'Informações de Contato', description: 'Dados da empresa e pessoa de contato' },
      { label: 'Timeline de Atividades', description: 'Histórico de todas as interações e follow-ups' },
      { label: 'Campos Personalizados', description: 'Campos específicos para qualificação (faturamento, segmento, etc.)' },
      { label: 'Próximas Ações', description: 'Tarefas agendadas para este negócio' },
    ],
  },
];

export function PipedriveExamples() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const currentExample = PIPEDRIVE_EXAMPLES[currentIndex];

  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? PIPEDRIVE_EXAMPLES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev === PIPEDRIVE_EXAMPLES.length - 1 ? 0 : prev + 1));
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              Exemplos do Pipedrive
            </CardTitle>
            <div className="flex items-center gap-2">
              {PIPEDRIVE_EXAMPLES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    idx === currentIndex ? "bg-primary w-6" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                />
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Veja como o funil de vendas aparece no CRM Pipedrive
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Navigation Arrows */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm"
              onClick={handleNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            {/* Image Container */}
            <motion.div
              key={currentExample.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="relative group">
                <img
                  src={currentExample.image}
                  alt={currentExample.title}
                  className="w-full rounded-lg border shadow-sm cursor-pointer transition-transform hover:shadow-lg"
                  onClick={() => setIsZoomed(true)}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsZoomed(true)}
                    className="shadow-lg"
                  >
                    <ZoomIn className="h-4 w-4 mr-2" />
                    Ampliar
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    {currentExample.title}
                    <Badge variant="secondary" className="text-xs">
                      {currentIndex + 1}/{PIPEDRIVE_EXAMPLES.length}
                    </Badge>
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentExample.description}
                  </p>
                </div>

                {/* Highlights */}
                <div className="grid grid-cols-2 gap-2">
                  {currentExample.highlights.map((highlight, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-muted/50 border text-xs"
                    >
                      <div className="font-medium flex items-center gap-1">
                        <Info className="h-3 w-3 text-primary" />
                        {highlight.label}
                      </div>
                      <p className="text-muted-foreground mt-0.5">
                        {highlight.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {/* Zoom Dialog */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {currentExample.title}
            </DialogTitle>
          </DialogHeader>
          <img
            src={currentExample.image}
            alt={currentExample.title}
            className="w-full rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
