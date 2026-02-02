// Matriz de Performance Pro V2 - Calculation Engine
// Focused on cost-per-stage analysis, cascading projections, and "leads for 1 contract"

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
  isProjected?: boolean;
}

export interface Projection {
  scenario: 'conservador' | 'realista' | 'agressivo';
  label: string;
  closingRate: number;
  contratosProjetados: number;
  cacProjetado: number | null;
}

// Stage projection data
export interface StageValue {
  value: number;
  isProjected: boolean;
}

export interface ProjectedStages {
  leads: StageValue;
  mql: StageValue;
  sql: StageValue;
  oportunidades: StageValue;
  contratos: StageValue;
}

// Leads for 1 contract calculation
export interface LeadsForContract {
  leadsNeeded: number;
  investmentNeeded: number | null;
  usesRealConversion: boolean;
  conversionPath: string;
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
  // NEW: Enhanced outputs
  projectedStages: ProjectedStages;
  projectedCosts: CostPerStage;
  leadsForContract: LeadsForContract | null;
}

// Scenario types
export type ScenarioType = 'conservador' | 'realista' | 'agressivo';

// Benchmarks with scenario multipliers
export const BENCHMARKS = {
  global: { min: 0.2, max: 0.5, avg: 0.35 },
  lead_mql: { min: 20, max: 25, avg: 22.5 },
  mql_sql: { min: 15, max: 25, avg: 20 },
  sql_opp: { min: 50, max: 60, avg: 55 },
  opp_contrato: { min: 12, max: 18, avg: 15 },
};

// Get benchmark rate based on scenario
export function getBenchmarkRate(
  key: 'lead_mql' | 'mql_sql' | 'sql_opp' | 'opp_contrato',
  scenario: ScenarioType
): number {
  const bench = BENCHMARKS[key];
  switch (scenario) {
    case 'conservador': return bench.min / 100;
    case 'agressivo': return bench.max / 100;
    case 'realista':
    default: return bench.avg / 100;
  }
}

// Projection scenarios
export const PROJECTION_SCENARIOS: { key: ScenarioType; label: string; rate: number }[] = [
  { key: 'conservador', label: 'Conservador', rate: 0.12 },
  { key: 'realista', label: 'Realista', rate: 0.15 },
  { key: 'agressivo', label: 'Agressivo', rate: 0.18 },
];

// Get scenario config
export function getScenarioConfig(scenario: ScenarioType) {
  return {
    lead_mql: getBenchmarkRate('lead_mql', scenario),
    mql_sql: getBenchmarkRate('mql_sql', scenario),
    sql_opp: getBenchmarkRate('sql_opp', scenario),
    opp_contrato: getBenchmarkRate('opp_contrato', scenario),
  };
}

/**
 * Safe division returning null if invalid
 */
function safeDivide(numerator: number, denominator: number): number | null {
  if (!denominator || isNaN(denominator) || denominator === 0) return null;
  if (isNaN(numerator)) return null;
  return numerator / denominator;
}

/**
 * Validate funnel sequence (only for non-zero values)
 */
