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
  field_keys: {
    campaign: string | null;
    adset: string | null;
    creative: string | null;
  };
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

// Lead Source Tracking Types
export type LeadSource = 'Landing Page' | 'Base Sétima' | 'Lead Nativo';

export interface LeadSourceData {
  by_source: Record<LeadSource, { total: number; by_stage: Record<number, number> }>;
  all_stages?: StageInfo[];
  fetched_at?: string;
}

export interface LeadSourceResponse {
  success: boolean;
  data?: LeadSourceData;
  error?: string;
}

export type PeriodPreset = 'today' | 'yesterday' | 'thisWeek' | 'last7Days' | 'last14Days' | 'last30Days' | 'last90Days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'custom';

export type ViewMode = 'period' | 'snapshot';

export type TrackingLevel = 'campaign' | 'adset' | 'creative';

// Comparison types
export type ComparisonPreset = 'auto' | 'previousMonth' | 'previousQuarter' | 'sameLastYear' | 'custom' | 'off';

export interface ComparisonConfig {
  enabled: boolean;
  preset: ComparisonPreset;
  customRange?: DateRange;
}

export interface ComparisonData {
  current: number;
  previous: number;
  variation: number | null;
  trend: 'up' | 'down' | 'stable';
  periodLabel: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

// Pipeline configurations
export interface PipelineConfig {
  id: number;
  name: string;
  subtitle: string;
}

export const PIPELINES: Record<string, PipelineConfig> = {
  brandspot: {
    id: 9,
    name: 'Brandspot',
    subtitle: 'serviços_b2b',
  },
  threeDimension: {
    id: 13,
    name: '3D',
    subtitle: 'pipeline_3d',
  },
};

// Legacy constants for backward compatibility
export const PIPELINE_ID = PIPELINES.brandspot.id;
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
