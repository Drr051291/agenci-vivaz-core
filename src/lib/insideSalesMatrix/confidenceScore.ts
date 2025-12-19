// Confidence Score calculation for Inside Sales Matrix
// Deterministic scoring (0-100) based on sample size and data completeness

import { InsideSalesInputs } from './calc';

export interface ConfidencePenalty {
  reason: string;
  penalty: number;
  category: 'amostra' | 'completude' | 'consistencia';
}

export interface ConfidenceScoreResult {
  score: number;
  level: 'baixa' | 'media' | 'alta';
  label: string;
  penalties: ConfidencePenalty[];
  topPenalties: ConfidencePenalty[];
  hasInconsistency: boolean;
}

export function calculateConfidenceScore(inputs: InsideSalesInputs): ConfidenceScoreResult {
  const penalties: ConfidencePenalty[] = [];
  let score = 100;

  const { leads = 0, mql = 0, sql = 0, reunioes = 0, contratos = 0, investimento, cliques, impressoes } = inputs;

  // A) Sample size penalties (most important)
  if (leads === 0) {
    penalties.push({ reason: 'Leads não informados', penalty: 35, category: 'amostra' });
    score -= 35;
  } else if (leads < 20) {
    penalties.push({ reason: `Amostra de leads pequena (${leads} < 20)`, penalty: 35, category: 'amostra' });
    score -= 35;
  } else if (leads < 50) {
    penalties.push({ reason: `Amostra de leads moderada (${leads} < 50)`, penalty: 20, category: 'amostra' });
    score -= 20;
  }

  if (mql === 0 && leads > 0) {
    penalties.push({ reason: 'MQLs não informados', penalty: 25, category: 'amostra' });
    score -= 25;
  } else if (mql < 10) {
    penalties.push({ reason: `Amostra de MQL pequena (${mql} < 10)`, penalty: 25, category: 'amostra' });
    score -= 25;
  } else if (mql < 20) {
    penalties.push({ reason: `Amostra de MQL moderada (${mql} < 20)`, penalty: 15, category: 'amostra' });
    score -= 15;
  }

  if (sql === 0 && mql > 0) {
    penalties.push({ reason: 'SQLs não informados', penalty: 25, category: 'amostra' });
    score -= 25;
  } else if (sql < 5) {
    penalties.push({ reason: `Amostra de SQL pequena (${sql} < 5)`, penalty: 25, category: 'amostra' });
    score -= 25;
  } else if (sql < 10) {
    penalties.push({ reason: `Amostra de SQL moderada (${sql} < 10)`, penalty: 15, category: 'amostra' });
    score -= 15;
  }

  if (reunioes === 0 && sql > 0) {
    penalties.push({ reason: 'Reuniões não informadas', penalty: 35, category: 'amostra' });
    score -= 35;
  } else if (reunioes < 5) {
    penalties.push({ reason: `Amostra de reuniões pequena (${reunioes} < 5)`, penalty: 35, category: 'amostra' });
    score -= 35;
  } else if (reunioes < 10) {
    penalties.push({ reason: `Amostra de reuniões moderada (${reunioes} < 10)`, penalty: 20, category: 'amostra' });
    score -= 20;
  }

  // B) Completeness penalties
  if (!investimento) {
    penalties.push({ reason: 'Investimento não informado', penalty: 10, category: 'completude' });
    score -= 10;
  }

  // If channel is media-related and clicks/impressions missing
  if (investimento && (!cliques || !impressoes)) {
    penalties.push({ reason: 'Dados de mídia incompletos (cliques/impressões)', penalty: 10, category: 'completude' });
    score -= 10;
  }

  // C) Consistency penalties
  let hasInconsistency = false;
  if (mql > leads && leads > 0) {
    hasInconsistency = true;
    penalties.push({ reason: 'Dados inconsistentes: MQL > Leads', penalty: 30, category: 'consistencia' });
    score -= 30;
  }
  if (sql > mql && mql > 0) {
    hasInconsistency = true;
    penalties.push({ reason: 'Dados inconsistentes: SQL > MQL', penalty: 30, category: 'consistencia' });
    score -= 30;
  }
  if (reunioes > sql && sql > 0) {
    hasInconsistency = true;
    penalties.push({ reason: 'Dados inconsistentes: Reuniões > SQL', penalty: 30, category: 'consistencia' });
    score -= 30;
  }
  if (contratos > reunioes && reunioes > 0) {
    hasInconsistency = true;
    penalties.push({ reason: 'Dados inconsistentes: Contratos > Reuniões', penalty: 30, category: 'consistencia' });
    score -= 30;
  }

  // Clamp 0-100
  score = Math.max(0, Math.min(100, score));

  // Map to level
  let level: 'baixa' | 'media' | 'alta';
  let label: string;
  if (score < 50) {
    level = 'baixa';
    label = 'Baixa confiança';
  } else if (score < 80) {
    level = 'media';
    label = 'Confiança média';
  } else {
    level = 'alta';
    label = 'Alta confiança';
  }

  // Top 2 penalties for tooltip
  const topPenalties = [...penalties]
    .sort((a, b) => b.penalty - a.penalty)
    .slice(0, 2);

  return {
    score,
    level,
    label,
    penalties,
    topPenalties,
    hasInconsistency,
  };
}
