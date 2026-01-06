// Benchmarks de Conversão por Segmento de Negócio
// Baseado em pesquisas de mercado 2024/2025 de múltiplas fontes:
// - First Page Sage, HubSpot, Gartner, Salesforce, Industry Reports

export type SegmentoNegocio = 
  | 'b2b_software'
  | 'b2b_servicos'
  | 'b2b_consultoria'
  | 'b2b_industria'
  | 'b2c_varejo'
  | 'b2c_servicos'
  | 'b2c_educacao'
  | 'b2b_saude'
  | 'b2b_financeiro';

export interface BenchmarkRange {
  min: number;
  max: number;
  medio: number;
}

export interface SegmentoBenchmark {
  id: SegmentoNegocio;
  label: string;
  descricao: string;
  // Taxas de conversão por etapa (em %)
  leadToMql: BenchmarkRange;
  mqlToSql: BenchmarkRange;
  sqlToContrato: BenchmarkRange;
  // Ciclo de vendas típico
  cicloVendasDias: BenchmarkRange;
  // Ticket médio influencia conversões
  ticketMedio: 'baixo' | 'medio' | 'alto';
  // Notas sobre o segmento
  notas: string;
}

// Benchmarks consolidados por segmento
// Fontes: First Page Sage 2025, HubSpot 2024, Gartner, Industry Reports
export const SEGMENTO_BENCHMARKS: Record<SegmentoNegocio, SegmentoBenchmark> = {
  b2b_software: {
    id: 'b2b_software',
    label: 'B2B Software / SaaS',
    descricao: 'Empresas de software, plataformas e SaaS B2B',
    leadToMql: { min: 25, max: 45, medio: 35 },
    mqlToSql: { min: 30, max: 50, medio: 40 },
    sqlToContrato: { min: 15, max: 30, medio: 22 },
    cicloVendasDias: { min: 30, max: 120, medio: 60 },
    ticketMedio: 'medio',
    notas: 'Conversões dependem de trial/demo. Ciclo mais longo para enterprise.',
  },
  b2b_servicos: {
    id: 'b2b_servicos',
    label: 'B2B Serviços',
    descricao: 'Agências, consultorias operacionais, outsourcing',
    leadToMql: { min: 20, max: 40, medio: 30 },
    mqlToSql: { min: 25, max: 45, medio: 35 },
    sqlToContrato: { min: 20, max: 35, medio: 27 },
    cicloVendasDias: { min: 14, max: 60, medio: 30 },
    ticketMedio: 'medio',
    notas: 'Relacionamento e confiança são críticos. Propostas customizadas.',
  },
  b2b_consultoria: {
    id: 'b2b_consultoria',
    label: 'B2B Consultoria',
    descricao: 'Consultorias estratégicas, gestão, tecnologia',
    leadToMql: { min: 30, max: 50, medio: 40 },
    mqlToSql: { min: 35, max: 55, medio: 45 },
    sqlToContrato: { min: 25, max: 40, medio: 32 },
    cicloVendasDias: { min: 30, max: 180, medio: 90 },
    ticketMedio: 'alto',
    notas: 'Alto ticket, decisão complexa. Requer múltiplos stakeholders.',
  },
  b2b_industria: {
    id: 'b2b_industria',
    label: 'B2B Indústria',
    descricao: 'Manufatura, equipamentos, insumos industriais',
    leadToMql: { min: 35, max: 55, medio: 45 },
    mqlToSql: { min: 30, max: 50, medio: 40 },
    sqlToContrato: { min: 20, max: 35, medio: 28 },
    cicloVendasDias: { min: 45, max: 180, medio: 90 },
    ticketMedio: 'alto',
    notas: 'Leads mais qualificados naturalmente. Decisão técnica + comercial.',
  },
  b2c_varejo: {
    id: 'b2c_varejo',
    label: 'B2C Varejo / E-commerce',
    descricao: 'Lojas online, marketplaces, varejo direto ao consumidor',
    leadToMql: { min: 15, max: 30, medio: 22 },
    mqlToSql: { min: 40, max: 65, medio: 52 },
    sqlToContrato: { min: 30, max: 50, medio: 40 },
    cicloVendasDias: { min: 1, max: 14, medio: 3 },
    ticketMedio: 'baixo',
    notas: 'Volume alto, decisão rápida. Foco em abandono e remarketing.',
  },
  b2c_servicos: {
    id: 'b2c_servicos',
    label: 'B2C Serviços',
    descricao: 'Serviços ao consumidor: saúde, beleza, fitness, etc.',
    leadToMql: { min: 20, max: 40, medio: 30 },
    mqlToSql: { min: 35, max: 55, medio: 45 },
    sqlToContrato: { min: 35, max: 55, medio: 45 },
    cicloVendasDias: { min: 1, max: 21, medio: 7 },
    ticketMedio: 'baixo',
    notas: 'Decisão emocional. Urgência e conveniência são fatores-chave.',
  },
  b2c_educacao: {
    id: 'b2c_educacao',
    label: 'B2C Educação',
    descricao: 'Cursos, treinamentos, ensino online',
    leadToMql: { min: 25, max: 50, medio: 38 },
    mqlToSql: { min: 30, max: 50, medio: 40 },
    sqlToContrato: { min: 20, max: 40, medio: 30 },
    cicloVendasDias: { min: 7, max: 45, medio: 21 },
    ticketMedio: 'medio',
    notas: 'Sazonalidade forte. Proof of concept via conteúdo gratuito.',
  },
  b2b_saude: {
    id: 'b2b_saude',
    label: 'B2B Saúde / Medtech',
    descricao: 'Equipamentos médicos, software para saúde, farmacêutico',
    leadToMql: { min: 35, max: 55, medio: 45 },
    mqlToSql: { min: 35, max: 50, medio: 42 },
    sqlToContrato: { min: 25, max: 40, medio: 32 },
    cicloVendasDias: { min: 60, max: 365, medio: 150 },
    ticketMedio: 'alto',
    notas: 'Regulamentação afeta ciclo. Decisão por comitês técnicos.',
  },
  b2b_financeiro: {
    id: 'b2b_financeiro',
    label: 'B2B Financeiro / Fintech',
    descricao: 'Soluções financeiras B2B, bancos, fintechs',
    leadToMql: { min: 28, max: 48, medio: 38 },
    mqlToSql: { min: 35, max: 55, medio: 45 },
    sqlToContrato: { min: 25, max: 42, medio: 33 },
    cicloVendasDias: { min: 30, max: 120, medio: 60 },
    ticketMedio: 'alto',
    notas: 'Compliance e segurança são críticos. Múltiplos decisores.',
  },
};

