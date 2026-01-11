// Advanced Insights Engine for Performance Matrix Pro
// Based on "Taxas de Conversão Meta Ads por Segmento" study

import { FunnelOutputs, FunnelInputs, FunnelStage } from './calc';
import { SetorAtuacao, BENCHMARK_DATA, AVERAGE_BRAZIL_CONVERSION, StageBenchmark } from './benchmarks';

export interface Insight {
  id: string;
  type: 'warning' | 'success' | 'info' | 'critical';
  stage?: string;
  title: string;
  diagnosis?: string;
  action?: string;
  priority: number; // 1 = highest
}

/**
 * Get gap description based on rate vs benchmark
 */
function getGapDescription(rate: number, benchmark: StageBenchmark): string {
  if (rate >= benchmark.avg) {
    return `acima da média esperada (${benchmark.avg.toFixed(0)}%)`;
  }
  if (rate >= benchmark.min) {
    const gap = benchmark.avg - rate;
    return `${gap.toFixed(1)} p.p. abaixo da média (meta: ${benchmark.min}-${benchmark.max}%)`;
  }
  const gap = benchmark.min - rate;
  return `${gap.toFixed(1)} p.p. abaixo do mínimo (meta: ${benchmark.min}-${benchmark.max}%)`;
}

/**
 * Generate stage-specific diagnosis and action based on benchmark
 */
function getStageInsight(stage: FunnelStage, setor: SetorAtuacao): { diagnosis: string; action: string } | null {
  if (!stage.eligible || stage.rate === null || !stage.benchmark) return null;
  
  const { rate, benchmark, key } = stage;
  const isB2C = setor.includes('b2c');
  
  // Stage-specific diagnostics
  const stageAdvice: Record<string, { critical: string; warning: string }> = {
    lead_to_mql: {
      critical: 'Revise a segmentação das campanhas de Tráfego Pago. Você está atraindo muitos curiosos. Melhore a copy dos anúncios para filtrar o público antes do clique.',
      warning: 'Canais como LinkedIn Ads tendem a ter conversão lead-oportunidade de 20-35%, enquanto Meta Ads exige mais nutrição.',
    },
    mql_to_sql: {
      critical: 'Responder em menos de 5 minutos aumenta a conversão em 21x. Verifique se o time comercial está demorando para abordar os MQLs.',
      warning: 'Implemente SLA de resposta e monitore o tempo de primeiro contato. O ideal é responder em menos de 5 minutos.',
    },
    sql_to_opp: {
      critical: 'Os leads estão chegando no vendedor, mas não viram oportunidade. Revise o script de Discovery. O cliente tem dor, mas não vê valor na solução ainda.',
      warning: 'Valide seu processo de Pré-vendas. O uso de SDRs pode aumentar o fechamento em até 40%.',
    },
    opp_to_sale: {
      critical: isB2C 
        ? 'Valide: 1) Pricing (está fora do mercado?), 2) Urgência (o cliente não sente pressa), 3) Objeções (o time sabe contornar?).'
        : 'Valide: 1) Pricing (está fora do mercado?), 2) Follow-up (está sendo feito?), 3) Objeções (o time sabe contornar?).',
      warning: 'Revise o processo de negociação e follow-up. Considere estruturar uma equipe de closers.',
    },
  };
  
  const advice = stageAdvice[key];
  if (!advice) return null;
  
  if (rate < benchmark.min) {
    return {
      diagnosis: `Taxa de ${rate.toFixed(1)}% está ${getGapDescription(rate, benchmark)}.`,
      action: advice.critical,
    };
  }
  
  if (rate < benchmark.avg) {
    return {
      diagnosis: `Taxa de ${rate.toFixed(1)}% está ${getGapDescription(rate, benchmark)}.`,
      action: advice.warning,
    };
  }
  
  return null;
}

/**
 * Generate deep diagnostic insights based on funnel data and sector benchmarks
 */
