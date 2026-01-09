/**
 * BENCHMARKS BRASIL 2025 - Vendas e Geração de Leads
 * Fonte: Estudo "Benchmark de Vendas e Geração de Leads Brasil 2025: B2B, B2C e Serviços Complexos"
 */

// ============ TIPOS ============

export type MercadoBR = 'B2B' | 'B2C';

export type SegmentoBR = 
  | 'consultoria'
  | 'ti_software_b2b'
  | 'industria_fabricacao'
  | 'servicos_juridicos'
  | 'servicos_profissionais_saas'
  | 'b2c_varejo'
  | 'b2c_servicos'
  | 'outro';

export type CanalMidia = 'google_ads' | 'linkedin_ads' | 'meta_ads' | 'outro';

export type TipoCaptura = 'landing_page' | 'lead_nativo';

export type DispositivoBR = 'desktop' | 'mobile' | 'misto';

export interface BR2025Context {
  mercado: MercadoBR;
  segmento?: SegmentoBR;
  canal?: CanalMidia;
  dispositivo?: DispositivoBR;
  captura?: TipoCaptura;
  whatsappCrm?: boolean;
}

export interface BenchmarkRange {
  min: number;
  max: number;
  mediana?: number;
}

export interface BR2025BenchmarkProfile {
  conversaoGeral: number;
  conversaoDesktop?: number;
  conversaoMobile?: number;
  cplRange?: BenchmarkRange;
  leadToOportunidade?: BenchmarkRange;
  notasContexto: string;
}

// ============ DADOS DO ESTUDO BR 2025 ============

// A) Conversão geral (mediana) Brasil 2025
export const CONVERSAO_GERAL_BR2025 = {
  B2B: {
    geral: 2.50,
    desktop: 2.97,
    mobile: 2.72,
  },
  B2C: {
    geral: 3.28,
    desktop: 4.24,
    mobile: 2.98,
  },
};

// B) Segmentos / serviços (taxas e destaques)
export const SEGMENTOS_BR2025: Record<SegmentoBR, {
  label: string;
  conversaoMediana: number | BenchmarkRange;
  notas: string;
  cicloVendasDias?: number;
}> = {
  consultoria: {
    label: 'Consultoria / Serviços Complexos',
    conversaoMediana: 1.55,
    notas: 'Ticket alto, decisão complexa. LP é superior vs Lead Nativo.',
    cicloVendasDias: 90,
  },
  ti_software_b2b: {
    label: 'TI e Software B2B',
    conversaoMediana: 2.06,
    notas: 'Alta maturidade digital; CRM integrado em ~70% casos.',
    cicloVendasDias: 60,
  },
  industria_fabricacao: {
    label: 'Indústria / Fabricação',
    conversaoMediana: 3.81,
    notas: 'Leads mais qualificados naturalmente. Decisão técnica + comercial.',
    cicloVendasDias: 90,
  },
  servicos_juridicos: {
    label: 'Serviços Jurídicos',
    conversaoMediana: { min: 4.45, max: 7.4 },
    notas: 'Topo de funil forte. Urgência é fator-chave.',
    cicloVendasDias: 30,
  },
  servicos_profissionais_saas: {
    label: 'Serviços Profissionais e SaaS',
    conversaoMediana: { min: 10, max: 12 },
    notas: 'Alta performance quando SDR qualifica. Trial/demo essencial.',
    cicloVendasDias: 45,
  },
  b2c_varejo: {
    label: 'B2C Varejo / E-commerce',
    conversaoMediana: 3.28,
    notas: 'Volume alto, decisão rápida. Foco em abandono e remarketing.',
    cicloVendasDias: 3,
  },
  b2c_servicos: {
    label: 'B2C Serviços',
    conversaoMediana: 3.00,
    notas: 'Decisão emocional. Urgência e conveniência são fatores-chave.',
    cicloVendasDias: 7,
  },
  outro: {
    label: 'Outro / Não especificado',
    conversaoMediana: 2.50,
    notas: 'Use benchmarks gerais do mercado.',
  },
};

