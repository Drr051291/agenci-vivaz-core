// Benchmark Inside Sales B2B e B2C Brasil 2025
// Source of truth for all benchmark data
// Data: Taxas de Conversão Meta Ads por Segmento

export type SetorAtuacao = 
  | 'geral_b2b' 
  | 'geral_b2c' 
  | 'consultoria' 
  | 'saas_tech' 
  | 'industria' 
  | 'agencias_marketing';

export interface StageBenchmark {
  min: number;  // % minimum expected
  max: number;  // % maximum expected
  avg: number;  // % average
}

export interface StageBenchmarks {
  lead_to_mql: StageBenchmark;
  mql_to_sql: StageBenchmark;
  sql_to_opp: StageBenchmark;
  opp_to_sale: StageBenchmark;
}

export interface BenchmarkProfile {
  setor: SetorAtuacao;
  label: string;
  description: string;
  conversionRate: number; // Lead -> Sale overall (%)
  conversionRange: { min: number; max: number };
  stages: StageBenchmarks;
}

// Hardcoded constants from "Taxas de Conversão Meta Ads por Segmento" study
export const BENCHMARK_DATA: Record<SetorAtuacao, BenchmarkProfile> = {
  geral_b2b: {
    setor: 'geral_b2b',
    label: 'Geral B2B',
    description: 'Média geral do mercado B2B brasileiro',
    conversionRate: 0.7, // avg of 0.4-1.0
    conversionRange: { min: 0.4, max: 1.0 },
    stages: {
      lead_to_mql: { min: 20, max: 25, avg: 22.5 },
      mql_to_sql: { min: 20, max: 30, avg: 25 },
      sql_to_opp: { min: 60, max: 70, avg: 65 },
      opp_to_sale: { min: 15, max: 20, avg: 17.5 },
    },
  },
  geral_b2c: {
    setor: 'geral_b2c',
    label: 'Serviços / High Ticket B2C',
    description: 'Serviços de alto valor para consumidor final',
    conversionRate: 1.0, // avg of 0.5-1.5
    conversionRange: { min: 0.5, max: 1.5 },
    stages: {
      lead_to_mql: { min: 25, max: 35, avg: 30 },
      mql_to_sql: { min: 25, max: 35, avg: 30 },
      sql_to_opp: { min: 55, max: 65, avg: 60 },
      opp_to_sale: { min: 18, max: 25, avg: 21.5 },
    },
  },
  consultoria: {
    setor: 'consultoria',
    label: 'Serviços Complexos (Consultoria High-End)',
    description: 'Consultorias e serviços de alto valor',
    conversionRate: 0.3, // avg of 0.2-0.5
    conversionRange: { min: 0.2, max: 0.5 },
    stages: {
      lead_to_mql: { min: 15, max: 20, avg: 17.5 },
      mql_to_sql: { min: 15, max: 25, avg: 20 },
      sql_to_opp: { min: 50, max: 60, avg: 55 },
      opp_to_sale: { min: 12, max: 18, avg: 15 },
    },
  },
  saas_tech: {
    setor: 'saas_tech',
    label: 'SaaS / Tech B2B',
    description: 'Empresas de tecnologia e software',
    conversionRate: 0.6, // avg of 0.3-0.8
    conversionRange: { min: 0.3, max: 0.8 },
    stages: {
      lead_to_mql: { min: 18, max: 25, avg: 21.5 },
      mql_to_sql: { min: 20, max: 30, avg: 25 },
      sql_to_opp: { min: 55, max: 65, avg: 60 },
      opp_to_sale: { min: 15, max: 22, avg: 18.5 },
    },
  },
  industria: {
    setor: 'industria',
    label: 'Indústria / Manufatura',
    description: 'Segmento industrial e manufatura',
    conversionRate: 1.2, // avg of 0.8-1.5
    conversionRange: { min: 0.8, max: 1.5 },
    stages: {
      lead_to_mql: { min: 30, max: 40, avg: 35 },
      mql_to_sql: { min: 30, max: 40, avg: 35 },
      sql_to_opp: { min: 60, max: 75, avg: 67.5 },
      opp_to_sale: { min: 20, max: 28, avg: 24 },
    },
  },
  agencias_marketing: {
    setor: 'agencias_marketing',
    label: 'Agências de Marketing',
    description: 'Agências e serviços de marketing digital',
    conversionRate: 0.5, // avg of 0.3-0.7
    conversionRange: { min: 0.3, max: 0.7 },
    stages: {
      lead_to_mql: { min: 20, max: 28, avg: 24 },
      mql_to_sql: { min: 18, max: 25, avg: 21.5 },
      sql_to_opp: { min: 50, max: 60, avg: 55 },
      opp_to_sale: { min: 15, max: 22, avg: 18.5 },
    },
  },
};