// Lista para UI
export const SEGMENTOS_LIST = [
  { value: 'b2b_software', label: 'B2B Software / SaaS', grupo: 'B2B' },
  { value: 'b2b_servicos', label: 'B2B Serviços', grupo: 'B2B' },
  { value: 'b2b_consultoria', label: 'B2B Consultoria', grupo: 'B2B' },
  { value: 'b2b_industria', label: 'B2B Indústria', grupo: 'B2B' },
  { value: 'b2b_saude', label: 'B2B Saúde / Medtech', grupo: 'B2B' },
  { value: 'b2b_financeiro', label: 'B2B Financeiro / Fintech', grupo: 'B2B' },
  { value: 'b2c_varejo', label: 'B2C Varejo / E-commerce', grupo: 'B2C' },
  { value: 'b2c_servicos', label: 'B2C Serviços', grupo: 'B2C' },
  { value: 'b2c_educacao', label: 'B2C Educação', grupo: 'B2C' },
];

// Obter benchmark profile para uso nos componentes
export interface SegmentoBenchmarkProfile {
  leadToMql: number;
  mqlToSql: number;
  sqlToContrato: number;
  faixa: {
    leadToMql: string;
    mqlToSql: string;
    sqlToContrato: string;
  };
  segmento: SegmentoBenchmark;
}

export function getSegmentoBenchmarkProfile(
  segmentoId: SegmentoNegocio | string | undefined
): SegmentoBenchmarkProfile | null {
  if (!segmentoId) return null;
  
  const segmento = SEGMENTO_BENCHMARKS[segmentoId as SegmentoNegocio];
  if (!segmento) return null;
  
  return {
    leadToMql: segmento.leadToMql.medio,
    mqlToSql: segmento.mqlToSql.medio,
    sqlToContrato: segmento.sqlToContrato.medio,
    faixa: {
      leadToMql: `${segmento.leadToMql.min}-${segmento.leadToMql.max}%`,
      mqlToSql: `${segmento.mqlToSql.min}-${segmento.mqlToSql.max}%`,
      sqlToContrato: `${segmento.sqlToContrato.min}-${segmento.sqlToContrato.max}%`,
    },
    segmento,
  };
}

// Aplicar benchmarks como metas
export function applySegmentoBenchmarkAsTargets(
  currentTargets: Record<string, { value: number; direction: string; label: string }>,
  profile: SegmentoBenchmarkProfile
): Record<string, { value: number; direction: string; label: string }> {
  const updated = { ...currentTargets };
  
  if (updated.leadToMql) {
    updated.leadToMql = { ...updated.leadToMql, value: profile.leadToMql };
  }
  if (updated.mqlToSql) {
    updated.mqlToSql = { ...updated.mqlToSql, value: profile.mqlToSql };
  }
  // Mapear sqlToContrato para o novo formato (sem reuniões)
  if (updated.sqlToWin) {
    updated.sqlToWin = { ...updated.sqlToWin, value: profile.sqlToContrato };
  }
  
  return updated;
}

// Calcular gap vs benchmark
export function calculateBenchmarkGap(
  currentRate: number | undefined,
  benchmarkValue: number
): { gap: number; status: 'acima' | 'abaixo' | 'dentro' } | null {
  if (currentRate === undefined) return null;
  
  const gap = currentRate - benchmarkValue;
  
  // Dentro de ±5pp é considerado "dentro"
  if (Math.abs(gap) <= 5) {
    return { gap, status: 'dentro' };
  }
  
  return {
    gap,
    status: gap > 0 ? 'acima' : 'abaixo',
  };
}
