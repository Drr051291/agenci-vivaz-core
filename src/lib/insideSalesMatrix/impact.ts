// Impact estimation calculations
import { InsideSalesInputs, InsideSalesOutputs, safeDiv } from './calc';
import { Targets, STAGES, evaluateMetricStatus } from './status';
import { checkStageEligibility, STAGE_THRESHOLDS, StageId } from './eligibility';

export interface StageImpact {
  stageId: string;
  stageName: string;
  current: { rate: number | undefined; numerator: number | undefined; denominator: number | undefined };
  target: { rate: number };
  gapPp: number | undefined;
  status: 'ok' | 'atencao' | 'critico' | 'sem_dados' | 'baixa_amostra';
  isEligible: boolean;
  eligibilityReason?: string;
  impact: {
    extraOutput: number;
    extraContratos: number;
    description: string;
  } | null;
}

export function calculateStageImpacts(
  inputs: InsideSalesInputs,
  outputs: InsideSalesOutputs,
  targets: Targets
): StageImpact[] {
  const { leads = 0, mql = 0, sql = 0, reunioes = 0, contratos = 0 } = inputs;
  
  // Current rates as decimals
  const rates = {
    leadToMql: safeDiv(mql, leads),
    mqlToSql: safeDiv(sql, mql),
    sqlToMeeting: safeDiv(reunioes, sql),
    meetingToWin: safeDiv(contratos, reunioes),
  };
  
  // Target rates as decimals
  const targetRates = {
    leadToMql: (targets.leadToMql?.value || 25) / 100,
    mqlToSql: (targets.mqlToSql?.value || 25) / 100,
    sqlToMeeting: (targets.sqlToMeeting?.value || 35) / 100,
    meetingToWin: (targets.meetingToWin?.value || 15) / 100,
  };

  const stageData: { 
    id: string; 
    name: string; 
    key: keyof typeof rates;
    denominator: number;
    numerator: number;
  }[] = [
    { id: 'lead_to_mql', name: 'Lead → MQL', key: 'leadToMql', denominator: leads, numerator: mql },
    { id: 'mql_to_sql', name: 'MQL → SQL', key: 'mqlToSql', denominator: mql, numerator: sql },
    { id: 'sql_to_meeting', name: 'SQL → Reunião', key: 'sqlToMeeting', denominator: sql, numerator: reunioes },
    { id: 'meeting_to_win', name: 'Reunião → Contrato', key: 'meetingToWin', denominator: reunioes, numerator: contratos },
  ];

  return stageData.map((stage, index) => {
    const currentRate = rates[stage.key];
    const targetRate = targetRates[stage.key];
    const targetRatePercent = targetRate * 100;
    const currentRatePercent = currentRate !== undefined ? currentRate * 100 : undefined;
    
    // Check eligibility
    const eligibility = checkStageEligibility(stage.id, inputs);
    const isEligible = eligibility.isEligible;
    
    // Determine status - respect eligibility
    let status: StageImpact['status'] = 'sem_dados';
    
    if (!isEligible) {
      status = eligibility.reason === 'sem_dados' ? 'sem_dados' : 'baixa_amostra';
    } else if (currentRate !== undefined) {
      const metricStatus = evaluateMetricStatus(currentRatePercent, targets[stage.key]);
      if (metricStatus === 'positivo') status = 'ok';
      else if (metricStatus === 'atencao') status = 'atencao';
      else if (metricStatus === 'negativo') status = 'critico';
    }
    
    // Calculate gap only if eligible
    const gapPp = isEligible && currentRatePercent !== undefined 
      ? currentRatePercent - targetRatePercent 
      : undefined;
    
    // Generate eligibility reason text
    let eligibilityReason: string | undefined;
    if (!isEligible) {
      const threshold = STAGE_THRESHOLDS[stage.id as StageId];
      if (threshold && eligibility.reason === 'baixa_amostra') {
        eligibilityReason = `Requer ≥${threshold.minValue} ${threshold.denominator} (atual: ${eligibility.currentValue})`;
      } else if (eligibility.reason === 'sem_dados') {
        eligibilityReason = 'Dados não informados';
      }
    }
    
    // Calculate impact only if eligible and below target
    let impact: StageImpact['impact'] = null;
    
    if (isEligible && currentRate !== undefined && currentRate < targetRate && stage.denominator > 0) {
      const potentialOutput = stage.denominator * targetRate;
      const extraOutput = Math.round(potentialOutput - stage.numerator);
      
      if (extraOutput > 0) {
        // Check if downstream stages are also eligible before propagating
        let extraContratos = extraOutput;
        let allDownstreamEligible = true;
        
        for (let i = index + 1; i < stageData.length; i++) {
          const downstreamEligibility = checkStageEligibility(stageData[i].id, inputs);
          if (!downstreamEligibility.isEligible) {
            allDownstreamEligible = false;
            break;
          }
          
          const downstreamRate = rates[stageData[i].key];
          if (downstreamRate !== undefined) {
            extraContratos = extraContratos * downstreamRate;
          } else {
            extraContratos = extraContratos * targetRates[stageData[i].key];
          }
        }
        
        extraContratos = Math.round(extraContratos);
        
        const stageNames = ['MQL', 'SQL', 'Reuniões', 'Contratos'];
        const outputName = stageNames[index];
        
        if (allDownstreamEligible) {
          impact = {
            extraOutput,
            extraContratos,
            description: `+${extraOutput} ${outputName}${extraContratos > 0 && index < 3 ? ` → +${extraContratos} contratos` : ''}`,
          };
        } else {
          impact = {
            extraOutput,
            extraContratos: 0,
            description: `+${extraOutput} ${outputName} (impacto final indisponível)`,
          };
        }
      }
    }
    
    return {
      stageId: stage.id,
      stageName: stage.name,
      current: {
        rate: isEligible ? currentRatePercent : undefined,
        numerator: stage.numerator,
        denominator: stage.denominator,
      },
      target: { rate: targetRatePercent },
      gapPp,
      status,
      isEligible,
      eligibilityReason,
      impact,
    };
  });
}

