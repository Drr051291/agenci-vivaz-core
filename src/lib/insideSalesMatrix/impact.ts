// Impact estimation calculations
import { InsideSalesInputs, InsideSalesOutputs, safeDiv } from './calc';
import { Targets, STAGES, evaluateMetricStatus } from './status';

export interface StageImpact {
  stageId: string;
  stageName: string;
  current: { rate: number | undefined; numerator: number | undefined; denominator: number | undefined };
  target: { rate: number };
  gapPp: number | undefined;
  status: 'ok' | 'atencao' | 'critico' | 'sem_dados' | 'baixa_amostra';
  impact: {
    extraOutput: number;
    extraContratos: number;
    description: string;
  } | null;
}

const MINIMUM_SAMPLE_SIZE = 10;

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
    
    // Determine status
    let status: StageImpact['status'] = 'sem_dados';
    
    if (stage.denominator === 0) {
      status = 'sem_dados';
    } else if (stage.denominator < MINIMUM_SAMPLE_SIZE) {
      status = 'baixa_amostra';
    } else if (currentRate !== undefined) {
      const metricStatus = evaluateMetricStatus(currentRatePercent, targets[stage.key]);
      if (metricStatus === 'positivo') status = 'ok';
      else if (metricStatus === 'atencao') status = 'atencao';
      else if (metricStatus === 'negativo') status = 'critico';
    }
    
    // Calculate gap
    const gapPp = currentRatePercent !== undefined 
      ? currentRatePercent - targetRatePercent 
      : undefined;
    
    // Calculate impact if hitting target
    let impact: StageImpact['impact'] = null;
    
    if (currentRate !== undefined && currentRate < targetRate && stage.denominator > 0) {
      // Extra output at this stage if we hit target
      const potentialOutput = stage.denominator * targetRate;
      const extraOutput = Math.round(potentialOutput - stage.numerator);
      
      if (extraOutput > 0) {
        // Propagate downstream using current rates
        let extraContratos = extraOutput;
        
        for (let i = index + 1; i < stageData.length; i++) {
          const downstreamRate = rates[stageData[i].key];
          if (downstreamRate !== undefined) {
            extraContratos = extraContratos * downstreamRate;
          } else {
            // Use target rate as fallback
            extraContratos = extraContratos * targetRates[stageData[i].key];
          }
        }
        
        extraContratos = Math.round(extraContratos);
        
        const stageNames = ['MQL', 'SQL', 'Reuniões', 'Contratos'];
        const outputName = stageNames[index];
        
        impact = {
          extraOutput,
          extraContratos,
          description: `+${extraOutput} ${outputName}${extraContratos > 0 && index < 3 ? ` → +${extraContratos} contratos` : ''}`,
        };
      }
    }
    
    return {
      stageId: stage.id,
      stageName: stage.name,
      current: {
        rate: currentRatePercent,
        numerator: stage.numerator,
        denominator: stage.denominator,
      },
      target: { rate: targetRatePercent },
      gapPp,
      status,
      impact,
    };
  });
}

export function findBottlenecks(impacts: StageImpact[]): {
  gargalo1: StageImpact | null;
  gargalo2: StageImpact | null;
  melhorEtapa: StageImpact | null;
} {
  const criticalStages = impacts.filter(i => i.status === 'critico' && i.impact);
  const okStages = impacts.filter(i => i.status === 'ok');
  
  // Sort by impact (extra contracts potential)
  criticalStages.sort((a, b) => (b.impact?.extraContratos || 0) - (a.impact?.extraContratos || 0));
  
  return {
    gargalo1: criticalStages[0] || null,
    gargalo2: criticalStages[1] || null,
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
