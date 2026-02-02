import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserCheck, 
  Phone, 
  Handshake, 
  Trophy,
  ArrowRight,
  Info,
  TrendingUp,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const FUNNEL_STAGES = [
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

export function FunnelExplainer() {
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Como Funciona o Funil de Vendas
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs"
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Ocultar detalhes
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Ver detalhes
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          O funil SDR representa a jornada do lead até a conversão em cliente
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Funnel */}
        <div className="relative">
          {/* Funnel Visual */}
          <div className="flex items-stretch gap-0 overflow-x-auto pb-4">
            <TooltipProvider delayDuration={200}>
              {FUNNEL_STAGES.map((stage, index) => {
                const Icon = stage.icon;
                const isExpanded = expandedStage === stage.id;
                const width = 100 - (index * 12); // Decreasing widths for funnel effect
                
                return (
                  <div key={stage.id} className="flex items-center flex-shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.button
                          onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
                          className={cn(
                            "relative flex flex-col items-center justify-center",
                            "px-4 py-4 rounded-xl transition-all duration-300",
                            "bg-gradient-to-br text-white shadow-lg",
                            stage.color,
                            isExpanded && "ring-2 ring-offset-2 ring-primary scale-105 z-10",
                            "hover:scale-105 hover:shadow-xl cursor-pointer"
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
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="font-semibold">{stage.name}</p>
                        <p className="text-xs text-muted-foreground">{stage.description}</p>
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

          {/* Expanded Stage Details */}
          <AnimatePresence>
            {expandedStage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                {FUNNEL_STAGES.filter(s => s.id === expandedStage).map(stage => {
                  const Icon = stage.icon;
                  return (
                    <div
                      key={stage.id}
                      className={cn(
                        "p-4 rounded-lg border mt-4",
                        stage.bgColor,
                        stage.borderColor
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-lg", stage.bgColor)}>
                          <Icon className={cn("h-5 w-5", stage.textColor)} />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{stage.name}</h4>
                            {stage.fullName && (
                              <Badge variant="secondary" className="text-xs">
                                {stage.fullName}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{stage.description}</p>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Taxa de conversão esperada: <strong>{stage.benchmarkRange}</strong>
                            </span>
                          </div>

                          <div className="mt-3 pt-3 border-t border-border/50">
                            <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                              <Info className="h-3 w-3" /> Dicas
                            </h5>
                            <ul className="space-y-1">
                              {stage.tips.map((tip, idx) => (
                                <li key={idx} className="text-xs flex items-start gap-2">
                                  <span className={cn("mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0", stage.textColor.replace('text-', 'bg-'))} />
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Additional Details */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
