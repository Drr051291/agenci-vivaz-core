// Matriz de Performance Pro V2 - Calculation Engine
// Focused on cost-per-stage analysis and projections

export interface FunnelInputsV2 {
  // Required
  investimento: number; // R$ - Media investment
  leads: number;
  mql: number;
  sql: number;
  oportunidades: number;
  
  // Optional (collapsible "Avançado")
  contratos?: number;
  ticketMedio?: number;
  periodo?: string;
  cicloDias?: number;
}

export interface CostPerStage {
  cpl: number | null;       // Cost per Lead
  custoMql: number | null;  // Cost per MQL
  custoSql: number | null;  // Cost per SQL
  custoOpp: number | null;  // Cost per Opportunity
  custoContrato: number | null; // CAC (real)
}

export interface CostStep {
  label: string;
  from: string;
  to: string;
  delta: number | null;
}

export interface ConversionRate {
  key: 'lead_mql' | 'mql_sql' | 'sql_opp' | 'opp_contrato';
  label: string;
  labelShort: string;
  from: number;
  to: number;
  rate: number | null;
  benchmark: { min: number; max: number; avg: number };
  status: 'ok' | 'warning' | 'critical' | 'no_data';
}

export interface Projection {
  scenario: 'conservador' | 'realista' | 'agressivo';
  label: string;
  closingRate: number;
  contratosProjetados: number;
  cacProjetado: number | null;
}

export interface FunnelOutputsV2 {
  costs: CostPerStage;
  costSteps: CostStep[];
  largestCostStep: CostStep | null;
  conversions: ConversionRate[];
  globalConversion: number | null;
  projections: Projection[] | null;
  hasValidData: boolean;
  validationErrors: string[];
}

// Fixed benchmarks as specified
export const BENCHMARKS = {
  global: { min: 0.2, max: 0.5, avg: 0.35 },
  lead_mql: { min: 20, max: 25, avg: 22.5 },
  mql_sql: { min: 15, max: 25, avg: 20 },
  sql_opp: { min: 50, max: 60, avg: 55 },
  opp_contrato: { min: 12, max: 18, avg: 15 },
};

// Projection scenarios
export const PROJECTION_SCENARIOS: { key: 'conservador' | 'realista' | 'agressivo'; label: string; rate: number }[] = [
  { key: 'conservador', label: 'Conservador', rate: 0.12 },
  { key: 'realista', label: 'Realista', rate: 0.15 },
  { key: 'agressivo', label: 'Agressivo', rate: 0.18 },
];

/**
 * Safe division returning null if invalid
 */
function safeDivide(numerator: number, denominator: number): number | null {
  if (!denominator || isNaN(denominator) || denominator === 0) return null;
  if (isNaN(numerator)) return null;
  return numerator / denominator;
}

/**
 * Validate funnel sequence
 */
export function validateFunnelSequence(inputs: FunnelInputsV2): string[] {
  const errors: string[] = [];
  
  if (inputs.mql > inputs.leads) {
    errors.push('MQL não pode ser maior que Leads');
  }
  if (inputs.sql > inputs.mql) {
    errors.push('SQL não pode ser maior que MQL');
  }
  if (inputs.oportunidades > inputs.sql) {
    errors.push('Oportunidades não pode ser maior que SQL');
  }
  if (inputs.contratos !== undefined && inputs.contratos > inputs.oportunidades) {
    errors.push('Contratos não pode ser maior que Oportunidades');
  }
  
  return errors;
}

/**
 * Get status based on rate vs benchmark
 */
function getStatus(rate: number | null, benchmark: { min: number; max: number; avg: number }): 'ok' | 'warning' | 'critical' | 'no_data' {
  if (rate === null) return 'no_data';
  if (rate >= benchmark.avg) return 'ok';
  if (rate >= benchmark.min) return 'warning';
  return 'critical';
}

/**
 * Calculate all funnel metrics
 */
