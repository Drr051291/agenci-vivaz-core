import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Phone, 
  MessageCircle, 
  Linkedin, 
  Calendar,
  CheckCircle2,
  XCircle,
  ArrowDown,
  Clock,
  Target,
  UserCheck,
  AlertTriangle,
  PhoneCall,
  Send,
  UserPlus,
  Timer,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CadenceStep {
  id: string;
  day: number;
  title: string;
  description: string;
  actions: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    detail: string;
    tool?: string;
  }[];
  outcomes?: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    nextStep?: string;
    color: string;
  }[];
  isDecision?: boolean;
  isFinal?: boolean;
}

const CADENCE_STEPS: CadenceStep[] = [
  {
    id: 'qualification',
    day: 0,
    title: 'Qualificação MQL',
    description: 'Lead atendeu aos critérios mínimos de qualificação',
    actions: [
      {
        icon: Target,
        label: 'Critérios Brandspot',
        detail: 'Receita mínima: R$ 50.000.000/ano',
      },
      {
        icon: Target,
        label: 'Critérios Sétima',
        detail: 'Investimento em marketing: R$ 100.000+',
      },
    ],
  },
  {
    id: 'day1-contact',
    day: 1,
    title: 'Dia 1 — Primeiro Contato',
    description: 'Abordar o MQL o mais rápido possível após qualificação',
    actions: [
      {
        icon: PhoneCall,
        label: 'Ligação Telefônica',
        detail: 'Objetivo: Agendar uma call de apresentação',
        tool: 'api4com',
      },
      {
        icon: MessageCircle,
        label: 'WhatsApp (se não atender)',
        detail: 'Mensagem de apresentação + proposta de agenda',
      },
      {
        icon: CheckCircle2,
        label: 'Registrar no CRM',
        detail: 'Documentar tentativa e resultado',
        tool: 'Pipedrive',
      },
    ],
    outcomes: [
      {
        icon: UserCheck,
        label: 'Conseguiu contato',
        nextStep: 'decision',
        color: 'text-green-500',
      },
      {
        icon: Clock,
        label: 'Sem resposta',
        nextStep: 'day1-linkedin',
        color: 'text-amber-500',
      },
    ],
    isDecision: true,
  },
  {
    id: 'decision',
    day: 1,
    title: 'Resultado do Contato',
    description: 'Definir próximo passo baseado na conversa',
    actions: [
      {
        icon: Calendar,
        label: 'Agendar Retorno',
        detail: 'Criar atividade no CRM para follow-up',
      },
      {
        icon: UserCheck,
        label: 'Mover para SQL',
        detail: 'Se qualificado para reunião',
      },
      {
        icon: XCircle,
        label: 'Marcar como Perdido',
        detail: 'Se não há interesse ou fit',
      },
    ],
  },
  {
    id: 'day1-linkedin',
    day: 1,
    title: 'Dia 1 — LinkedIn',
    description: 'Iniciar conexão profissional em paralelo',
    actions: [
      {
        icon: Linkedin,
        label: 'Pesquisar no LinkedIn',
        detail: 'Encontrar perfil do decisor',
      },
      {
        icon: UserPlus,
        label: 'Enviar Convite',
        detail: 'Nota personalizada mencionando empresa',
      },
    ],
  },
  {
    id: 'day2',
    day: 2,
    title: 'Dia 2 — Segunda Tentativa',
    description: 'Intensificar abordagem multicanal',
    actions: [
      {
        icon: PhoneCall,
        label: 'Ligação WhatsApp',
        detail: 'Tentar contato por voz via WhatsApp',
      },
      {
        icon: Send,
        label: 'Mensagem LinkedIn',
        detail: 'Se convite foi aceito, enviar mensagem',
      },
      {
        icon: CheckCircle2,
        label: 'Registrar no CRM',
        detail: 'Documentar todas as tentativas',
        tool: 'Pipedrive',
      },
    ],
    outcomes: [
      {
        icon: UserCheck,
        label: 'Conseguiu contato',
        nextStep: 'decision',
        color: 'text-green-500',
      },
      {
        icon: Timer,
        label: 'Sem resposta',
        nextStep: 'wait',
        color: 'text-amber-500',
      },
    ],
    isDecision: true,
  },
  {
    id: 'wait',
    day: 3,
    title: 'Dias 3-4 — Período de Espera',
    description: 'Aguardar 2 dias antes da próxima tentativa',
    actions: [
      {
        icon: Clock,
        label: 'Aguardar Resposta',
        detail: 'Dar tempo para o lead responder',
      },
      {
        icon: Linkedin,
        label: 'Monitorar LinkedIn',
        detail: 'Verificar se convite foi aceito',
      },
    ],
  },
  {
    id: 'day5',
    day: 5,
    title: 'Dia 5 — Última Tentativa',
    description: 'Contato final antes de encerrar cadência',
    actions: [
      {
        icon: PhoneCall,
        label: 'Ligação Telefônica',
        detail: 'Última tentativa por telefone',
        tool: 'api4com',
      },
      {
        icon: MessageCircle,
        label: 'WhatsApp Final',
        detail: 'Mensagem de última tentativa',
      },
    ],
    outcomes: [
      {
        icon: UserCheck,
        label: 'Conseguiu contato',
        nextStep: 'decision',
        color: 'text-green-500',
      },
      {
        icon: Ban,
        label: 'Sem resposta',
        nextStep: 'lost',
        color: 'text-destructive',
      },
    ],
    isDecision: true,
  },
  {
    id: 'lost',
    day: 5,
    title: 'Encerramento',
    description: 'Finalizar cadência sem sucesso',
    actions: [
      {
        icon: XCircle,
        label: 'Marcar como Perdido',
        detail: 'Motivo: Sem contato após 5 dias',
      },
      {
        icon: CheckCircle2,
        label: 'Documentar no CRM',
        detail: 'Registrar histórico completo',
        tool: 'Pipedrive',
      },
    ],
    isFinal: true,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface ContactCadenceFlowProps {
  clientName?: string;
}

export function ContactCadenceFlow({ clientName }: ContactCadenceFlowProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            Cadência de Contato — MQL
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Fluxo de 5 dias úteis para conversão de MQLs {clientName && `(${clientName})`}
          </p>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          5 dias úteis
        </Badge>
      </div>

      {/* Timeline Legend */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Ação</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Decisão</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Sucesso</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span>Encerramento</span>
        </div>
      </div>

      {/* Flow Cards */}
      <motion.div 
        className="relative space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {CADENCE_STEPS.map((step, index) => (
          <motion.div key={step.id} variants={itemVariants}>
            {/* Connector */}
            {index > 0 && (
              <div className="flex justify-center -mt-2 mb-2">
                <ArrowDown className="h-6 w-6 text-muted-foreground/50" />
              </div>
            )}

            <Card className={cn(
              "relative overflow-hidden transition-all duration-300 hover:shadow-md",
              step.isFinal && "border-destructive/30 bg-destructive/5",
              step.id === 'qualification' && "border-primary/30 bg-primary/5",
              step.id === 'decision' && "border-green-500/30 bg-green-500/5",
              step.id === 'wait' && "border-amber-500/30 bg-amber-500/5"
            )}>
              {/* Day Badge */}
              {step.day > 0 && (
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="font-mono">
                    Dia {step.day}
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  {step.isFinal ? (
                    <XCircle className="h-5 w-5 text-destructive" />
                  ) : step.id === 'qualification' ? (
                    <Target className="h-5 w-5 text-primary" />
                  ) : step.id === 'decision' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : step.id === 'wait' ? (
                    <Clock className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Phone className="h-5 w-5 text-primary" />
                  )}
                  {step.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Actions Grid */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {step.actions.map((action, actionIndex) => {
                    const ActionIcon = action.icon;
                    return (
                      <div 
                        key={actionIndex}
                        className="flex items-start gap-3 p-3 rounded-lg bg-background border hover:border-primary/30 transition-colors"
                      >
                        <div className="p-2 rounded-lg bg-primary/10">
                          <ActionIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{action.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {action.detail}
                          </p>
                          {action.tool && (
                            <Badge variant="outline" className="mt-2 text-[10px]">
                              {action.tool}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Outcomes */}
                {step.outcomes && (
                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Possíveis Resultados
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {step.outcomes.map((outcome, outcomeIndex) => {
                        const OutcomeIcon = outcome.icon;
                        return (
                          <div 
                            key={outcomeIndex}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border"
                          >
                            <OutcomeIcon className={cn("h-4 w-4", outcome.color)} />
                            <span className="text-sm">{outcome.label}</span>
                            {outcome.nextStep && (
                              <ArrowDown className="h-3 w-3 text-muted-foreground ml-1" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Summary */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Regras da Cadência</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• A cadência acontece em <strong>5 dias úteis</strong> (segunda a sexta)</li>
                <li>• Todas as atividades devem ser registradas no <strong>Pipedrive</strong></li>
                <li>• Ligações são feitas pelo <strong>api4com</strong></li>
                <li>• Após 5 dias sem contato, marcar como <strong>Perdido</strong></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
