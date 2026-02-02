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
  ArrowRight,
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
    type: 'success' | 'continue' | 'lost';
  }[];
  isDecision?: boolean;
  isFinal?: boolean;
  isMandatoryDecision?: boolean;
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
        type: 'success',
      },
      {
        icon: Clock,
        label: 'Sem resposta',
        nextStep: 'day1-linkedin',
        type: 'continue',
      },
    ],
    isDecision: true,
  },
  {
    id: 'decision',
    day: 1,
    title: 'Decisão Obrigatória',
    description: 'Ao conseguir contato, uma dessas ações DEVE ser tomada',
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
    isMandatoryDecision: true,
  },
  {
    id: 'day1-linkedin',
    day: 1,
    title: 'Dia 1 — LinkedIn (Sem Contato)',
    description: 'Se não conseguiu contato, iniciar conexão profissional',
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
        type: 'success',
      },
      {
        icon: Timer,
        label: 'Sem resposta',
        nextStep: 'wait',
        type: 'continue',
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
        type: 'success',
      },
      {
        icon: Ban,
        label: 'Sem resposta',
        nextStep: 'lost',
        type: 'lost',
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
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
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
        <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border">
          5 dias úteis
        </Badge>
      </div>

      {/* Timeline Legend */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-muted-foreground/50" />
          <span>Ação</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-primary/60" />
          <span>Decisão Obrigatória</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-success/60" />
          <span>Sucesso</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-destructive/60" />
          <span>Encerramento</span>
        </div>
      </div>

      {/* Flow Cards */}
      <motion.div 
        className="relative space-y-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {CADENCE_STEPS.map((step, index) => (
          <motion.div key={step.id} variants={itemVariants}>
            {/* Connector */}
            {index > 0 && (
              <div className="flex justify-center -mt-1 mb-1">
                <ArrowDown className="h-5 w-5 text-border" />
              </div>
            )}

            <Card className={cn(
              "relative overflow-hidden transition-all duration-200",
              step.isFinal && "border-destructive/40",
              step.id === 'qualification' && "border-primary/40",
              step.isMandatoryDecision && "border-primary/50 bg-primary/5",
              step.id === 'wait' && "border-muted-foreground/30"
            )}>
              {/* Day Badge */}
              {step.day > 0 && (
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="font-mono text-xs">
                    Dia {step.day}
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  {step.isFinal ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : step.id === 'qualification' ? (
                    <Target className="h-4 w-4 text-primary" />
                  ) : step.isMandatoryDecision ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : step.id === 'wait' ? (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  )}
                  {step.title}
                  {step.isMandatoryDecision && (
                    <Badge variant="default" className="text-[10px] ml-2">
                      Obrigatório
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </CardHeader>

              <CardContent className="space-y-3 pb-4">
                {/* Actions Grid */}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {step.actions.map((action, actionIndex) => {
                    const ActionIcon = action.icon;
                    return (
                      <div 
                        key={actionIndex}
                        className="flex items-start gap-2 p-2.5 rounded-lg bg-background border hover:border-primary/30 transition-colors"
                      >
                        <div className="p-1.5 rounded bg-muted">
                          <ActionIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs">{action.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                            {action.detail}
                          </p>
                          {action.tool && (
                            <Badge variant="outline" className="mt-1.5 text-[9px] h-4">
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
                  <div className="pt-2 border-t">
                    <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Resultado
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {step.outcomes.map((outcome, outcomeIndex) => {
                        const OutcomeIcon = outcome.icon;
                        return (
                          <div 
                            key={outcomeIndex}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs",
                              outcome.type === 'success' && "bg-success/10 border-success/30",
                              outcome.type === 'continue' && "bg-muted/50 border-border",
                              outcome.type === 'lost' && "bg-destructive/10 border-destructive/30"
                            )}
                          >
                            <OutcomeIcon className={cn(
                              "h-3.5 w-3.5",
                              outcome.type === 'success' && "text-success",
                              outcome.type === 'continue' && "text-muted-foreground",
                              outcome.type === 'lost' && "text-destructive"
                            )} />
                            <span>{outcome.label}</span>
                            {outcome.nextStep && (
                              <ArrowRight className="h-3 w-3 text-muted-foreground ml-0.5" />
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
      <Card className="bg-muted/20 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm">Regras da Cadência</p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                <li>• A cadência acontece em <strong>5 dias úteis</strong> (segunda a sexta)</li>
                <li>• <strong>Conseguiu contato?</strong> → Obrigatório: Retorno, SQL ou Perdido</li>
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
