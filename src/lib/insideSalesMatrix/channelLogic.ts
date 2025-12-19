// Channel Logic for Inside Sales Matrix
// Benchmarks, investment density, and dynamic targets based on channel

import { InsideSalesInputs } from './calc';
import { Targets } from './status';
import { differenceInDays } from 'date-fns';

// ============== CHANNEL DEFINITIONS ==============

export type ChannelId = 'landing' | 'lead_nativo' | 'whatsapp' | 'outro';
export type FormComplexity = 'poucas' | 'muitas' | 'certas';

export interface ChannelBenchmark {
  id: ChannelId;
  label: string;
  description: string;
  cvrClickLead: { baseline: number; range: [number, number] };
  cplMultiplier: number;
  leadQuality: 'alta' | 'variavel' | 'baixa' | 'indefinida';
  leadToMqlExpected?: number;
  // For lead_nativo, quality depends on form questions
  qualityFactors?: Record<FormComplexity, { leadToMql: number }>;
}

export const CHANNEL_BENCHMARKS: Record<ChannelId, ChannelBenchmark> = {
  landing: {
    id: 'landing',
    label: 'Landing Page',
    description: 'Taxa menor (~4-6%), leads mais qualificados por fricção',
    cvrClickLead: { baseline: 5, range: [3, 8] },
    cplMultiplier: 1.3,
    leadQuality: 'alta',
    leadToMqlExpected: 0.30,
  },
  lead_nativo: {
    id: 'lead_nativo',
    label: 'Lead Nativo',
    description: 'Alta conversão (~13%), qualidade depende das perguntas',
    cvrClickLead: { baseline: 13, range: [10, 20] },
    cplMultiplier: 0.7,
    leadQuality: 'variavel',
    qualityFactors: {
      poucas: { leadToMql: 0.15 },
      muitas: { leadToMql: 0.28 },
      certas: { leadToMql: 0.35 },
    },
  },
  whatsapp: {
    id: 'whatsapp',
    label: 'WhatsApp',
    description: 'Custo baixo, requer automação para qualificar',
    cvrClickLead: { baseline: 25, range: [15, 50] },
    cplMultiplier: 0.5,
    leadQuality: 'baixa',
    leadToMqlExpected: 0.12,
  },
  outro: {
    id: 'outro',
    label: 'Outro',
    description: 'Canal não especificado',
    cvrClickLead: { baseline: 6, range: [3, 15] },
    cplMultiplier: 1.0,
    leadQuality: 'indefinida',
  },
};

// UI-friendly channel list
export const CHANNELS_LIST = [
  { value: 'landing', label: 'Landing Page', description: 'Taxa menor (~4-6%), leads mais qualificados' },
  { value: 'lead_nativo', label: 'Lead Nativo', description: 'Alta conversão (~13%), qualidade depende do formulário' },
  { value: 'whatsapp', label: 'WhatsApp', description: 'Custo baixo, requer qualificação via atendimento' },
  { value: 'outro', label: 'Outro', description: 'Canal não especificado' },
];

// Form complexity options for lead_nativo
export const FORM_COMPLEXITY_OPTIONS = [
  { value: 'poucas', label: 'Poucas perguntas', description: 'Nome, email, telefone (3-4 campos)' },
  { value: 'muitas', label: 'Muitas perguntas', description: '+5 campos de dados' },
  { value: 'certas', label: 'Perguntas de qualificação', description: 'Budget, decisor, timeline (BANT)' },
];

// ============== INVESTMENT DENSITY ==============

export interface InvestmentDensity {
  dailyInvestment: number;
  level: 'baixo' | 'adequado' | 'alto';
  warning?: string;
  confidencePenalty: number;
}

export function calculateInvestmentDensity(
  investimento: number | undefined,
  periodDays: number
): InvestmentDensity | null {
  if (!investimento || !periodDays || periodDays <= 0) {
    return null;
  }

  const daily = investimento / periodDays;

  if (daily < 30) {
    return {
      dailyInvestment: daily,
      level: 'baixo',
      warning: `Investimento diluído (R$ ${daily.toFixed(0)}/dia em ${periodDays} dias). Recomendado: mín. R$ 50/dia.`,
      confidencePenalty: 15,
    };
  }

  if (daily < 50) {
    return {
      dailyInvestment: daily,
      level: 'adequado',
      warning: `Investimento moderado (R$ ${daily.toFixed(0)}/dia). Dados podem ter variação.`,
      confidencePenalty: 5,
    };
  }

  return {
    dailyInvestment: daily,
    level: 'alto',
    confidencePenalty: 0,
  };
}