export function generateInsights(
  outputs: FunnelOutputs,
  setor: SetorAtuacao,
  inputs?: FunnelInputs
): Insight[] {
  const insights: Insight[] = [];
  const benchmark = BENCHMARK_DATA[setor];
  
  if (!outputs.hasValidData) {
    insights.push({
      id: 'no_data',
      type: 'info',
      title: 'Dados insuficientes',
      action: 'Preencha os dados do funil para receber análises.',
      priority: 99,
    });
    return insights;
  }
  
  // 1. Global Conversion Analysis (using sector benchmark)
  if (outputs.globalConversion !== null) {
    const benchmarkRate = benchmark.conversionRate;
    const conversionRange = benchmark.conversionRange;
    
    if (outputs.globalConversion < conversionRange.min) {
      const gap = conversionRange.min - outputs.globalConversion;
      insights.push({
        id: 'global_critical',
        type: 'critical',
        title: `Conversão geral crítica: ${outputs.globalConversion.toFixed(2)}%`,
        diagnosis: `Está ${gap.toFixed(2)} p.p. abaixo do mínimo esperado para ${benchmark.label} (meta: ${conversionRange.min}-${conversionRange.max}%).`,
        action: 'Analise cada etapa abaixo para identificar o gargalo principal.',
        priority: 1,
      });
    } else if (outputs.globalConversion < benchmarkRate) {
      insights.push({
        id: 'global_warning',
        type: 'warning',
        title: 'Conversão abaixo da média do segmento',
        diagnosis: `Sua conversão (${outputs.globalConversion.toFixed(2)}%) está abaixo da média de ${benchmarkRate.toFixed(2)}% para ${benchmark.label}.`,
        action: 'Identifique o gargalo no funil para otimizar.',
        priority: 2,
      });
    } else if (outputs.globalConversion >= benchmarkRate) {
      insights.push({
        id: 'global_healthy',
        type: 'success',
        title: 'Conversão saudável',
        diagnosis: `Sua conversão (${outputs.globalConversion.toFixed(2)}%) está dentro ou acima da meta para ${benchmark.label} (${conversionRange.min}-${conversionRange.max}%).`,
        priority: 10,
      });
    }
  }
  
  // 2. Stage-Specific Deep Analysis (using sector stage benchmarks)
  outputs.stages.forEach(stage => {
    if (stage.status === 'critical') {
      const stageInsight = getStageInsight(stage, setor);
      if (stageInsight) {
        insights.push({
          id: `${stage.key}_critical`,
          type: 'critical',
          stage: stage.label,
          title: getStageCriticalTitle(stage.key),
          diagnosis: stageInsight.diagnosis,
          action: stageInsight.action,
          priority: 2,
        });
      }
    } else if (stage.status === 'warning') {
      const stageInsight = getStageInsight(stage, setor);
      if (stageInsight) {
        insights.push({
          id: `${stage.key}_warning`,
          type: 'warning',
          stage: stage.label,
          title: getStageWarningTitle(stage.key),
          diagnosis: stageInsight.diagnosis,
          action: stageInsight.action,
          priority: 3,
        });
      }
    } else if (stage.status === 'ok' && stage.eligible && stage.rate !== null) {
      // Optional: add success insights for stages performing well
      if (stage.rate >= (stage.benchmark?.max || 0)) {
        insights.push({
          id: `${stage.key}_success`,
          type: 'success',
          stage: stage.label,
          title: `${stage.labelShort} acima da meta`,
          diagnosis: `Taxa de ${stage.rate.toFixed(1)}% está excelente (meta: ${stage.benchmark?.min}-${stage.benchmark?.max}%).`,
          priority: 8,
        });
      }
    }
  });
  
  // 3. Financial Insights
  if (outputs.financial.cpl !== null && inputs?.investimento) {
    const hasLowConversion = outputs.globalConversion !== null && outputs.globalConversion < benchmark.conversionRate;
    
    if (hasLowConversion && outputs.financial.cpl > 50) {
      insights.push({
        id: 'cpl_high',
        type: 'warning',
        title: 'Custo por Lead alto com conversão baixa',
        diagnosis: `CPL de R$ ${outputs.financial.cpl.toFixed(2)} enquanto a conversão está abaixo da média do segmento.`,
        action: 'Pare de tentar escalar volume e foque em LPs (Landing Pages) de alta conversão ao invés de formulários nativos (Lead Gen), conforme benchmark 2025.',
        priority: 3,
      });
    }
    
    // Negative ROI
    if (outputs.financial.roi !== null && outputs.financial.roi < 0) {
      insights.push({
        id: 'roi_negative',
        type: 'critical',
        title: 'ROI Negativo',
        diagnosis: `Retorno de ${outputs.financial.roi.toFixed(0)}%. Você está investindo mais do que recupera.`,
        action: 'Pare imediatamente de escalar. Foque em otimizar conversões antes de aumentar investimento.',
        priority: 1,
      });
    }
    
    // Healthy ROI
    if (outputs.financial.roi !== null && outputs.financial.roi > 100) {
      insights.push({
        id: 'roi_positive',
        type: 'success',
        title: 'ROI Positivo',
        diagnosis: `Retorno de ${outputs.financial.roi.toFixed(0)}% sobre o investimento.`,
        priority: 9,
      });
    }
  }
  
  // 4. High Ticket Specific
  if (inputs?.ticketMedio && inputs.ticketMedio > 5000) {
    insights.push({
      id: 'high_ticket_forms',
      type: 'info',
      title: 'Recomendação para ticket alto',
      diagnosis: 'Para tickets acima de R$ 5.000, formulários nativos tendem a gerar leads menos qualificados.',
      action: 'Use Landing Pages próprias focando em confiança e prova social (depoimentos, cases, certificações).',
      priority: 5,
    });
  }
  
  // 5. Ineligible stages warning
  const ineligibleStages = outputs.stages.filter(s => !s.eligible);
  if (ineligibleStages.length > 0 && outputs.hasValidData) {
    insights.push({
      id: 'low_sample',
      type: 'info',
      title: 'Amostra insuficiente em algumas etapas',
      diagnosis: `${ineligibleStages.map(s => s.labelShort).join(', ')} precisam de mais dados para análise confiável.`,
      priority: 8,
    });
  }
  
  // Sort by priority
  return insights.sort((a, b) => a.priority - b.priority);
}

/**
 * Get critical title for stage
 */
function getStageCriticalTitle(key: string): string {
  const titles: Record<string, string> = {
    lead_to_mql: 'Topo de funil com baixa qualificação',
    mql_to_sql: 'Gargalo na passagem de bastão (SLA)',
    sql_to_opp: 'Qualificação de Vendas ineficaz',
    opp_to_sale: 'Baixa taxa de fechamento (Closing)',
  };
  return titles[key] || 'Etapa crítica';
}

/**
 * Get warning title for stage
 */
function getStageWarningTitle(key: string): string {
  const titles: Record<string, string> = {
    lead_to_mql: 'Qualidade de leads precisa atenção',
    mql_to_sql: 'Speed-to-Lead pode estar impactando',
    sql_to_opp: 'Discovery pode melhorar',
    opp_to_sale: 'Win Rate pode melhorar',
  };
  return titles[key] || 'Etapa requer atenção';
}

/**
 * Generate high-ticket specific insights (legacy support)
 */
export function generateHighTicketInsights(ticketMedio: number | undefined): Insight[] {
  // Now handled in main generateInsights
  return [];
}
