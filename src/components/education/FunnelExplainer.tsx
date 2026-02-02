import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserCheck, 
  Phone, 
  Handshake, 
  Trophy,
  ArrowRight,
  TrendingUp,
  Filter,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FunnelStage {
  id: string;
  name: string;
  fullName?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  description: string;
  benchmarkRange: string;
  tips: string[];
}

const FUNNEL_STAGES: FunnelStage[] = [
  {
    id: 'lead',
    name: 'Lead',
    icon: Users,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-500/30',
    description: 'Todo contato que entra no CRM via formulário, landing page ou prospecção.',
    benchmarkRange: '100%',
    tips: ['Origem do lead deve ser rastreada', 'Responda em até 5 minutos para 21x mais conversão'],
  },
  {
    id: 'mql',
    name: 'MQL',
    fullName: 'Marketing Qualified Lead',
    icon: UserCheck,
    color: 'from-cyan-500 to-cyan-600',
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-600',
    borderColor: 'border-cyan-500/30',
    description: 'Lead que passou pela qualificação inicial de marketing (fit + interesse).',
    benchmarkRange: '15-35%',
    tips: ['Critérios variam por cliente', 'Verificar faturamento, segmento e interesse'],
  },
  {
    id: 'sql',
    name: 'SQL',
    fullName: 'Sales Qualified Lead',
    icon: Phone,
    color: 'from-teal-500 to-teal-600',
    bgColor: 'bg-teal-500/10',
    textColor: 'text-teal-600',
    borderColor: 'border-teal-500/30',
    description: 'Lead qualificado para vendas — reunião agendada ou call confirmado.',
    benchmarkRange: '15-30%',
    tips: ['Reunião deve estar agendada', 'SDR fez handoff para closer'],
  },
  {
    id: 'oportunidade',
    name: 'Oportunidade',
    icon: Handshake,
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-600',
    borderColor: 'border-emerald-500/30',
    description: 'Proposta enviada ou demonstração realizada — negociação em andamento.',
    benchmarkRange: '50-70%',
    tips: ['Proposta comercial enviada', 'Follow-up estruturado'],
  },
  {
    id: 'contrato',
    name: 'Contrato',
    icon: Trophy,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-600',
    borderColor: 'border-green-500/30',
    description: 'Negócio fechado — contrato assinado e cliente convertido.',
    benchmarkRange: '12-28%',
    tips: ['Contrato assinado', 'Onboarding iniciado'],
  },
];

interface FunnelExplainerProps {
  onStageClick?: (stageId: string) => void;
}

export function FunnelExplainer({ onStageClick }: FunnelExplainerProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Como Funciona o Funil de Vendas
          </CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          O funil SDR representa a jornada do lead até a conversão. Clique em cada etapa para ver detalhes.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Funnel */}
        <div className="relative">
          <div className="flex items-stretch gap-0 overflow-x-auto pb-4">
            <TooltipProvider delayDuration={200}>
              {FUNNEL_STAGES.map((stage, index) => {
                const Icon = stage.icon;
                const width = 100 - (index * 12);
                
                return (
                  <div key={stage.id} className="flex items-center flex-shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.button
                          onClick={() => onStageClick?.(stage.id)}
                          className={cn(
                            "relative flex flex-col items-center justify-center",
                            "px-4 py-4 rounded-xl transition-all duration-300",
                            "bg-gradient-to-br text-white shadow-lg",
                            stage.color,
                            "hover:scale-105 hover:shadow-xl cursor-pointer",
                            "group"
                          )}
                          style={{ 
                            minWidth: `${Math.max(100, width + 20)}px`,
                            clipPath: index === FUNNEL_STAGES.length - 1 
                              ? undefined 
                              : 'polygon(0 0, 90% 0, 100% 50%, 90% 100%, 0 100%, 10% 50%)'
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Icon className="h-6 w-6 mb-1" />
                          <span className="font-bold text-sm">{stage.name}</span>
                          {stage.fullName && (
                            <span className="text-[10px] opacity-80">{stage.fullName}</span>
                          )}
                          <ExternalLink className="h-3 w-3 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="font-semibold">{stage.name}</p>
                        <p className="text-xs text-muted-foreground">{stage.description}</p>
                        <p className="text-xs text-primary mt-1">Clique para ver detalhes →</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    {index < FUNNEL_STAGES.length - 1 && (
                      <div className="flex flex-col items-center mx-1">
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {stage.benchmarkRange}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </TooltipProvider>
          </div>
        </div>

        {/* Quick Info Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 border">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Papel do SDR
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Qualificar leads rapidamente</li>
              <li>• Seguir cadência de contato</li>
              <li>• Registrar interações no CRM</li>
              <li>• Agendar reuniões com closers</li>
            </ul>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50 border">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Métricas Importantes
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Taxa de conversão por etapa</li>
              <li>• Tempo médio em cada estágio</li>
              <li>• Volume de leads qualificados</li>
              <li>• Motivos de perda</li>
            </ul>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50 border">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Boas Práticas
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Responder em até 5 minutos</li>
              <li>• Usar templates padronizados</li>
              <li>• Documentar todas as interações</li>
              <li>• Fazer follow-up consistente</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { FUNNEL_STAGES };
export type { FunnelStage };
