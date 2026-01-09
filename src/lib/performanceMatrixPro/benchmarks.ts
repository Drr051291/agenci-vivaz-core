// Benchmark Inside Sales B2B e B2C Brasil 2025
// Source of truth for all benchmark data

export type SetorAtuacao = 
  | 'geral_b2b' 
  | 'geral_b2c' 
  | 'consultoria' 
  | 'saas_tech' 
  | 'industria' 
  | 'juridico';

export interface BenchmarkProfile {
  setor: SetorAtuacao;
  label: string;
  description: string;
  conversionRate: number; // Lead -> Sale (%)
  conversionRange?: { min: number; max: number };
}

// Hardcoded constants from study
export const BENCHMARK_DATA: Record<SetorAtuacao, BenchmarkProfile> = {
  geral_b2b: {
    setor: 'geral_b2b',
    label: 'Geral B2B',
    description: 'Média geral do mercado B2B brasileiro',
    conversionRate: 2.50, // Median
    conversionRange: { min: 1.5, max: 4.0 },
  },
  geral_b2c: {
    setor: 'geral_b2c',
    label: 'Geral B2C',
    description: 'Média geral do mercado B2C brasileiro',
    conversionRate: 3.28, // Median
    conversionRange: { min: 2.0, max: 5.0 },
  },
  consultoria: {
    setor: 'consultoria',
    label: 'Consultoria / Serviços Complexos',
    description: 'Consultorias e serviços de alto valor',
    conversionRate: 1.55, // Median
    conversionRange: { min: 0.8, max: 2.5 },
  },
  saas_tech: {
    setor: 'saas_tech',
    label: 'SaaS / Tech B2B',
    description: 'Empresas de tecnologia e software',
    conversionRate: 2.06, // ~Median
    conversionRange: { min: 1.2, max: 3.5 },
  },
  industria: {
    setor: 'industria',
    label: 'Indústria / Manufatura',
    description: 'Segmento industrial',
    conversionRate: 3.81, // Median
    conversionRange: { min: 2.0, max: 5.5 },
  },
  juridico: {
    setor: 'juridico',
    label: 'Serviços Jurídicos',
    description: 'Escritórios de advocacia e serviços legais',
    conversionRate: 5.93, // Average of 4.45-7.4
    conversionRange: { min: 4.45, max: 7.4 },
  },
};

// Average conversion rate across all sectors (for general comparison)
export const AVERAGE_BRAZIL_CONVERSION = 2.98; // From study

// Channel benchmarks
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

export function getHealthStatus(rate: number, benchmark: number): 'healthy' | 'warning' | 'critical' {
  if (rate >= benchmark) return 'healthy';
  if (rate >= benchmark * 0.7) return 'warning'; // Within 30% of benchmark
  return 'critical';
}