// Average conversion rate across all sectors (for general comparison)
export const AVERAGE_BRAZIL_CONVERSION = 0.72; // Updated from study

// Channel benchmarks for paid media
export const CHANNEL_BENCHMARKS = {
  linkedin: {
    label: 'LinkedIn Ads',
    leadToOpportunity: { min: 20, max: 35 }, // %
    description: 'Maior qualidade de leads B2B',
  },
  meta: {
    label: 'Meta Ads (Facebook/Instagram)',
    leadToOpportunity: { min: 8, max: 15 }, // %
    description: 'Exige mais nutrição para conversão',
  },
  google: {
    label: 'Google Ads',
    leadToOpportunity: { min: 15, max: 25 }, // %
    description: 'Leads com intenção ativa',
  },
};

// Speed-to-Lead impact
export const SPEED_TO_LEAD = {
  underFiveMinutes: {
    label: 'Resposta < 5 minutos',
    conversionMultiplier: 21, // 21x mais conversão
    description: 'Responder em menos de 5 minutos aumenta a conversão em até 21x',
  },
  underThirtyMinutes: {
    label: 'Resposta < 30 minutos',
    conversionMultiplier: 4,
    description: 'Ainda há ganho significativo até 30 minutos',
  },
};

// SDR impact
export const SDR_IMPACT = {
  withSDR: {
    closingRateIncrease: 40, // %
    description: 'O uso de SDRs pode aumentar o fechamento em até 40%',
  },
};

// Form type impact on high-ticket
export const FORM_TYPE_IMPACT = {
  nativeForms: {
    label: 'Formulários nativos (Lead Gen Forms)',
    qualityImpact: 'Menor qualificação para tickets altos',
    recommendation: 'Evite para tickets altos',
  },
  landingPage: {
    label: 'Landing Pages próprias',
    qualityImpact: 'Maior qualificação via confiança e prova social',
    recommendation: 'Prefira para tickets altos',
  },
};

export const SETORES_LIST = Object.values(BENCHMARK_DATA).map(b => ({
  value: b.setor,
  label: b.label,
  description: b.description,
}));

export function getBenchmarkForSetor(setor: SetorAtuacao): BenchmarkProfile {
  return BENCHMARK_DATA[setor] || BENCHMARK_DATA.geral_b2b;
}

export function isAboveBenchmark(rate: number, setor: SetorAtuacao): boolean {
  const benchmark = getBenchmarkForSetor(setor);
  return rate >= benchmark.conversionRate;
}

export type StageStatus = 'ok' | 'warning' | 'critical' | 'no_data';

export function getStageStatus(rate: number | null, benchmark: StageBenchmark): StageStatus {
  if (rate === null) return 'no_data';
  if (rate >= benchmark.avg) return 'ok';
  if (rate >= benchmark.min) return 'warning';
  return 'critical';
}

export function getHealthStatus(rate: number, benchmark: number): 'healthy' | 'warning' | 'critical' {
  if (rate >= benchmark) return 'healthy';
  if (rate >= benchmark * 0.7) return 'warning'; // Within 30% of benchmark
  return 'critical';
}