export function validateFunnelSequence(inputs: FunnelInputsV2): string[] {
  const errors: string[] = [];
  
  if (inputs.mql > 0 && inputs.leads > 0 && inputs.mql > inputs.leads) {
    errors.push('MQL não pode ser maior que Leads');
  }
  if (inputs.sql > 0 && inputs.mql > 0 && inputs.sql > inputs.mql) {
    errors.push('SQL não pode ser maior que MQL');
  }
  if (inputs.oportunidades > 0 && inputs.sql > 0 && inputs.oportunidades > inputs.sql) {
    errors.push('Oportunidades não pode ser maior que SQL');
  }
  if (inputs.contratos !== undefined && inputs.contratos > 0 && inputs.oportunidades > 0 && inputs.contratos > inputs.oportunidades) {
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
 * Project stages from the last available real stage forward
 */
export function projectStages(inputs: FunnelInputsV2, scenario: ScenarioType): ProjectedStages {
  const config = getScenarioConfig(scenario);
  
  const result: ProjectedStages = {
    leads: { value: inputs.leads, isProjected: false },
    mql: { value: inputs.mql, isProjected: false },
    sql: { value: inputs.sql, isProjected: false },
    oportunidades: { value: inputs.oportunidades, isProjected: false },
    contratos: { value: inputs.contratos ?? 0, isProjected: inputs.contratos === undefined || inputs.contratos === 0 },
  };
  
  // Chain projections forward from last real stage
  // Start from leads and project forward if next stage is missing/zero
  
  // MQL projection
  if (inputs.leads > 0 && (inputs.mql === 0 || inputs.mql === undefined)) {
    result.mql = { 
      value: Math.round(inputs.leads * config.lead_mql), 
      isProjected: true 
    };
  }
  
  // SQL projection (use projected MQL if needed)
  const effectiveMql = result.mql.value;
  if (effectiveMql > 0 && (inputs.sql === 0 || inputs.sql === undefined)) {
    result.sql = { 
      value: Math.round(effectiveMql * config.mql_sql), 
      isProjected: true 
    };
  }
  
  // Oportunidades projection (use projected SQL if needed)
  const effectiveSql = result.sql.value;
  if (effectiveSql > 0 && (inputs.oportunidades === 0 || inputs.oportunidades === undefined)) {
    result.oportunidades = { 
      value: Math.round(effectiveSql * config.sql_opp), 
      isProjected: true 
    };
  }
  
  // Contratos projection (use projected Oportunidades if needed)
  const effectiveOpp = result.oportunidades.value;
  if (effectiveOpp > 0 && (inputs.contratos === undefined || inputs.contratos === 0)) {
    result.contratos = { 
      value: Math.round(effectiveOpp * config.opp_contrato), 
      isProjected: true 
    };
  }
  
  return result;
}

/**
 * Calculate costs with projected values
 */
export function calculateProjectedCosts(
  investimento: number, 
  stages: ProjectedStages
): CostPerStage {
  return {
    cpl: safeDivide(investimento, stages.leads.value),
    custoMql: safeDivide(investimento, stages.mql.value),
    custoSql: safeDivide(investimento, stages.sql.value),
    custoOpp: safeDivide(investimento, stages.oportunidades.value),
    custoContrato: safeDivide(investimento, stages.contratos.value),
  };
}

/**
 * Calculate leads needed for 1 contract
 */
export function calculateLeadsForContract(
  inputs: FunnelInputsV2,
  scenario: ScenarioType
): LeadsForContract | null {
  if (inputs.leads === 0 || inputs.investimento === 0) return null;
  
  const config = getScenarioConfig(scenario);
  const cpl = inputs.investimento / inputs.leads;
  
  // Determine the best conversion path
  // Use real conversions up to the last available real stage, then benchmark for remaining
  
  let conversionPath = '';
  let totalConversion: number;
  let usesRealConversion = false;
  
  // Check what's real vs projected
  const hasRealOpp = inputs.oportunidades > 0;
  const hasRealSql = inputs.sql > 0;
  const hasRealMql = inputs.mql > 0;
  const hasRealContratos = inputs.contratos !== undefined && inputs.contratos > 0;
  
  if (hasRealContratos && inputs.leads > 0) {
    // Full real conversion available
    totalConversion = inputs.contratos! / inputs.leads;
    conversionPath = 'Lead → Contrato (real)';
    usesRealConversion = true;
  } else if (hasRealOpp && inputs.leads > 0) {
    // Real up to Oportunidades, benchmark for Opp→Contrato
    const realLeadToOpp = inputs.oportunidades / inputs.leads;
    totalConversion = realLeadToOpp * config.opp_contrato;
    conversionPath = 'Lead → Opp (real) + Opp → Contrato (benchmark)';
    usesRealConversion = true;
  } else if (hasRealSql && inputs.leads > 0) {
    // Real up to SQL, benchmark for SQL→Opp→Contrato
    const realLeadToSql = inputs.sql / inputs.leads;
    totalConversion = realLeadToSql * config.sql_opp * config.opp_contrato;
    conversionPath = 'Lead → SQL (real) + SQL → Contrato (benchmark)';
    usesRealConversion = true;
  } else if (hasRealMql && inputs.leads > 0) {
    // Real up to MQL, benchmark for MQL→SQL→Opp→Contrato
    const realLeadToMql = inputs.mql / inputs.leads;
    totalConversion = realLeadToMql * config.mql_sql * config.sql_opp * config.opp_contrato;
    conversionPath = 'Lead → MQL (real) + MQL → Contrato (benchmark)';
    usesRealConversion = true;
  } else {
    // All benchmark
    totalConversion = config.lead_mql * config.mql_sql * config.sql_opp * config.opp_contrato;
    conversionPath = 'Benchmark completo';
    usesRealConversion = false;
  }
  
  if (totalConversion <= 0) return null;
  
  const leadsNeeded = Math.ceil(1 / totalConversion);
  const investmentNeeded = leadsNeeded * cpl;
  
  return {
    leadsNeeded,
    investmentNeeded,
    usesRealConversion,
    conversionPath,
  };
}

/**
 * Calculate all funnel metrics
 */
export function calculateFunnelV2(inputs: FunnelInputsV2, scenario: ScenarioType = 'realista'): FunnelOutputsV2 {
  const validationErrors = validateFunnelSequence(inputs);
  const { investimento, leads, mql, sql, oportunidades, contratos } = inputs;
  
  // Check minimum data
  const hasValidData = investimento > 0 && leads > 0;
  
  // Project stages from scenario
  const projectedStages = projectStages(inputs, scenario);
  
  // Cost per stage (using real values only)
  const cpl = safeDivide(investimento, leads);
  const custoMql = safeDivide(investimento, mql);
  const custoSql = safeDivide(investimento, sql);
  const custoOpp = safeDivide(investimento, oportunidades);
  const custoContrato = contratos ? safeDivide(investimento, contratos) : null;
  
  const costs: CostPerStage = { cpl, custoMql, custoSql, custoOpp, custoContrato };
  
  // Projected costs (using projected values)
  const projectedCosts = calculateProjectedCosts(investimento, projectedStages);
  
  // Cost steps (deltas) - use projected costs where real not available
  const costSteps: CostStep[] = [];
  
  const effectiveCpl = cpl ?? projectedCosts.cpl;
  const effectiveCustoMql = (mql > 0 ? custoMql : projectedCosts.custoMql);
  const effectiveCustoSql = (sql > 0 ? custoSql : projectedCosts.custoSql);
  const effectiveCustoOpp = (oportunidades > 0 ? custoOpp : projectedCosts.custoOpp);
  const effectiveCustoContrato = custoContrato ?? projectedCosts.custoContrato;
  
  if (effectiveCpl !== null && effectiveCustoMql !== null) {
    costSteps.push({ 
      label: 'Lead → MQL', 
      from: 'CPL', 
      to: 'Custo/MQL',
      delta: effectiveCustoMql - effectiveCpl 
    });
  }
  if (effectiveCustoMql !== null && effectiveCustoSql !== null) {
    costSteps.push({ 
      label: 'MQL → SQL', 
      from: 'Custo/MQL', 
      to: 'Custo/SQL',
      delta: effectiveCustoSql - effectiveCustoMql 
    });
  }
  if (effectiveCustoSql !== null && effectiveCustoOpp !== null) {
    costSteps.push({ 
      label: 'SQL → Opp', 
      from: 'Custo/SQL', 
      to: 'Custo/Opp',
      delta: effectiveCustoOpp - effectiveCustoSql 
    });
  }
  if (effectiveCustoOpp !== null && effectiveCustoContrato !== null) {
    costSteps.push({ 
      label: 'Opp → Contrato', 
      from: 'Custo/Opp', 
      to: 'CAC',
      delta: effectiveCustoContrato - effectiveCustoOpp 
    });
  }
  
  // Find largest cost step
  const largestCostStep = costSteps.length > 0
    ? costSteps.reduce((max, step) => 
        step.delta !== null && (max.delta === null || step.delta > max.delta) ? step : max
      , costSteps[0])
    : null;
  
  // Conversion rates (using projected values where needed)
  const leadToMql = leads > 0 && projectedStages.mql.value > 0 
    ? (projectedStages.mql.value / leads) * 100 
    : null;
  const mqlToSql = projectedStages.mql.value > 0 && projectedStages.sql.value > 0 
    ? (projectedStages.sql.value / projectedStages.mql.value) * 100 
    : null;
  const sqlToOpp = projectedStages.sql.value > 0 && projectedStages.oportunidades.value > 0 
    ? (projectedStages.oportunidades.value / projectedStages.sql.value) * 100 
    : null;
  const oppToContrato = projectedStages.oportunidades.value > 0 && projectedStages.contratos.value > 0
    ? (projectedStages.contratos.value / projectedStages.oportunidades.value) * 100 
    : null;
  
  const conversions: ConversionRate[] = [
    {
      key: 'lead_mql',
      label: 'Lead → MQL',
      labelShort: 'L→MQL',
      from: leads,
      to: projectedStages.mql.value,
      rate: leadToMql,
      benchmark: BENCHMARKS.lead_mql,
      status: projectedStages.mql.isProjected ? 'no_data' : getStatus(leadToMql, BENCHMARKS.lead_mql),
      isProjected: projectedStages.mql.isProjected,
    },
    {
      key: 'mql_sql',
      label: 'MQL → SQL',
      labelShort: 'MQL→SQL',
      from: projectedStages.mql.value,
      to: projectedStages.sql.value,
      rate: mqlToSql,
      benchmark: BENCHMARKS.mql_sql,
      status: projectedStages.sql.isProjected ? 'no_data' : getStatus(mqlToSql, BENCHMARKS.mql_sql),
      isProjected: projectedStages.sql.isProjected,
    },
    {
      key: 'sql_opp',
      label: 'SQL → Oportunidade',
      labelShort: 'SQL→Opp',
      from: projectedStages.sql.value,
      to: projectedStages.oportunidades.value,
      rate: sqlToOpp,
      benchmark: BENCHMARKS.sql_opp,
      status: projectedStages.oportunidades.isProjected ? 'no_data' : getStatus(sqlToOpp, BENCHMARKS.sql_opp),
      isProjected: projectedStages.oportunidades.isProjected,
    },
    {
      key: 'opp_contrato',
      label: 'Oportunidade → Contrato',
      labelShort: 'Opp→Contrato',
      from: projectedStages.oportunidades.value,
      to: projectedStages.contratos.value,
      rate: oppToContrato,
      benchmark: BENCHMARKS.opp_contrato,
      status: projectedStages.contratos.isProjected ? 'no_data' : getStatus(oppToContrato, BENCHMARKS.opp_contrato),
      isProjected: projectedStages.contratos.isProjected,
    },
  ];
  
  // Global conversion
  const globalConversion = projectedStages.contratos.value > 0 && leads > 0 
    ? (projectedStages.contratos.value / leads) * 100 
    : null;
  
  // Legacy projections (only when contratos is not provided)
  let projections: Projection[] | null = null;
  if ((contratos === undefined || contratos === 0) && projectedStages.oportunidades.value > 0) {
    projections = PROJECTION_SCENARIOS.map(scenarioOpt => {
      const contratosProjetados = Math.round(projectedStages.oportunidades.value * scenarioOpt.rate);
      const cacProjetado = contratosProjetados > 0 
        ? investimento / contratosProjetados 
        : null;
      
      return {
        scenario: scenarioOpt.key,
        label: scenarioOpt.label,
        closingRate: scenarioOpt.rate * 100,
        contratosProjetados,
        cacProjetado,
      };
    });
  }
  
  // Calculate leads for 1 contract
  const leadsForContract = calculateLeadsForContract(inputs, scenario);
  
  return {
    costs,
    costSteps,
    largestCostStep,
    conversions,
    globalConversion,
    projections,
    hasValidData,
    validationErrors,
    projectedStages,
    projectedCosts,
    leadsForContract,
  };
}

/**
 * Get bottleneck stages (worst performing) - only from real data
 */
export function getBottlenecks(conversions: ConversionRate[]): ConversionRate[] {
  return conversions
    .filter(c => !c.isProjected && (c.status === 'critical' || c.status === 'warning'))
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
