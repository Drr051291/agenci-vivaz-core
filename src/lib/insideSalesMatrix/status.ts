// Inside Sales Matrix - Status evaluation

import { InsideSalesInputs, InsideSalesOutputs, getMetricValue } from './calc';

export type MetricStatus = 'positivo' | 'atencao' | 'negativo' | 'sem_dados';
export type StageStatus = 'ok' | 'atencao' | 'critico' | 'sem_dados';

export interface TargetConfig {
  value: number;
  direction: 'min' | 'max';
  label: string;
}

export interface Targets {
  [key: string]: TargetConfig;
}

// Funil simplificado: Leads → MQL → SQL → Contrato
// Targets baseados no estudo BR 2025 (removendo defaults de 25%/30%/40%)
// Lead→MQL: B2B ~10-15%, B2C ~15-25% (não existe 25% universal)
// MQL→SQL: Varia muito por segmento (20-50%)
// SQL→Contrato: Varia (15-30%)
export const DEFAULT_TARGETS: Targets = {
  ctr: { value: 1.5, direction: 'min', label: 'CTR (%)' },
  cpc: { value: 8.0, direction: 'max', label: 'CPC (R$)' },
  cpm: { value: 60.0, direction: 'max', label: 'CPM (R$)' },
  cvrClickLead: { value: 5.0, direction: 'min', label: 'CVR clique → lead (%)' },
  cpl: { value: 150.0, direction: 'max', label: 'CPL (R$)' },
  invalidLeadRate: { value: 15.0, direction: 'max', label: '% leads inválidos' },
  leadToMql: { value: 15.0, direction: 'min', label: 'Lead → MQL (%)' }, // BR 2025: 10-20% típico
  ttft: { value: 5.0, direction: 'max', label: 'TTFT (min)' }, // BR 2025: <5 min ideal
  contactRate24h: { value: 80.0, direction: 'min', label: 'Contact rate 24h (%)' },
  connectRate: { value: 25.0, direction: 'min', label: 'Connect rate (%)' },
  salRate: { value: 60.0, direction: 'min', label: 'SAL rate (%)' },
  mqlToSql: { value: 30.0, direction: 'min', label: 'MQL → SQL (%)' }, // BR 2025: 20-35%
  sqlToWin: { value: 20.0, direction: 'min', label: 'SQL → Contrato (%)' }, // BR 2025: 15-25%
  mqlAgingDays: { value: 7.0, direction: 'max', label: 'Aging MQL (dias)' },
  salesCycleDays: { value: 69.0, direction: 'max', label: 'Ciclo de vendas (dias)' }, // BR 2025 alto ticket
  discountRate: { value: 15.0, direction: 'max', label: 'Taxa de desconto (%)' },
};

const BUFFER_PERCENT = 0.10; // 10% buffer for "Atenção"

export function evaluateMetricStatus(
  value: number | undefined,
  target: TargetConfig | undefined
): MetricStatus {
  if (value === undefined || target === undefined) return 'sem_dados';
  
  const { value: targetValue, direction } = target;
  const buffer = targetValue * BUFFER_PERCENT;
  
  if (direction === 'min') {
    // Higher is better
    if (value >= targetValue) return 'positivo';
    if (value >= targetValue - buffer) return 'atencao';
    return 'negativo';
  } else {
    // Lower is better
    if (value <= targetValue) return 'positivo';
    if (value <= targetValue + buffer) return 'atencao';
    return 'negativo';
  }
}

export function calculateDelta(
  value: number | undefined,
  target: TargetConfig | undefined
): { absolute: number; relative: number } | undefined {
  if (value === undefined || target === undefined) return undefined;
  
  const absolute = value - target.value;
  const relative = target.value !== 0 ? (absolute / target.value) * 100 : 0;
  
  return { absolute, relative };
}

export interface StageMetric {
  key: string;
  label: string;
  value: number | undefined;
  target: TargetConfig | undefined;
  status: MetricStatus;
  delta?: { absolute: number; relative: number };
}

