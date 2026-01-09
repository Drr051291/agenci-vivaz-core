// Advanced Insights Engine for Performance Matrix Pro
// Based on "Benchmark Inside Sales B2B e B2C Brasil 2025" study

import { FunnelOutputs, FunnelInputs } from './calc';
import { SetorAtuacao, BENCHMARK_DATA, AVERAGE_BRAZIL_CONVERSION } from './benchmarks';

export interface Insight {
  id: string;
  type: 'warning' | 'success' | 'info' | 'critical';
  stage?: string;
  title: string;
  diagnosis?: string;
  action?: string;
  priority: number; // 1 = highest
}

// Stage-specific thresholds for deep analysis
const STAGE_THRESHOLDS = {
  lead_to_mql: { critical: 10, warning: 20 },
  mql_to_sql: { critical: 25, warning: 40 },
  sql_to_opp: { critical: 20, warning: 30 },
  opp_to_sale_b2b: { critical: 10, warning: 20 },
  opp_to_sale_b2c: { critical: 5, warning: 10 },
};

/**
 * Generate deep diagnostic insights based on funnel data
 */
export function generateInsights(
  outputs: FunnelOutputs,
  setor: SetorAtuacao,
  inputs?: FunnelInputs
): Insight[] {
  const insights: Insight[] = [];
  const benchmark = BENCHMARK_DATA[setor];
  const isB2C = setor.includes('b2c');
  
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
  
  // 1. Global Conversion Analysis
  if (outputs.globalConversion !== null) {
    if (outputs.globalConversion < benchmark.conversionRate * 0.7) {
      insights.push({
        id: 'global_critical',
        type: 'critical',
        title: `Conversão geral crítica: ${outputs.globalConversion.toFixed(2)}%`,
        diagnosis: `Está ${((1 - outputs.globalConversion / benchmark.conversionRate) * 100).toFixed(0)}% abaixo do benchmark de ${benchmark.conversionRate}% para ${benchmark.label}.`,
        action: 'Analise cada etapa abaixo para identificar o gargalo principal.',
        priority: 1,
      });
    } else if (outputs.globalConversion < AVERAGE_BRAZIL_CONVERSION) {
      insights.push({
        id: 'global_warning',
        type: 'warning',
        title: 'Conversão abaixo da média Brasil',
        diagnosis: `Sua conversão (${outputs.globalConversion.toFixed(2)}%) está abaixo da média de ${AVERAGE_BRAZIL_CONVERSION}%.`,
        action: 'Identifique o gargalo no funil para otimizar.',
        priority: 2,
      });
    } else if (outputs.globalConversion >= benchmark.conversionRate) {
      insights.push({
        id: 'global_healthy',
        type: 'success',
        title: 'Conversão saudável',
        diagnosis: `Sua conversão (${outputs.globalConversion.toFixed(2)}%) está acima do benchmark de ${benchmark.conversionRate}%.`,
        priority: 10,
      });
    }
  }
  
  // 2. Stage-Specific Deep Analysis
  outputs.stages.forEach(stage => {
    if (!stage.eligible || stage.rate === null) return;
    
    // Lead → MQL (Traffic Quality)
    if (stage.key === 'lead_to_mql') {
      if (stage.rate < STAGE_THRESHOLDS.lead_to_mql.critical) {
        insights.push({
          id: 'lead_mql_critical',
          type: 'critical',
          stage: 'Lead → MQL',
          title: 'Topo de funil com baixa qualificação',
          diagnosis: `Apenas ${stage.rate.toFixed(1)}% dos leads viram MQL. O tráfego está desqualificado.`,
          action: 'Revise a segmentação das campanhas de Tráfego Pago. Você está atraindo muitos curiosos. Melhore a copy dos anúncios para filtrar o público antes do clique.',
          priority: 2,
        });
      } else if (stage.rate < STAGE_THRESHOLDS.lead_to_mql.warning) {
        insights.push({
          id: 'lead_mql_warning',
          type: 'warning',
          stage: 'Lead → MQL',
          title: 'Qualidade de leads precisa atenção',
          diagnosis: `Taxa de ${stage.rate.toFixed(1)}% está abaixo do ideal de 20%+.`,
          action: 'Canais como LinkedIn Ads tendem a ter conversão lead-oportunidade de 20-35%, enquanto Meta Ads exige mais nutrição.',
          priority: 3,
        });
      }
    }
    
    // MQL → SQL (Speed & Response)
    if (stage.key === 'mql_to_sql') {
      if (stage.rate < STAGE_THRESHOLDS.mql_to_sql.critical) {
        insights.push({
          id: 'mql_sql_critical',
          type: 'critical',
          stage: 'MQL → SQL',
          title: 'Gargalo na passagem de bastão (SLA)',
          diagnosis: `Apenas ${stage.rate.toFixed(1)}% dos MQLs viram SQL. Problema provável de Speed-to-Lead.`,
          action: 'Responder em menos de 5 minutos aumenta a conversão em 21x. Verifique se o time comercial está demorando para abordar os MQLs.',
          priority: 2,
        });
      } else if (stage.rate < STAGE_THRESHOLDS.mql_to_sql.warning) {
        insights.push({
          id: 'mql_sql_warning',
          type: 'warning',
          stage: 'MQL → SQL',
          title: 'Speed-to-Lead pode estar impactando',
          diagnosis: `Taxa de ${stage.rate.toFixed(1)}% indica possível demora no primeiro contato.`,
          action: 'Implemente SLA de resposta e monitore o tempo de primeiro contato. O ideal é responder em menos de 5 minutos.',
          priority: 3,
        });
      }
    }
    
    // SQL → Opportunity (Sales Qualification)
    if (stage.key === 'sql_to_opp') {
      if (stage.rate < STAGE_THRESHOLDS.sql_to_opp.critical) {
        insights.push({
          id: 'sql_opp_critical',
          type: 'critical',
          stage: 'SQL → Oportunidade',
          title: 'Qualificação de Vendas ineficaz',
          diagnosis: `Apenas ${stage.rate.toFixed(1)}% dos SQLs viram oportunidade.`,
          action: 'Os leads estão chegando no vendedor, mas não viram oportunidade. Revise o script de descoberta (Discovery). O cliente tem dor, mas não vê valor na solução ainda.',
          priority: 2,
        });
      } else if (stage.rate < STAGE_THRESHOLDS.sql_to_opp.warning) {
        insights.push({
          id: 'sql_opp_warning',
          type: 'warning',
          stage: 'SQL → Oportunidade',
          title: 'Discovery pode melhorar',
          diagnosis: `Taxa de ${stage.rate.toFixed(1)}% indica oportunidade de melhoria.`,
          action: 'Valide seu processo de Pré-vendas. O uso de SDRs pode aumentar o fechamento em até 40%.',
          priority: 3,
        });
      }
    }
    
    // Opportunity → Sale (Win Rate)
    if (stage.key === 'opp_to_sale') {
      const threshold = isB2C ? STAGE_THRESHOLDS.opp_to_sale_b2c : STAGE_THRESHOLDS.opp_to_sale_b2b;
      
      if (stage.rate < threshold.critical) {
        insights.push({
          id: 'opp_sale_critical',
          type: 'critical',
          stage: 'Opp → Venda',
          title: 'Baixa taxa de fechamento (Closing)',
          diagnosis: `Win Rate de apenas ${stage.rate.toFixed(1)}%. O cliente chega na proposta mas não fecha.`,
          action: 'Valide: 1) Pricing (está fora do mercado?), 2) Follow-up (está sendo feito?), 3) Objeções (o time sabe contornar?).',
          priority: 2,
        });
      } else if (stage.rate < threshold.warning) {
        insights.push({
          id: 'opp_sale_warning',
          type: 'warning',
          stage: 'Opp → Venda',
          title: 'Win Rate pode melhorar',
          diagnosis: `Taxa de ${stage.rate.toFixed(1)}% está abaixo do ideal de ${threshold.warning}%.`,
          action: 'Revise o processo de negociação e follow-up. Considere estruturar uma equipe de closers.',
          priority: 3,
        });
      }
    }
  });
  
  // 3. Financial Insights
  if (outputs.financial.cpl !== null && inputs?.investimento) {
    // High CPL + Low Conversion = Bad Traffic Strategy
    const hasLowConversion = outputs.globalConversion !== null && outputs.globalConversion < AVERAGE_BRAZIL_CONVERSION;
    
    if (hasLowConversion && outputs.financial.cpl > 50) {
      insights.push({
        id: 'cpl_high',
        type: 'warning',
        title: 'Custo por Lead alto com conversão baixa',
        diagnosis: `CPL de ${outputs.financial.cpl.toFixed(2)} R$ enquanto a conversão está abaixo da média.`,
        action: 'Pare de tentar escalar volume e foque em LPs (Landing Pages) de alta conversão ao invés de formulários nativos (Lead Gen), conforme benchmark de 2025.',
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
  }
  
  // 4. High Ticket Specific
  if (inputs?.ticketMedio && inputs.ticketMedio > 5000) {
    const hasFormLeads = true; // Assume forms are used
    if (hasFormLeads) {
      insights.push({
        id: 'high_ticket_forms',
        type: 'info',
        title: 'Recomendação para ticket alto',
        diagnosis: 'Para tickets acima de R$ 5.000, formulários nativos tendem a gerar leads menos qualificados.',
        action: 'Use Landing Pages próprias focando em confiança e prova social (depoimentos, cases, certificações).',
        priority: 5,
      });
    }
  }
  
  // 5. Ineligible stages warning
  const ineligibleStages = outputs.stages.filter(s => !s.eligible);
  if (ineligibleStages.length > 0 && outputs.hasValidData) {
    insights.push({
      id: 'low_sample',
      type: 'info',
      title: 'Amostra insuficiente em algumas etapas',
      diagnosis: `${ineligibleStages.map(s => s.labelShort).join(', ')} precisam de mais dados.`,
      priority: 8,
    });
  }
  
  // Sort by priority
  return insights.sort((a, b) => a.priority - b.priority);
}

/**
 * Generate high-ticket specific insights (legacy support)
 */
export function generateHighTicketInsights(ticketMedio: number | undefined): Insight[] {
  // Now handled in main generateInsights
  return [];
}