export function calculateFunnelV2(inputs: FunnelInputsV2): FunnelOutputsV2 {
  const validationErrors = validateFunnelSequence(inputs);
  const { investimento, leads, mql, sql, oportunidades, contratos } = inputs;
  
  // Check minimum data
  const hasValidData = investimento > 0 && leads > 0;
  
  // Cost per stage
  const cpl = safeDivide(investimento, leads);
  const custoMql = safeDivide(investimento, mql);
  const custoSql = safeDivide(investimento, sql);
  const custoOpp = safeDivide(investimento, oportunidades);
  const custoContrato = contratos ? safeDivide(investimento, contratos) : null;
  
  const costs: CostPerStage = { cpl, custoMql, custoSql, custoOpp, custoContrato };
  
  // Cost steps (deltas)
  const costSteps: CostStep[] = [];
  
  if (cpl !== null && custoMql !== null) {
    costSteps.push({ 
      label: 'Lead → MQL', 
      from: 'CPL', 
      to: 'Custo/MQL',
      delta: custoMql - cpl 
    });
  }
  if (custoMql !== null && custoSql !== null) {
    costSteps.push({ 
      label: 'MQL → SQL', 
      from: 'Custo/MQL', 
      to: 'Custo/SQL',
      delta: custoSql - custoMql 
    });
  }
  if (custoSql !== null && custoOpp !== null) {
    costSteps.push({ 
      label: 'SQL → Opp', 
      from: 'Custo/SQL', 
      to: 'Custo/Opp',
      delta: custoOpp - custoSql 
    });
  }
  if (custoOpp !== null && custoContrato !== null) {
    costSteps.push({ 
      label: 'Opp → Contrato', 
      from: 'Custo/Opp', 
      to: 'CAC',
      delta: custoContrato - custoOpp 
    });
  }
  
  // Find largest cost step
  const largestCostStep = costSteps.length > 0
    ? costSteps.reduce((max, step) => 
        step.delta !== null && (max.delta === null || step.delta > max.delta) ? step : max
      , costSteps[0])
    : null;
  
  // Conversion rates
  const leadToMql = leads > 0 ? (mql / leads) * 100 : null;
  const mqlToSql = mql > 0 ? (sql / mql) * 100 : null;
  const sqlToOpp = sql > 0 ? (oportunidades / sql) * 100 : null;
  const oppToContrato = contratos !== undefined && oportunidades > 0 
    ? (contratos / oportunidades) * 100 
    : null;
  
  const conversions: ConversionRate[] = [
    {
      key: 'lead_mql',
      label: 'Lead → MQL',
      labelShort: 'L→MQL',
      from: leads,
      to: mql,
      rate: leadToMql,
      benchmark: BENCHMARKS.lead_mql,
      status: getStatus(leadToMql, BENCHMARKS.lead_mql),
    },
    {
      key: 'mql_sql',
      label: 'MQL → SQL',
      labelShort: 'MQL→SQL',
      from: mql,
      to: sql,
      rate: mqlToSql,
      benchmark: BENCHMARKS.mql_sql,
      status: getStatus(mqlToSql, BENCHMARKS.mql_sql),
    },
    {
      key: 'sql_opp',
      label: 'SQL → Oportunidade',
      labelShort: 'SQL→Opp',
      from: sql,
      to: oportunidades,
      rate: sqlToOpp,
      benchmark: BENCHMARKS.sql_opp,
      status: getStatus(sqlToOpp, BENCHMARKS.sql_opp),
    },
    {
      key: 'opp_contrato',
      label: 'Oportunidade → Contrato',
      labelShort: 'Opp→Contrato',
      from: oportunidades,
      to: contratos ?? 0,
      rate: oppToContrato,
      benchmark: BENCHMARKS.opp_contrato,
      status: contratos !== undefined ? getStatus(oppToContrato, BENCHMARKS.opp_contrato) : 'no_data',
    },
  ];
  
  // Global conversion
  const globalConversion = contratos !== undefined && leads > 0 
    ? (contratos / leads) * 100 
    : null;
  
  // Projections (only when contratos is not provided)
  let projections: Projection[] | null = null;
  if (contratos === undefined && oportunidades > 0) {
    projections = PROJECTION_SCENARIOS.map(scenario => {
      const contratosProjetados = Math.round(oportunidades * scenario.rate);
      const cacProjetado = contratosProjetados > 0 
        ? investimento / contratosProjetados 
        : null;
      
      return {
        scenario: scenario.key,
        label: scenario.label,
        closingRate: scenario.rate * 100,
        contratosProjetados,
        cacProjetado,
      };
    });
  }
  
  return {
    costs,
    costSteps,
    largestCostStep,
    conversions,
    globalConversion,
    projections,
    hasValidData,
    validationErrors,
  };
}

/**
 * Get bottleneck stages (worst performing)
 */
export function getBottlenecks(conversions: ConversionRate[]): ConversionRate[] {
  return conversions
    .filter(c => c.status === 'critical' || c.status === 'warning')
    .sort((a, b) => {
      // Critical first, then by rate (lowest first)
      if (a.status === 'critical' && b.status !== 'critical') return -1;
      if (b.status === 'critical' && a.status !== 'critical') return 1;
      return (a.rate ?? 0) - (b.rate ?? 0);
    })
    .slice(0, 3);
}

/**
 * Get action recommendations per stage
 */
export function getStageActions(key: ConversionRate['key']): string[] {
  const actions: Record<ConversionRate['key'], string[]> = {
    lead_mql: [
      'Melhorar formulário de qualificação',
      'Refinar ICP (Perfil de Cliente Ideal)',
      'Aumentar clareza da Landing Page',
      'Alinhar lead magnet com expectativas',
    ],
    mql_sql: [
      'Implementar cadência SDR estruturada',
      'Reduzir tempo de resposta (ideal < 5 min)',
      'Revisar scripts de abordagem',
      'Melhorar tratamento de objeções',
    ],
    sql_opp: [
      'Melhorar qualidade do agendamento',
      'Aumentar taxa de comparecimento (show rate)',
      'Implementar pré-frame antes da reunião',
      'Enviar confirmação + materiais prévios',
    ],
    opp_contrato: [
      'Revisar estrutura da proposta comercial',
      'Adicionar cases e prova social',
      'Melhorar ROI framing na apresentação',
      'Definir próximos passos claros',
    ],
  };
  
  return actions[key] || [];
}

// Formatting utilities
export function formatCurrency(value: number | null): string {
  if (value === null || isNaN(value)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | null, decimals = 1): string {
  if (value === null || isNaN(value)) return '—';
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number | null): string {
  if (value === null || isNaN(value)) return '—';
  return new Intl.NumberFormat('pt-BR').format(value);
}