// C) Mídia paga (Brasil 2025)
export const MIDIA_PAGA_BR2025 = {
  orcamentoMktB2B_mediaPct: 22, // % orçamento de marketing B2B médio em mídia paga
  
  linkedin_ads: {
    label: 'LinkedIn Ads',
    cplDecisores: { min: 150, max: 400 } as BenchmarkRange,
    leadToOportunidade: { min: 20, max: 35 } as BenchmarkRange, // Lead→SQL
    notas: 'CPL alto, mas qualidade superior para B2B decision makers.',
  },
  
  google_ads: {
    label: 'Google Ads',
    cpl: { min: 80, max: 250 } as BenchmarkRange,
    conversaoB2C: 5.18,
    conversaoB2BIndustrialDesktop: 5.83,
    notas: 'Intenção de busca qualifica naturalmente.',
  },
  
  meta_ads: {
    label: 'Meta Ads',
    cplB2B: { min: 50, max: 95 } as BenchmarkRange,
    notas: 'Leads mais topo de funil. Exige nutrição.',
  },
};

// D) Captura: Landing Page vs Lead Nativo
export const CAPTURA_BR2025 = {
  lead_nativo: {
    label: 'Lead Nativo (Form)',
    conversaoClique: 50, // ~50% de quem clica abre o form
    cplMultiplier: 0.5, // 30–50% menor CPL
    qualidade: 'baixa_media' as const,
    notas: 'Mais "lixo/acidental". Exige qualificação rigorosa.',
  },
  landing_page: {
    label: 'Landing Page',
    conversao: { min: 2, max: 6.6 } as BenchmarkRange,
    cplMultiplier: 1.0,
    qualidade: 'alta' as const,
    notas: 'Persuasão e filtros. Recomendado para consultoria/serviços complexos.',
  },
};

// E) Inside Sales (eficiência)
export const INSIDE_SALES_BR2025 = {
  speedToLead: {
    ideal: 5, // minutos
    impactoConversao: 21, // até 21x mais conversão se <5min
    notas: 'Responder em <5 min aumenta conversão drasticamente.',
  },
  ratioSdrAe: 2.5, // 1 SDR para 2,5 AEs
  showRateConsultoria: 80, // % saudável
  
  cicloAltoTicket: {
    mediaDias: 69,
    transacional: 'dias/semanas',
    consultiva: '2–6 meses',
    enterprise: '6–18 meses',
  },
};

// F) WhatsApp (Brasil como exceção)
export const WHATSAPP_BR2025 = {
  comCrmIntegrado: 3.12, // conversão %
  semCrmIntegrado: 2.52, // conversão %
  uplift: 24, // ~24% de uplift
  notas: 'Brasil tem adoção massiva. Integrar ao CRM é crítico.',
};

// ============ FUNÇÕES UTILITÁRIAS ============

