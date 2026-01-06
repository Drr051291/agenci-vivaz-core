// Inside Sales Matrix - Calculation utilities
// Funil: Leads → MQL → SQL → Contrato

export interface InsideSalesInputs {
  // Mídia paga
  investimento?: number;
  impressoes?: number;
  cliques?: number;
  
  // Funil (simplificado: sem etapa reuniões)
  leads?: number;
  invalidLeadRate?: number; // %
  fitFillRate?: number; // %
  mql?: number;
  sql?: number;
  contratos?: number;
  receita?: number;
  
  // Inside Sales
  ttft?: number; // minutos
  contactRate24h?: number; // %
  connectRate?: number; // %
  salRate?: number; // %
  mqlAgingDays?: number;
  responseRate?: number; // %
  attemptsPerSql?: number;
  timeToScheduleDays?: number;
  disqualifyReasons?: string;
  lossReasons?: string;
  discountRate?: number; // %
  salesCycleDays?: number;
}

export interface InsideSalesOutputs {
  // Computed from mídia
  ctr?: number;
  cpc?: number;
  cpm?: number;
  cvrClickLead?: number;
  cpl?: number;
  
  // Stage conversions (funil simplificado)
  leadToMql?: number;
  mqlToSql?: number;
  sqlToWin?: number; // Direto SQL → Contrato
  
  // Additional
  cac?: number;
  receitaPorContrato?: number;
}

export type MetricKey = keyof InsideSalesOutputs | keyof InsideSalesInputs;

export function safeDiv(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined || b === undefined || b === 0) return undefined;
  return a / b;
}

export function calculateOutputs(inputs: InsideSalesInputs): InsideSalesOutputs {
  const {
    investimento, impressoes, cliques, leads, mql, sql, contratos, receita
  } = inputs;

  const ctr = safeDiv(cliques, impressoes) !== undefined ? safeDiv(cliques, impressoes)! * 100 : undefined;
  const cpc = safeDiv(investimento, cliques);
  const cpm = impressoes && investimento ? investimento / (impressoes / 1000) : undefined;
  const cvrClickLead = safeDiv(leads, cliques) !== undefined ? safeDiv(leads, cliques)! * 100 : undefined;
  const cpl = safeDiv(investimento, leads);
  
  const leadToMql = safeDiv(mql, leads) !== undefined ? safeDiv(mql, leads)! * 100 : undefined;
  const mqlToSql = safeDiv(sql, mql) !== undefined ? safeDiv(sql, mql)! * 100 : undefined;
  const sqlToWin = safeDiv(contratos, sql) !== undefined ? safeDiv(contratos, sql)! * 100 : undefined;
  
  const cac = safeDiv(investimento, contratos);
  const receitaPorContrato = safeDiv(receita, contratos);

  return {
    ctr,
    cpc,
    cpm,
    cvrClickLead,
    cpl,
    leadToMql,
    mqlToSql,
    sqlToWin,
    cac,
    receitaPorContrato,
  };
}

// Formatting utilities
export function formatCurrency(value: number | undefined): string {
  if (value === undefined) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | undefined, decimals = 1): string {
  if (value === undefined) return '-';
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number | undefined, decimals = 0): string {
  if (value === undefined) return '-';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatMinutes(value: number | undefined): string {
  if (value === undefined) return '-';
  return `${value.toFixed(0)} min`;
}

export function formatDays(value: number | undefined): string {
  if (value === undefined) return '-';
  return `${value.toFixed(0)} dias`;
}

// Get metric value from inputs or outputs
export function getMetricValue(
  key: string,
  inputs: InsideSalesInputs,
  outputs: InsideSalesOutputs
): number | undefined {
  // First check outputs (computed values)
  if (key in outputs) {
    return outputs[key as keyof InsideSalesOutputs];
  }
  // Then check inputs
  if (key in inputs) {
    return inputs[key as keyof InsideSalesInputs] as number | undefined;
  }
  return undefined;
}

// Format metric by key
export function formatMetricByKey(key: string, value: number | undefined): string {
  if (value === undefined) return '-';
  
  const currencyMetrics = ['investimento', 'cpc', 'cpm', 'cpl', 'cac', 'receitaPorContrato', 'receita'];
  const percentMetrics = [
    'ctr', 'cvrClickLead', 'invalidLeadRate', 'fitFillRate',
    'leadToMql', 'mqlToSql', 'sqlToWin',
    'contactRate24h', 'connectRate', 'salRate', 'responseRate',
    'discountRate'
  ];
  const minuteMetrics = ['ttft'];
  const dayMetrics = ['mqlAgingDays', 'timeToScheduleDays', 'salesCycleDays'];
  
  if (currencyMetrics.includes(key)) return formatCurrency(value);
  if (percentMetrics.includes(key)) return formatPercent(value);
  if (minuteMetrics.includes(key)) return formatMinutes(value);
  if (dayMetrics.includes(key)) return formatDays(value);
  
  return formatNumber(value);
}
