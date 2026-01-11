// Calculation logic for Performance Matrix Pro

import { SetorAtuacao, getBenchmarkForSetor, getStageStatus, StageStatus, StageBenchmark } from './benchmarks';

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
  key: 'lead_to_mql' | 'mql_to_sql' | 'sql_to_opp' | 'opp_to_sale';
  label: string;
  labelShort: string;
  fromLabel: string;
  toLabel: string;
  from: number;
  to: number;
  rate: number | null; // null when denominator is 0
  eligible: boolean;
  minSampleSize: number;
  // New: benchmark comparison
  benchmark?: StageBenchmark;
  status: StageStatus;
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
 * Calculate all funnel metrics with benchmark comparison
 */
export function calculateFunnel(inputs: FunnelInputs, setor: SetorAtuacao = 'geral_b2b'): FunnelOutputs {
  const { leads, mqls, sqls, oportunidades, contratos, cicloVendas, ticketMedio } = inputs;
  const benchmark = getBenchmarkForSetor(setor);
  
  // Global conversion: Contracts / Leads
  const globalConversion = safeDivide(contratos, leads);
  
  // Helper to create stage with benchmark
  const createStage = (
    key: FunnelStage['key'],
    label: string,
    labelShort: string,
    fromLabel: string,
    toLabel: string,
    from: number,
    to: number,
    minSampleKey: keyof typeof MIN_SAMPLE_SIZES
  ): FunnelStage => {
    const rate = safeDivide(to, from);
    const stageBenchmark = benchmark.stages[key];
    const eligible = isEligible(from, MIN_SAMPLE_SIZES[minSampleKey]);
    
    return {
      key,
      label,
      labelShort,
      fromLabel,
      toLabel,
      from,
      to,
      rate,
      eligible,
      minSampleSize: MIN_SAMPLE_SIZES[minSampleKey],
      benchmark: stageBenchmark,
      status: eligible ? getStageStatus(rate, stageBenchmark) : 'no_data',
    };
  };
  
  // Define stages with benchmarks
  const stages: FunnelStage[] = [
    createStage('lead_to_mql', 'Lead → MQL', 'L→MQL', 'Leads', 'MQL', leads, mqls, 'leads'),
    createStage('mql_to_sql', 'MQL → SQL', 'MQL→SQL', 'MQL', 'SQL', mqls, sqls, 'mqls'),
    createStage('sql_to_opp', 'SQL → Oportunidade', 'SQL→Opp', 'SQL', 'Oportunidade', sqls, oportunidades, 'sqls'),
    createStage('opp_to_sale', 'Oportunidade → Venda', 'Opp→Venda', 'Oportunidade', 'Contrato', oportunidades, contratos, 'oportunidades'),
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
 * Simulate funnel with custom conversion rates
 */
export interface SimulatedRates {
  lead_to_mql: number;
  mql_to_sql: number;
  sql_to_opp: number;
  opp_to_sale: number;
}

export interface SimulationResult {
  leads: number;
  mqls: number;
  sqls: number;
  oportunidades: number;
  contratos: number;
  revenue: number | null;
  roi: number | null;
  cac: number | null;
  globalConversion: number | null;
}

/**
 * Calculate simulated funnel results based on custom conversion rates
 */
export function simulateFunnel(
  baseLeads: number,
  rates: SimulatedRates,
  ticketMedio?: number,
  investimento?: number
): SimulationResult {
  // Calculate each stage sequentially using the simulated rates
  const mqls = Math.round(baseLeads * (rates.lead_to_mql / 100));
  const sqls = Math.round(mqls * (rates.mql_to_sql / 100));
  const oportunidades = Math.round(sqls * (rates.sql_to_opp / 100));
  const contratos = Math.round(oportunidades * (rates.opp_to_sale / 100));
  
  // Calculate financial metrics
  const revenue = contratos > 0 && ticketMedio ? contratos * ticketMedio : null;
  
  let roi: number | null = null;
  if (revenue !== null && investimento && investimento > 0) {
    roi = ((revenue - investimento) / investimento) * 100;
  }
  
  const cac = investimento && contratos > 0 ? investimento / contratos : null;
  
  const globalConversion = baseLeads > 0 ? (contratos / baseLeads) * 100 : null;
  
  return {
    leads: baseLeads,
    mqls,
    sqls,
    oportunidades,
    contratos,
    revenue,
    roi,
    cac,
    globalConversion,
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
