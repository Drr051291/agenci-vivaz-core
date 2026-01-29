export interface StageInfo {
  id: number;
  name: string;
  order_nr: number;
}

export interface FunnelData {
  stages: StageInfo[];
  conversions: Record<string, number>;
  leads_count: number;
  stage_data: Record<string, { entries: number }>;
  fetched_at: string;
  raw_conversion_stats?: unknown;
  raw_movement_stats?: unknown;
}

export interface FunnelResponse {
  success: boolean;
  data?: FunnelData;
  error?: string;
}

export type PeriodPreset = '7d' | '30d' | '90d' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

export const PIPELINE_ID = 9;
export const PIPEDRIVE_DOMAIN = 'setima';

export const STAGE_ORDER = ['Lead', 'MQL', 'SQL', 'Oportunidade', 'Contrato'] as const;

export const STAGE_TRANSITIONS = [
  { from: 'Lead', to: 'MQL', key: 'lead_to_mql' },
  { from: 'MQL', to: 'SQL', key: 'mql_to_sql' },
  { from: 'SQL', to: 'Oportunidade', key: 'sql_to_oportunidade' },
  { from: 'Oportunidade', to: 'Contrato', key: 'oportunidade_to_contrato' },
] as const;
