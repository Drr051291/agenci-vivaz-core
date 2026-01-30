export interface StageInfo {
  id: number;
  name: string;
  order_nr: number;
}

export interface LostReasonsData {
  total: Record<string, number>;
  by_stage: Record<number, Record<string, number>>;
}

export interface CampaignTrackingData {
  by_campaign: Record<string, { total: number; by_stage: Record<number, number> }>;
  by_adset: Record<string, { total: number; by_stage: Record<number, number> }>;
  by_creative: Record<string, { total: number; by_stage: Record<number, number> }>;
  field_key: string | null;
  all_stages?: StageInfo[];
  fetched_at?: string;
}

export interface FunnelData {
  stages: StageInfo[];
  all_stages?: StageInfo[];
  conversions: Record<string, number>;
  leads_count: number;
  stage_counts?: Record<number, number>;
  stage_arrivals?: Record<number, number>; // NEW: arrivals per stage during period
  stage_data: Record<number, { count: number; name: string }>;
  lost_reasons?: LostReasonsData; // Updated: includes total and by_stage
  fetched_at: string;
  raw_conversion_stats?: unknown;
  raw_movement_stats?: unknown;
}

export interface FunnelResponse {
  success: boolean;
  data?: FunnelData;
  error?: string;
}

export interface CampaignTrackingResponse {
  success: boolean;
  data?: CampaignTrackingData;
  error?: string;
}

export type PeriodPreset = 'today' | 'thisWeek' | 'last7Days' | 'last14Days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

export type ViewMode = 'period' | 'snapshot';

export type TrackingLevel = 'campaign' | 'adset' | 'creative';

export interface DateRange {
  start: Date;
  end: Date;
}

export const PIPELINE_ID = 9;
export const PIPEDRIVE_DOMAIN = 'setima';

// These are the "display" labels for the 5 key stages
export const STAGE_ORDER = ['Lead', 'MQL', 'SQL', 'Oportunidade', 'Contrato'] as const;

// Transitions based on stage order (will be recalculated based on actual API data)
export const STAGE_TRANSITIONS = [
  { from: 'Lead', to: 'MQL', key: 'lead_to_mql' },
  { from: 'MQL', to: 'SQL', key: 'mql_to_sql' },
  { from: 'SQL', to: 'Oportunidade', key: 'sql_to_oportunidade' },
  { from: 'Oportunidade', to: 'Contrato', key: 'oportunidade_to_contrato' },
] as const;
