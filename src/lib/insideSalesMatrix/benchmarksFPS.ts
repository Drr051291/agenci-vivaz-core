// First Page Sage 2025 SaaS Benchmark Data
// Source: "Average SaaS Conversion Rates: 2026 Report"

export type FPSChannel = 'seo' | 'ppc' | 'linkedin' | 'email' | 'webinar';
export type FPSSegment =
  | 'adtech'
  | 'automotive_saas'
  | 'crms'
  | 'chemical_pharmaceutical'
  | 'cybersecurity'
  | 'design'
  | 'edtech'
  | 'entertainment'
  | 'fintech'
  | 'hospitality'
  | 'industrial_iot'
  | 'insurance'
  | 'legaltech'
  | 'medtech'
  | 'project_management'
  | 'retail_ecommerce'
  | 'telecom';

export interface FPSBenchmark {
  visitorToLead: number;
  leadToMql: number;
  mqlToSql: number;
  sqlToOpp: number;
  oppToClose: number;
}

// Channel benchmarks from FPS 2025
export const CHANNEL_FPS_BENCHMARKS: Record<FPSChannel, FPSBenchmark> = {
  seo: {
    visitorToLead: 0.021,
    leadToMql: 0.41,
    mqlToSql: 0.51,
    sqlToOpp: 0.49,
    oppToClose: 0.36,
  },
  ppc: {
    visitorToLead: 0.007,
    leadToMql: 0.36,
    mqlToSql: 0.26,
    sqlToOpp: 0.38,
    oppToClose: 0.35,
  },
  linkedin: {
    visitorToLead: 0.022,
    leadToMql: 0.38,
    mqlToSql: 0.30,
    sqlToOpp: 0.41,
    oppToClose: 0.39,
  },
  email: {
    visitorToLead: 0.013,
    leadToMql: 0.43,
    mqlToSql: 0.46,
    sqlToOpp: 0.48,
    oppToClose: 0.32,
  },
  webinar: {
    visitorToLead: 0.009,
    leadToMql: 0.44,
    mqlToSql: 0.39,
    sqlToOpp: 0.42,
    oppToClose: 0.40,
  },
};

// Segment benchmarks from FPS 2025
export const SEGMENT_FPS_BENCHMARKS: Record<FPSSegment, FPSBenchmark> = {
  adtech: {
    visitorToLead: 0.014,
    leadToMql: 0.39,
    mqlToSql: 0.35,
    sqlToOpp: 0.40,
    oppToClose: 0.37,
  },
  automotive_saas: {
    visitorToLead: 0.019,
    leadToMql: 0.37,
    mqlToSql: 0.39,
    sqlToOpp: 0.44,
    oppToClose: 0.36,
  },
  crms: {
    visitorToLead: 0.020,
    leadToMql: 0.36,
    mqlToSql: 0.42,
    sqlToOpp: 0.48,
    oppToClose: 0.38,
  },
  chemical_pharmaceutical: {
    visitorToLead: 0.023,
    leadToMql: 0.47,
    mqlToSql: 0.46,
    sqlToOpp: 0.41,
    oppToClose: 0.39,
  },
  cybersecurity: {
    visitorToLead: 0.016,
    leadToMql: 0.44,
    mqlToSql: 0.38,
    sqlToOpp: 0.40,
    oppToClose: 0.39,
  },
  design: {
    visitorToLead: 0.009,
    leadToMql: 0.40,
    mqlToSql: 0.34,
    sqlToOpp: 0.45,
    oppToClose: 0.38,
  },
  edtech: {
    visitorToLead: 0.014,
    leadToMql: 0.46,
    mqlToSql: 0.35,
    sqlToOpp: 0.39,
    oppToClose: 0.40,
  },
  entertainment: {
    visitorToLead: 0.016,
    leadToMql: 0.41,
    mqlToSql: 0.39,
    sqlToOpp: 0.47,
    oppToClose: 0.43,
  },
  fintech: {
    visitorToLead: 0.017,
    leadToMql: 0.38,
    mqlToSql: 0.42,
    sqlToOpp: 0.48,
    oppToClose: 0.39,
  },
  hospitality: {
    visitorToLead: 0.016,
    leadToMql: 0.45,
    mqlToSql: 0.38,
    sqlToOpp: 0.38,
    oppToClose: 0.38,
  },
  industrial_iot: {
    visitorToLead: 0.021,
    leadToMql: 0.47,
    mqlToSql: 0.39,
    sqlToOpp: 0.42,
    oppToClose: 0.39,
  },
  insurance: {
    visitorToLead: 0.016,
    leadToMql: 0.40,
    mqlToSql: 0.28,
    sqlToOpp: 0.41,
    oppToClose: 0.37,
  },
  legaltech: {
    visitorToLead: 0.013,
    leadToMql: 0.41,
    mqlToSql: 0.40,
    sqlToOpp: 0.47,
    oppToClose: 0.42,
  },
  medtech: {
    visitorToLead: 0.018,
    leadToMql: 0.48,
    mqlToSql: 0.43,
    sqlToOpp: 0.41,
    oppToClose: 0.35,
  },
  project_management: {
    visitorToLead: 0.018,
    leadToMql: 0.46,
    mqlToSql: 0.37,
    sqlToOpp: 0.42,
    oppToClose: 0.35,
  },
  retail_ecommerce: {
    visitorToLead: 0.021,
    leadToMql: 0.41,
    mqlToSql: 0.36,
    sqlToOpp: 0.45,
    oppToClose: 0.39,
  },
  telecom: {
    visitorToLead: 0.009,
    leadToMql: 0.46,
    mqlToSql: 0.35,
    sqlToOpp: 0.41,
    oppToClose: 0.36,
  },
};

// UI-friendly channel list
export const FPS_CHANNELS_LIST = [
  { value: 'seo', label: 'SEO', description: 'Tráfego orgânico' },
  { value: 'ppc', label: 'PPC', description: 'Mídia paga (Google Ads, etc)' },
  { value: 'linkedin', label: 'LinkedIn', description: 'LinkedIn Ads e orgânico' },
  { value: 'email', label: 'Email', description: 'Email marketing' },
  { value: 'webinar', label: 'Webinar', description: 'Eventos online' },
];

// UI-friendly segment list
export const FPS_SEGMENTS_LIST = [
  { value: 'adtech', label: 'Adtech' },
  { value: 'automotive_saas', label: 'Automotive SaaS' },
  { value: 'crms', label: 'CRMs' },
  { value: 'chemical_pharmaceutical', label: 'Chemical/Pharmaceutical' },
  { value: 'cybersecurity', label: 'Cybersecurity' },
  { value: 'design', label: 'Design' },
  { value: 'edtech', label: 'Edtech' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'industrial_iot', label: 'Industrial & IoT' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'legaltech', label: 'Legaltech' },
  { value: 'medtech', label: 'Medtech' },
  { value: 'project_management', label: 'Project Management' },
  { value: 'retail_ecommerce', label: 'Retail/eCommerce' },
  { value: 'telecom', label: 'Telecom' },
];
