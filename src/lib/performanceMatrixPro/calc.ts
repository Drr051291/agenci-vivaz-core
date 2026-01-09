// Calculation logic for Performance Matrix Pro

export interface FunnelInputs {
  leads: number;
  mqls: number;
  sqls: number;
  oportunidades: number;
  contratos: number;
  cicloVendas?: number; // days (optional)
  ticketMedio?: number; // R$ (optional)
  investimento?: number; // R$ (optional - paid traffic)
}

export interface FunnelStage {
  key: string;
  label: string;
  labelShort: string;
  fromLabel: string;
  toLabel: string;
  from: number;
  to: number;
  rate: number | null; // null when denominator is 0
  eligible: boolean;
  minSampleSize: number;
}

export interface FinancialMetrics {
  cpl: number | null; // Cost per Lead
  cac: number | null; // Customer Acquisition Cost
  roi: number | null; // Return on Investment
  revenue: number | null; // Total revenue estimate
}

export interface FunnelOutputs {
  globalConversion: number | null; // Lead -> Sale %
  stages: FunnelStage[];
  salesVelocity: number | null; // R$/day
  financial: FinancialMetrics;
  hasValidData: boolean;
}

// Minimum sample sizes for eligibility
export const MIN_SAMPLE_SIZES = {
  leads: 30,
  mqls: 20,
  sqls: 10,
  oportunidades: 10,
  contratos: 5,
};

/**
 * Calculate safe division, returning null if denominator is 0 or NaN
 */
function safeDivide(numerator: number, denominator: number): number | null {
  if (!denominator || isNaN(denominator) || denominator === 0) return null;
  if (isNaN(numerator)) return null;
  return (numerator / denominator) * 100;
}

/**
 * Safe division for currency (not percentage)
 */
function safeDivideCurrency(numerator: number, denominator: number): number | null {
  if (!denominator || isNaN(denominator) || denominator === 0) return null;
  if (isNaN(numerator)) return null;
  return numerator / denominator;
}

/**
 * Check if a stage has enough data for reliable analysis
 */
function isEligible(value: number, minSample: number): boolean {
  return value >= minSample;
}

/**
 * Calculate financial metrics
 */
function calculateFinancialMetrics(inputs: FunnelInputs): FinancialMetrics {
  const { leads, contratos, investimento, ticketMedio } = inputs;
  
  // CPL = Investment / Leads
  const cpl = investimento && leads > 0 ? safeDivideCurrency(investimento, leads) : null;
  
  // CAC = Investment / Contracts
  const cac = investimento && contratos > 0 ? safeDivideCurrency(investimento, contratos) : null;
  
  // Revenue estimate = Contracts × Ticket
  const revenue = contratos > 0 && ticketMedio ? contratos * ticketMedio : null;
  
  // ROI = (Revenue - Investment) / Investment
  let roi: number | null = null;
  if (revenue !== null && investimento && investimento > 0) {
    roi = ((revenue - investimento) / investimento) * 100;
  }
  
  return { cpl, cac, roi, revenue };
}

/**
 * Calculate all funnel metrics
 */
export function calculateFunnel(inputs: FunnelInputs): FunnelOutputs {
  const { leads, mqls, sqls, oportunidades, contratos, cicloVendas, ticketMedio } = inputs;
  
  // Global conversion: Contracts / Leads
  const globalConversion = safeDivide(contratos, leads);
  
  // Define stages
  const stages: FunnelStage[] = [
    {
      key: 'lead_to_mql',
      label: 'Lead → MQL',
      labelShort: 'L→MQL',
      fromLabel: 'Leads',
      toLabel: 'MQL',
      from: leads,
      to: mqls,
      rate: safeDivide(mqls, leads),
      eligible: isEligible(leads, MIN_SAMPLE_SIZES.leads),
      minSampleSize: MIN_SAMPLE_SIZES.leads,
    },
    {
      key: 'mql_to_sql',
      label: 'MQL → SQL',
      labelShort: 'MQL→SQL',
      fromLabel: 'MQL',
      toLabel: 'SQL',
      from: mqls,
      to: sqls,
      rate: safeDivide(sqls, mqls),
      eligible: isEligible(mqls, MIN_SAMPLE_SIZES.mqls),
      minSampleSize: MIN_SAMPLE_SIZES.mqls,
    },
    {
      key: 'sql_to_opp',
      label: 'SQL → Oportunidade',
      labelShort: 'SQL→Opp',
      fromLabel: 'SQL',
      toLabel: 'Oportunidade',
      from: sqls,
      to: oportunidades,
      rate: safeDivide(oportunidades, sqls),
      eligible: isEligible(sqls, MIN_SAMPLE_SIZES.sqls),
      minSampleSize: MIN_SAMPLE_SIZES.sqls,
    },
    {
      key: 'opp_to_sale',
      label: 'Oportunidade → Venda',
      labelShort: 'Opp→Venda',
      fromLabel: 'Oportunidade',
      toLabel: 'Contrato',
      from: oportunidades,
      to: contratos,
      rate: safeDivide(contratos, oportunidades),
      eligible: isEligible(oportunidades, MIN_SAMPLE_SIZES.oportunidades),
      minSampleSize: MIN_SAMPLE_SIZES.oportunidades,
    },
  ];
  
  // Sales Velocity: (Opportunities × Deal Size × Win Rate) / Cycle Length
  let salesVelocity: number | null = null;
  if (cicloVendas && cicloVendas > 0 && ticketMedio && ticketMedio > 0 && oportunidades > 0) {
    const winRate = contratos / oportunidades; // decimal
    salesVelocity = (oportunidades * ticketMedio * winRate) / cicloVendas;
  }
  
  // Financial metrics
  const financial = calculateFinancialMetrics(inputs);
  
  const hasValidData = leads > 0 && contratos >= 0;
  
  return {
    globalConversion,
    stages,
    salesVelocity,
    financial,
    hasValidData,
  };
}

/**
 * Identify the bottleneck stage (lowest conversion rate among eligible stages)
 */
export function identifyBottleneck(stages: FunnelStage[]): FunnelStage | null {
  const eligibleStages = stages.filter(s => s.eligible && s.rate !== null);
  if (eligibleStages.length === 0) return null;
  
  return eligibleStages.reduce((min, stage) => 
    (stage.rate! < min.rate!) ? stage : min
  , eligibleStages[0]);
}

/**
 * Get stages sorted by conversion rate (ascending - worst first)
 */
export function getStagesByPerformance(stages: FunnelStage[]): FunnelStage[] {
  return stages
    .filter(s => s.eligible && s.rate !== null)
    .sort((a, b) => (a.rate ?? 100) - (b.rate ?? 100));
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number | null): string {
  if (value === null || isNaN(value)) return '—';
  return `${value.toFixed(2)}%`;
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number | null): string {
  if (value === null || isNaN(value)) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number | null): string {
  if (value === null || isNaN(value)) return '—';
  return new Intl.NumberFormat('pt-BR').format(value);
}