export interface Stage {
  id: string;
  name: string;
  mainConversionKey: string;
  metrics: string[];
}

// Funil simplificado: 3 etapas (sem reuniões separadas)
export const STAGES: Stage[] = [
  {
    id: 'lead_to_mql',
    name: 'Lead → MQL',
    mainConversionKey: 'leadToMql',
    metrics: ['ctr', 'cpc', 'cpm', 'cvrClickLead', 'cpl', 'invalidLeadRate', 'fitFillRate', 'leadToMql'],
  },
  {
    id: 'mql_to_sql',
    name: 'MQL → SQL',
    mainConversionKey: 'mqlToSql',
    metrics: ['ttft', 'contactRate24h', 'connectRate', 'salRate', 'mqlAgingDays', 'mqlToSql'],
  },
  {
    id: 'sql_to_win',
    name: 'SQL → Contrato',
    mainConversionKey: 'sqlToWin',
    metrics: ['sqlToWin', 'responseRate', 'attemptsPerSql', 'timeToScheduleDays', 'salesCycleDays', 'discountRate'],
  },
];

export function evaluateStage(
  stage: Stage,
  inputs: InsideSalesInputs,
  outputs: InsideSalesOutputs,
  targets: Targets
): { status: StageStatus; metrics: StageMetric[]; failingMetrics: string[] } {
  const metrics: StageMetric[] = [];
  const failingMetrics: string[] = [];
  let hasNegative = false;
  let hasAtencao = false;
  let allNoData = true;

  for (const key of stage.metrics) {
    const value = getMetricValue(key, inputs, outputs);
    const target = targets[key];
    const status = evaluateMetricStatus(value, target);
    const delta = calculateDelta(value, target);
    
    metrics.push({
      key,
      label: target?.label || key,
      value,
      target,
      status,
      delta,
    });

    if (status !== 'sem_dados') {
      allNoData = false;
      if (status === 'negativo') {
        hasNegative = true;
        failingMetrics.push(key);
      } else if (status === 'atencao') {
        hasAtencao = true;
      }
    }
  }

  let stageStatus: StageStatus = 'ok';
  if (allNoData) {
    stageStatus = 'sem_dados';
  } else if (hasNegative) {
    stageStatus = 'critico';
  } else if (hasAtencao) {
    stageStatus = 'atencao';
  }

  return { status: stageStatus, metrics, failingMetrics };
}

export interface PriorityItem {
  stageId: string;
  stageName: string;
  metricKey: string;
  metricLabel: string;
  value: number | undefined;
  target: TargetConfig;
  deltaPercent: number;
  score: number;
}

export function calculatePriorities(
  inputs: InsideSalesInputs,
  outputs: InsideSalesOutputs,
  targets: Targets
): PriorityItem[] {
  const priorities: PriorityItem[] = [];
  
  STAGES.forEach((stage, stageIndex) => {
    const stageWeight = 1 + (STAGES.length - stageIndex) * 0.1; // Earlier stages slightly more weight
    
    for (const key of stage.metrics) {
      const value = getMetricValue(key, inputs, outputs);
      const target = targets[key];
      
      if (value === undefined || target === undefined) continue;
      
      const status = evaluateMetricStatus(value, target);
      if (status !== 'negativo') continue;
      
      const deltaPercent = target.value !== 0 
        ? Math.abs((value - target.value) / target.value) * 100 
        : 0;
      
      // Score: higher = more critical (stageWeight * deltaPercent)
      const score = stageWeight * deltaPercent;
      
      priorities.push({
        stageId: stage.id,
        stageName: stage.name,
        metricKey: key,
        metricLabel: target.label,
        value,
        target,
        deltaPercent,
        score,
      });
    }
  });
  
  // Sort by score descending and take top 3
  return priorities.sort((a, b) => b.score - a.score).slice(0, 3);
}
