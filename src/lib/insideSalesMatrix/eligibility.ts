// Eligibility and sample size gating for Inside Sales Matrix

import { InsideSalesInputs, InsideSalesOutputs } from './calc';

// Minimum sample sizes for stage eligibility
export const STAGE_THRESHOLDS = {
  lead_to_mql: { denominator: 'leads', minValue: 30 },
  mql_to_sql: { denominator: 'mql', minValue: 20 },
  sql_to_meeting: { denominator: 'sql', minValue: 10 },
  meeting_to_win: { denominator: 'reunioes', minValue: 10 },
} as const;

// Media metrics gating
export const MEDIA_THRESHOLDS = {
  ctr: { required: { impressoes: 1000, cliques: 30 } },
  cpc: { required: { cliques: 30 } },
  cvrClickLead: { required: { cliques: 30, leads: 20 } },
  cpl: { required: { leads: 20 } },
} as const;

export type StageId = keyof typeof STAGE_THRESHOLDS;

export interface EligibilityResult {
  isEligible: boolean;
  reason?: 'sem_dados' | 'baixa_amostra';
  currentValue?: number;
  requiredValue?: number;
}

export function checkStageEligibility(
  stageId: string,
  inputs: InsideSalesInputs
): EligibilityResult {
  const threshold = STAGE_THRESHOLDS[stageId as StageId];
  if (!threshold) {
    return { isEligible: true };
  }

  const denomValue = inputs[threshold.denominator as keyof InsideSalesInputs] as number | undefined;

  if (denomValue === undefined || denomValue === 0) {
    return { isEligible: false, reason: 'sem_dados' };
  }

  if (denomValue < threshold.minValue) {
    return {
      isEligible: false,
      reason: 'baixa_amostra',
      currentValue: denomValue,
      requiredValue: threshold.minValue,
    };
  }

  return { isEligible: true };
}

export function checkMediaMetricEligibility(
  metricKey: string,
  inputs: InsideSalesInputs
): EligibilityResult {
  const threshold = MEDIA_THRESHOLDS[metricKey as keyof typeof MEDIA_THRESHOLDS];
  if (!threshold) {
    return { isEligible: true };
  }

  for (const [field, minValue] of Object.entries(threshold.required)) {
    const value = inputs[field as keyof InsideSalesInputs] as number | undefined;
    if (value === undefined || value === 0) {
      return { isEligible: false, reason: 'sem_dados' };
    }
    if (value < minValue) {
      return {
        isEligible: false,
        reason: 'baixa_amostra',
        currentValue: value,
        requiredValue: minValue,
      };
    }
  }

  return { isEligible: true };
}

export function getEligibleStages(inputs: InsideSalesInputs): string[] {
  return Object.keys(STAGE_THRESHOLDS).filter(
    stageId => checkStageEligibility(stageId, inputs).isEligible
  );
}

export function hasMinimumDataForAnalysis(inputs: InsideSalesInputs): boolean {
  // At least one stage must be eligible
  return getEligibleStages(inputs).length > 0;
}

export function hasMediaDataComplete(inputs: InsideSalesInputs): boolean {
  const { investimento, impressoes, cliques, leads } = inputs;
  return !!(investimento && impressoes && cliques && leads && 
    impressoes >= 1000 && cliques >= 30 && leads >= 20);
}
