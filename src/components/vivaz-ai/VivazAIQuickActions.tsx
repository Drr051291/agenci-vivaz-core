import { 
  BarChart3, 
  Search, 
  TrendingUp, 
  Target, 
  FileText, 
  Clock,
  Sparkles,
  Lightbulb
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type QuickActionType = 
  | 'monthly_report' 
  | 'bottleneck_analysis' 
  | 'improvement_suggestions' 
  | 'goal_projection'
  | 'meeting_summary'
  | 'activity_status';

interface QuickAction {
  id: QuickActionType;
  label: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
  gradient: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'monthly_report',
    label: 'Relatório Mensal',
    description: 'Resumo executivo completo do período',
    icon: <BarChart3 className="h-5 w-5" />,
    prompt: 'Gere um relatório mensal completo com análise de performance, principais métricas, comparativo com período anterior e recomendações estratégicas.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'bottleneck_analysis',
    label: 'Analisar Gargalos',
    description: 'Identifica pontos fracos do funil',
    icon: <Search className="h-5 w-5" />,
    prompt: 'Analise os gargalos no funil de vendas/marketing. Identifique as etapas com pior performance, as causas prováveis e sugira ações corretivas prioritárias.',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    id: 'improvement_suggestions',
    label: 'Sugestões de Melhoria',
    description: 'Recomendações baseadas em dados',
    icon: <Lightbulb className="h-5 w-5" />,
    prompt: 'Com base nos dados de performance, forneça sugestões práticas de melhoria priorizadas por impacto e facilidade de implementação.',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    id: 'goal_projection',
    label: 'Projeção de Metas',
    description: 'Análise de viabilidade de objetivos',
    icon: <Target className="h-5 w-5" />,
    prompt: 'Analise a viabilidade das metas atuais com base no histórico e tendências. Projete cenários otimista, realista e pessimista.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    id: 'meeting_summary',
    label: 'Resumo de Reuniões',
    description: 'Síntese das últimas atas',
    icon: <FileText className="h-5 w-5" />,
    prompt: 'Faça um resumo consolidado das últimas reuniões, destacando decisões tomadas, ações pendentes e próximos passos.',
    gradient: 'from-indigo-500 to-violet-500',
  },
  {
    id: 'activity_status',
    label: 'Status de Atividades',
    description: 'Overview de tarefas e prazos',
    icon: <Clock className="h-5 w-5" />,
    prompt: 'Apresente um overview das atividades em andamento, tarefas pendentes, prazos próximos e possíveis riscos de atraso.',
    gradient: 'from-amber-500 to-yellow-500',
  },
];

interface VivazAIQuickActionsProps {
  onSelectAction: (prompt: string, actionId: QuickActionType) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function VivazAIQuickActions({ 
  onSelectAction, 
  disabled,
  compact = false 
}: VivazAIQuickActionsProps) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {QUICK_ACTIONS.map((action, index) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelectAction(action.prompt, action.id)}
            disabled={disabled}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
              "bg-muted/50 hover:bg-muted border border-border/50",
              "transition-all duration-200 hover:scale-105",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            )}
          >
            <span className={cn(
              "p-1 rounded-full bg-gradient-to-br text-white",
              action.gradient
            )}>
              {action.icon}
            </span>
            {action.label}
          </motion.button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4" />
        <span>Ações Rápidas</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {QUICK_ACTIONS.map((action, index) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelectAction(action.prompt, action.id)}
            disabled={disabled}
            className={cn(
              "group relative flex flex-col items-start gap-2 p-4 rounded-xl",
              "bg-card border border-border/50 hover:border-primary/50",
              "transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            )}
          >
            <div className={cn(
              "p-2 rounded-lg bg-gradient-to-br text-white",
              action.gradient
            )}>
              {action.icon}
            </div>
            
            <div className="text-left">
              <h4 className="font-medium text-sm group-hover:text-primary transition-colors">
                {action.label}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {action.description}
              </p>
            </div>

            <div className={cn(
              "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity",
              "bg-gradient-to-br",
              action.gradient
            )} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