export function getBR2025Profile(context: BR2025Context): BR2025BenchmarkProfile {
  const { mercado, segmento, canal, dispositivo, captura, whatsappCrm } = context;
  
  // Base: conversão geral do mercado
  let conversaoGeral = CONVERSAO_GERAL_BR2025[mercado].geral;
  const conversaoDesktop = CONVERSAO_GERAL_BR2025[mercado].desktop;
  const conversaoMobile = CONVERSAO_GERAL_BR2025[mercado].mobile;
  
  // Ajustar por segmento se disponível
  if (segmento && SEGMENTOS_BR2025[segmento]) {
    const seg = SEGMENTOS_BR2025[segmento].conversaoMediana;
    conversaoGeral = typeof seg === 'number' ? seg : (seg.min + seg.max) / 2;
  }
  
  // Ajustar por WhatsApp
  if (whatsappCrm === true) {
    conversaoGeral = Math.max(conversaoGeral, WHATSAPP_BR2025.comCrmIntegrado);
  }
  
  // CPL range baseado no canal
  let cplRange: BenchmarkRange | undefined;
  if (canal === 'linkedin_ads') {
    cplRange = MIDIA_PAGA_BR2025.linkedin_ads.cplDecisores;
  } else if (canal === 'google_ads') {
    cplRange = MIDIA_PAGA_BR2025.google_ads.cpl;
  } else if (canal === 'meta_ads') {
    cplRange = MIDIA_PAGA_BR2025.meta_ads.cplB2B;
  }
  
  // Ajustar CPL por tipo de captura
  if (cplRange && captura === 'lead_nativo') {
    cplRange = {
      min: Math.round(cplRange.min * CAPTURA_BR2025.lead_nativo.cplMultiplier),
      max: Math.round(cplRange.max * CAPTURA_BR2025.lead_nativo.cplMultiplier),
    };
  }
  
  // Lead to Oportunidade (SQL)
  let leadToOportunidade: BenchmarkRange | undefined;
  if (canal === 'linkedin_ads') {
    leadToOportunidade = MIDIA_PAGA_BR2025.linkedin_ads.leadToOportunidade;
  }
  
  // Construir notas de contexto
  const notas: string[] = [];
  notas.push(`Mercado: ${mercado} (mediana BR 2025: ${CONVERSAO_GERAL_BR2025[mercado].geral}%)`);
  
  if (segmento && SEGMENTOS_BR2025[segmento]) {
    notas.push(SEGMENTOS_BR2025[segmento].notas);
  }
  
  if (dispositivo) {
    const taxaDisp = dispositivo === 'desktop' ? conversaoDesktop : 
                     dispositivo === 'mobile' ? conversaoMobile : null;
    if (taxaDisp) notas.push(`${dispositivo}: ${taxaDisp}%`);
  }
  
  if (captura) {
    notas.push(CAPTURA_BR2025[captura].notas);
  }
  
  if (whatsappCrm === true) {
    notas.push(WHATSAPP_BR2025.notas);
  }
  
  return {
    conversaoGeral,
    conversaoDesktop,
    conversaoMobile,
    cplRange,
    leadToOportunidade,
    notasContexto: notas.join(' | '),
  };
}

export function formatBenchmarkRange(range: BenchmarkRange | undefined, prefix = ''): string {
  if (!range) return '—';
  return `${prefix}${range.min}–${range.max}`;
}

export function getSegmentoLabel(segmento: SegmentoBR | undefined): string {
  if (!segmento || !SEGMENTOS_BR2025[segmento]) return 'Não especificado';
  return SEGMENTOS_BR2025[segmento].label;
}

export function getCanalLabel(canal: CanalMidia | undefined): string {
  if (!canal) return 'Não especificado';
  const labels: Record<CanalMidia, string> = {
    google_ads: 'Google Ads',
    linkedin_ads: 'LinkedIn Ads',
    meta_ads: 'Meta Ads',
    outro: 'Outro',
  };
  return labels[canal];
}

export function getCapturaLabel(captura: TipoCaptura | undefined): string {
  if (!captura) return 'Não especificado';
  return captura === 'landing_page' ? 'Landing Page' : 'Lead Nativo (Form)';
}

// Lista para selects
export const MERCADOS_LIST = [
  { value: 'B2B', label: 'B2B' },
  { value: 'B2C', label: 'B2C' },
];

export const SEGMENTOS_BR2025_LIST = Object.entries(SEGMENTOS_BR2025).map(([value, data]) => ({
  value: value as SegmentoBR,
  label: data.label,
  grupo: value.startsWith('b2c') ? 'B2C' : 'B2B',
}));

export const CANAIS_MIDIA_LIST = [
  { value: 'google_ads', label: 'Google Ads', description: 'Intenção de busca' },
  { value: 'linkedin_ads', label: 'LinkedIn Ads', description: 'Decision makers B2B' },
  { value: 'meta_ads', label: 'Meta Ads', description: 'Awareness e topo de funil' },
  { value: 'outro', label: 'Outro', description: 'Outros canais' },
];

export const CAPTURA_LIST = [
  { value: 'landing_page', label: 'Landing Page', description: 'Maior qualidade, CVR 2-6.6%' },
  { value: 'lead_nativo', label: 'Lead Nativo (Form)', description: 'Menor CPL, qualidade variável' },
];

export const DISPOSITIVOS_LIST = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'misto', label: 'Misto' },
];