export function getPeriodDays(startDate: Date | null, endDate: Date | null): number {
  if (!startDate || !endDate) return 0;
  return Math.max(1, differenceInDays(endDate, startDate) + 1);
}

// ============== DYNAMIC TARGETS ==============

export function getChannelAdjustedTargets(
  baseTargets: Targets,
  channel: ChannelId | string,
  formComplexity?: FormComplexity
): Targets {
  const benchmark = CHANNEL_BENCHMARKS[channel as ChannelId];
  if (!benchmark) return baseTargets;

  const adjusted = { ...baseTargets };

  // Adjust CVR click→lead
  if (benchmark.cvrClickLead && adjusted.cvrClickLead) {
    adjusted.cvrClickLead = {
      ...adjusted.cvrClickLead,
      value: benchmark.cvrClickLead.baseline,
    };
  }

  // Adjust CPL
  if (adjusted.cpl) {
    adjusted.cpl = {
      ...adjusted.cpl,
      value: Math.round(adjusted.cpl.value * benchmark.cplMultiplier),
    };
  }

  // Adjust Lead→MQL based on channel and form complexity
  if (adjusted.leadToMql) {
    let targetLeadToMql = adjusted.leadToMql.value;

    if (channel === 'lead_nativo' && formComplexity && benchmark.qualityFactors) {
      // For lead nativo, use form complexity to determine target
      targetLeadToMql = (benchmark.qualityFactors[formComplexity]?.leadToMql || 0.20) * 100;
    } else if (benchmark.leadToMqlExpected) {
      targetLeadToMql = benchmark.leadToMqlExpected * 100;
    }

    adjusted.leadToMql = {
      ...adjusted.leadToMql,
      value: targetLeadToMql,
    };
  }

  return adjusted;
}

// ============== CHANNEL INSIGHTS ==============

export interface ChannelInsight {
  channel: ChannelId;
  expectedConversion: string;
  expectedCpl: string;
  qualityNote: string;
  recommendations: string[];
}

export function getChannelInsights(
  channel: ChannelId | string,
  formComplexity?: FormComplexity
): ChannelInsight | null {
  const benchmark = CHANNEL_BENCHMARKS[channel as ChannelId];
  if (!benchmark) return null;

  const recommendations: string[] = [];

  if (channel === 'landing') {
    recommendations.push('Otimize a landing page para reduzir fricção');
    recommendations.push('Teste diferentes CTAs e formulários');
  } else if (channel === 'lead_nativo') {
    if (formComplexity === 'poucas') {
      recommendations.push('Adicione perguntas de qualificação ao formulário');
      recommendations.push('Leads podem ter baixa qualidade - reforce processo de qualificação');
    } else if (formComplexity === 'certas') {
      recommendations.push('Formulário bem configurado para qualificação');
      recommendations.push('Mantenha as perguntas BANT para filtrar leads');
    } else {
      recommendations.push('Revise as perguntas para focar em qualificação (BANT)');
    }
  } else if (channel === 'whatsapp') {
    recommendations.push('Implemente automação para qualificação inicial');
    recommendations.push('Configure respostas rápidas e chatbot para triagem');
    recommendations.push('Alta conversão, mas leads podem precisar de mais nurturing');
  }

  return {
    channel: benchmark.id,
    expectedConversion: `${benchmark.cvrClickLead.range[0]}-${benchmark.cvrClickLead.range[1]}%`,
    expectedCpl: benchmark.cplMultiplier > 1 
      ? `~${Math.round((benchmark.cplMultiplier - 1) * 100)}% maior`
      : `~${Math.round((1 - benchmark.cplMultiplier) * 100)}% menor`,
    qualityNote: benchmark.leadQuality === 'alta' 
      ? 'Leads tendem a ser mais qualificados'
      : benchmark.leadQuality === 'baixa'
      ? 'Requer processo de qualificação mais rigoroso'
      : 'Qualidade variável conforme configuração',
    recommendations,
  };
}
