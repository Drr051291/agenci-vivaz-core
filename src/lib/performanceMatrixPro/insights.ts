// Insights Engine for Performance Matrix Pro
// All insights are derived from the "Benchmark Inside Sales B2B e B2C Brasil 2025" study

import { FunnelStage, FunnelOutputs } from './calc';
import { SetorAtuacao, BENCHMARK_DATA, AVERAGE_BRAZIL_CONVERSION, getHealthStatus } from './benchmarks';

export interface Insight {
  id: string;
  type: 'warning' | 'success' | 'info' | 'critical';
  stage?: string;
  title: string;
  description: string;
  action?: string;
}

/**
 * Generate insights based on funnel data and selected sector
 */
export function generateInsights(
  outputs: FunnelOutputs,
  setor: SetorAtuacao
): Insight[] {
  const insights: Insight[] = [];
  const benchmark = BENCHMARK_DATA[setor];
  
  if (!outputs.hasValidData) {
    insights.push({
      id: 'no_data',
      type: 'info',
      title: 'Dados insuficientes',
      description: 'Preencha os dados do funil para receber análises e recomendações.',
    });
    return insights;
  }
  
  // 1. Global Conversion Check
  if (outputs.globalConversion !== null) {
    if (outputs.globalConversion < AVERAGE_BRAZIL_CONVERSION) {
      insights.push({
        id: 'global_low',
        type: 'warning',
        title: 'Conversão geral abaixo da média Brasil',
        description: `Sua conversão geral (${outputs.globalConversion.toFixed(2)}%) está abaixo da média brasileira de ${AVERAGE_BRAZIL_CONVERSION}%.`,
        action: 'Identifique o gargalo principal no funil abaixo.',
      });
    }
    
    if (outputs.globalConversion < benchmark.conversionRate) {
      insights.push({
        id: 'global_below_sector',
        type: 'critical',
        title: `Conversão abaixo do benchmark do setor`,
        description: `Para ${benchmark.label}, o esperado é ${benchmark.conversionRate}%. Você está em ${outputs.globalConversion.toFixed(2)}%.`,
        action: 'Revise cada etapa do funil para identificar onde estão as perdas.',
      });
    } else {
      insights.push({
        id: 'global_healthy',
        type: 'success',
        title: 'Conversão saudável para o setor',
        description: `Sua conversão (${outputs.globalConversion.toFixed(2)}%) está acima do benchmark de ${benchmark.conversionRate}% para ${benchmark.label}.`,
      });
    }
  }
  
  // 2. Stage-specific insights
  const eligibleStages = outputs.stages.filter(s => s.eligible && s.rate !== null);
  
  // Find the worst stage
  const sortedStages = [...eligibleStages].sort((a, b) => (a.rate ?? 100) - (b.rate ?? 100));
  
  if (sortedStages.length > 0) {
    const worstStage = sortedStages[0];
    
    // Lead -> MQL insights
    if (worstStage.key === 'lead_to_mql' && worstStage.rate !== null && worstStage.rate < 15) {
      insights.push({
        id: 'lead_mql_low',
        type: 'warning',
        stage: 'Lead → MQL',
        title: 'Baixa qualificação de leads',
        description: 'Verifique a qualidade do tráfego. LinkedIn Ads converte 20-35% em oportunidade, enquanto Meta Ads exige mais nutrição.',
        action: 'Analise a origem dos leads e considere ajustar o mix de canais.',
      });
    }
    
    // MQL -> SQL insights (Speed-to-Lead)
    if ((worstStage.key === 'mql_to_sql' || worstStage.key === 'sql_to_opp') && worstStage.rate !== null && worstStage.rate < 30) {
      insights.push({
        id: 'speed_to_lead',
        type: 'warning',
        stage: worstStage.label,
        title: 'Problema de Speed-to-Lead?',
        description: 'Responder em menos de 5 minutos aumenta a conversão em até 21x.',
        action: 'Implemente SLA de resposta e monitore o tempo de primeiro contato.',
      });
    }
    
    // Win Rate insights (SDR impact)
    if (worstStage.key === 'opp_to_sale' && worstStage.rate !== null && worstStage.rate < 25) {
      insights.push({
        id: 'win_rate_low',
        type: 'warning',
        stage: 'Opp → Venda',
        title: 'Win Rate baixo',
        description: 'Valide seu processo de Pré-vendas. O uso de SDRs pode aumentar o fechamento em até 40%.',
        action: 'Considere estruturar ou otimizar a equipe de SDRs.',
      });
    }
  }
  
  // 3. Ineligible stages warning
  const ineligibleStages = outputs.stages.filter(s => !s.eligible);
  if (ineligibleStages.length > 0) {
    insights.push({
      id: 'low_sample',
      type: 'info',
      title: 'Algumas etapas com amostra insuficiente',
      description: `${ineligibleStages.map(s => s.labelShort).join(', ')} — precisam de mais dados para análise confiável.`,
    });
  }
  
  // 4. Sales Velocity insight
  if (outputs.salesVelocity !== null && outputs.salesVelocity > 0) {
    insights.push({
      id: 'velocity',
      type: 'info',
      title: 'Velocidade de Vendas calculada',
      description: `Seu pipeline gera aproximadamente R$ ${outputs.salesVelocity.toFixed(2)} por dia.`,
      action: 'Acompanhe essa métrica para medir o impacto de otimizações.',
    });
  }
  
  return insights;
}

/**
 * Generate high-ticket specific insights
 */
export function generateHighTicketInsights(ticketMedio: number | undefined): Insight[] {
  const insights: Insight[] = [];
  
  if (ticketMedio && ticketMedio > 5000) {
    insights.push({
      id: 'high_ticket_forms',
      type: 'info',
      title: 'Recomendação para ticket alto',
      description: 'Para tickets altos, evite formulários nativos (Lead Gen Forms). Use Landing Pages próprias para qualificar melhor, focando em confiança e prova social.',
      action: 'Priorize landing pages com depoimentos, cases e certificações.',
    });
  }
  
  return insights;
}
