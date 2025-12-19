// Inside Sales Matrix - Rule matching engine

export interface MatrixRule {
  id?: string;
  stage: string;
  situation: string;
  metricLabel: string;
  metricKey: string;
  action: string;
  sortOrder: number;
}

// Fallback rules in case DB is not accessible
export const DEFAULT_RULES: MatrixRule[] = [
  // Stage 1: Lead → MQL
  { stage: 'lead_to_mql', situation: 'Anúncios não atraem atenção', metricLabel: 'CTR baixo', metricKey: 'ctr', action: 'Testar novos criativos, headlines e CTAs. Revisar segmentação.', sortOrder: 1 },
  { stage: 'lead_to_mql', situation: 'Custo por clique alto demais', metricLabel: 'CPC/CPM alto', metricKey: 'cpc', action: 'Otimizar lances, testar públicos diferentes, melhorar quality score.', sortOrder: 2 },
  { stage: 'lead_to_mql', situation: 'Landing page não converte', metricLabel: 'CVR clique → lead baixo', metricKey: 'cvrClickLead', action: 'Melhorar LP: headline, formulário mais curto, prova social, velocidade.', sortOrder: 3 },
  { stage: 'lead_to_mql', situation: 'Leads muito caros', metricLabel: 'CPL alto', metricKey: 'cpl', action: 'Revisar oferta, testar lead magnet, melhorar conversão da LP.', sortOrder: 4 },
  { stage: 'lead_to_mql', situation: 'Leads de baixa qualidade', metricLabel: '% leads inválidos alto', metricKey: 'invalidLeadRate', action: 'Adicionar campos qualificadores, usar captcha, revisar fonte de tráfego.', sortOrder: 5 },
  { stage: 'lead_to_mql', situation: 'Falta de dados para qualificar', metricLabel: '% leads com fit preenchido baixo', metricKey: 'fitFillRate', action: 'Adicionar campos de qualificação no formulário ou enriquecer dados.', sortOrder: 6 },
  
  // Stage 2: MQL → SQL
  { stage: 'mql_to_sql', situation: 'Demora no primeiro contato', metricLabel: 'TTFT alto', metricKey: 'ttft', action: 'Automatizar distribuição de leads, alertas em tempo real, SLA < 5min.', sortOrder: 10 },
  { stage: 'mql_to_sql', situation: 'Baixo volume de contato em 24h', metricLabel: 'Contact rate baixo', metricKey: 'contactRate24h', action: 'Revisar cadência, distribuição, priorização de leads.', sortOrder: 11 },
  { stage: 'mql_to_sql', situation: 'Leads não atendem/respondem', metricLabel: 'Connect rate baixo', metricKey: 'connectRate', action: 'Testar horários, canais (WhatsApp, email), personalização.', sortOrder: 12 },
  { stage: 'mql_to_sql', situation: 'Vendas rejeitando muitos MQLs', metricLabel: 'SAL rate baixo', metricKey: 'salRate', action: 'Alinhar critérios de qualificação entre marketing e vendas.', sortOrder: 13 },
  { stage: 'mql_to_sql', situation: 'MQLs parados por muito tempo', metricLabel: 'Aging MQL alto', metricKey: 'mqlAgingDays', action: 'Criar SLAs, alertas de aging, revisão semanal de pipeline.', sortOrder: 14 },
  
  // Stage 3: SQL → Reunião
  { stage: 'sql_to_meeting', situation: 'SQLs não viram reuniões', metricLabel: 'Taxa SQL → reunião baixa', metricKey: 'sqlToMeeting', action: 'Revisar abordagem, cadência de follow-up, proposta de valor.', sortOrder: 20 },
  { stage: 'sql_to_meeting', situation: 'Baixa taxa de resposta', metricLabel: 'Taxa de resposta baixa', metricKey: 'responseRate', action: 'Personalizar mensagens, testar diferentes canais e horários.', sortOrder: 21 },
  { stage: 'sql_to_meeting', situation: 'Poucas tentativas de contato', metricLabel: 'Nº tentativas/SQL baixo', metricKey: 'attemptsPerSql', action: 'Aumentar cadência, usar múltiplos canais, persistência.', sortOrder: 22 },
  { stage: 'sql_to_meeting', situation: 'Reuniões sem decisor', metricLabel: '% reuniões com decisor baixo', metricKey: 'meetingWithDecisionMakerRate', action: 'Qualificar melhor antes de agendar, perguntar sobre stakeholders.', sortOrder: 23 },
  { stage: 'sql_to_meeting', situation: 'Demora para agendar', metricLabel: 'Tempo até agendar alto', metricKey: 'timeToScheduleDays', action: 'Oferecer slots imediatos, usar ferramentas de agendamento.', sortOrder: 24 },
  
  // Stage 4: Reunião → Contrato
  { stage: 'meeting_to_win', situation: 'Baixa taxa de fechamento', metricLabel: 'Win rate baixo', metricKey: 'meetingToWin', action: 'Revisar pitch, treinar equipe, analisar objeções comuns.', sortOrder: 30 },
  { stage: 'meeting_to_win', situation: 'Ciclo de vendas muito longo', metricLabel: 'Ciclo de vendas alto', metricKey: 'salesCycleDays', action: 'Criar urgência, simplificar proposta, remover fricções.', sortOrder: 31 },
  { stage: 'meeting_to_win', situation: 'Muitas perdas por preço', metricLabel: 'Motivos de perda: preço', metricKey: 'lossReasons', action: 'Revisar pricing, ancoragem de valor, negociação.', sortOrder: 32 },
  { stage: 'meeting_to_win', situation: 'Descontos muito altos', metricLabel: 'Taxa de desconto alta', metricKey: 'discountRate', action: 'Treinar negociação, definir limites, justificar valor.', sortOrder: 33 },
];

export interface DiagnosticItem {
  situation: string;
  metricLabel: string;
  action: string;
}

export function getMatchingRules(
  stageId: string,
  failingMetricKeys: string[],
  rules: MatrixRule[]
): DiagnosticItem[] {
  const stageRules = rules.filter(r => r.stage === stageId);
  
  if (failingMetricKeys.length === 0) {
    // If no specific failing metrics but stage is critical, return common issues
    return stageRules.slice(0, 2).map(r => ({
      situation: r.situation,
      metricLabel: r.metricLabel,
      action: r.action,
    }));
  }
  
  const matchingRules = stageRules.filter(r => failingMetricKeys.includes(r.metricKey));
  
  return matchingRules.map(r => ({
    situation: r.situation,
    metricLabel: r.metricLabel,
    action: r.action,
  }));
}

export function transformDbRules(dbRules: any[]): MatrixRule[] {
  return dbRules.map(r => ({
    id: r.id,
    stage: r.stage,
    situation: r.situation,
    metricLabel: r.metric_label,
    metricKey: r.metric_key,
    action: r.action,
    sortOrder: r.sort_order,
  }));
}