// Stage weights for bottleneck ranking (earlier stages have slightly more weight)
const STAGE_WEIGHTS: Record<string, number> = {
  'lead_to_mql': 1.2,
  'mql_to_sql': 1.1,
  'sql_to_meeting': 1.0,
  'meeting_to_win': 1.0,
};

export function findBottlenecks(impacts: StageImpact[]): {
  gargalo1: StageImpact | null;
  gargalo2: StageImpact | null;
  melhorEtapa: StageImpact | null;
} {
  // Only consider eligible stages with critical status
  const eligibleCritical = impacts.filter(i => 
    i.isEligible && i.status === 'critico' && i.gapPp !== undefined
  );
  
  // Rank by (gap magnitude * stage weight * impact estimate)
  const ranked = eligibleCritical
    .map(i => ({
      impact: i,
      score: Math.abs(i.gapPp!) * (STAGE_WEIGHTS[i.stageId] || 1) * (i.impact?.extraContratos || 1),
    }))
    .sort((a, b) => b.score - a.score);
  
  const okStages = impacts.filter(i => i.isEligible && i.status === 'ok');
  
  return {
    gargalo1: ranked[0]?.impact || null,
    gargalo2: ranked[1]?.impact || null,
    melhorEtapa: okStages[0] || null,
  };
}

export function calculateConfidenceLevel(inputs: InsideSalesInputs): {
  level: 'alta' | 'media' | 'baixa';
  label: string;
  description: string;
} {
  const { leads = 0, mql = 0, sql = 0, reunioes = 0 } = inputs;
  const minSample = Math.min(leads, mql || leads, sql || mql || leads, reunioes || sql || mql || leads);
  
  if (minSample >= 50) {
    return { level: 'alta', label: 'Alta confiança', description: 'Amostra robusta para análise' };
  }
  if (minSample >= 20) {
    return { level: 'media', label: 'Confiança média', description: 'Amostra adequada, mas interprete com cuidado' };
  }
  return { level: 'baixa', label: 'Baixa confiança', description: 'Amostra pequena — conclusões preliminares' };
}
