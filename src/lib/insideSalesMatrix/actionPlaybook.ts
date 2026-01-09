/**
 * PLAYBOOK DE AÇÕES DETERMINÍSTICAS - BR 2025
 * Gera ações baseadas em triggers específicos do estudo
 */

import type { BR2025Context, TipoCaptura, CanalMidia } from './benchmarksBR2025';
import { CAPTURA_BR2025, INSIDE_SALES_BR2025, WHATSAPP_BR2025 } from './benchmarksBR2025';
import type { InsideSalesInputs, InsideSalesOutputs } from './calc';
import type { StageImpact } from './impact';

export interface PlaybookAction {
  id: string;
  type: 'midia' | 'processo';
  stage: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  title: string;
  nextStep: string;
  metricToWatch: string;
  source: 'br2025' | 'matrix_rule';
}

interface PlaybookContext {
  inputs: InsideSalesInputs;
  outputs: InsideSalesOutputs;
  impacts: StageImpact[];
  br2025Context: BR2025Context;
}

/**
 * Gera ações determinísticas baseadas no estudo BR 2025
 */
export function generatePlaybookActions(ctx: PlaybookContext): PlaybookAction[] {
  const actions: PlaybookAction[] = [];
  const { inputs, outputs, impacts, br2025Context } = ctx;
  const { segmento, canal, captura, whatsappCrm } = br2025Context;
  
  // ========== AÇÕES DE MÍDIA (TOPO) ==========
  
  // 1. LinkedIn Ads com CPL baixo mas Lead→MQL baixo = problema de qualidade
  if (canal === 'linkedin_ads' && outputs.cpl && outputs.cpl < 150) {
    const leadToMql = impacts.find(i => i.stageId === 'lead_to_mql');
    if (leadToMql && leadToMql.status === 'critico') {
      actions.push({
        id: 'midia_linkedin_quality',
        type: 'midia',
        stage: 'Lead→MQL',
        priority: 'Alta',
        title: 'Migrar para LP ou aumentar qualificação',
        nextStep: 'Adicionar perguntas de qualificação no formulário ou usar LP com filtros',
        metricToWatch: 'Lead→MQL (%)',
        source: 'br2025',
      });
    }
  }
  
  // 2. Consultoria/Serviços Complexos usando Lead Nativo
  if (segmento === 'consultoria' && captura === 'lead_nativo') {
    actions.push({
      id: 'midia_consultoria_lp',
      type: 'midia',
      stage: 'Topo',
      priority: 'Alta',
      title: 'Priorizar Landing Page com prova social',
      nextStep: 'Criar LP com cases, depoimentos e filtro de qualificação',
      metricToWatch: 'Lead→MQL (%)',
      source: 'br2025',
    });
  }
  
  // 3. Investimento presente mas leads baixos
  if (inputs.investimento && inputs.investimento > 0 && inputs.leads) {
    const expectedLeads = inputs.investimento / 150; // CPL médio de referência
    if (inputs.leads < expectedLeads * 0.5) {
      actions.push({
        id: 'midia_low_leads',
        type: 'midia',
        stage: 'Topo',
        priority: 'Alta',
        title: 'Revisar segmentação e criativos',
        nextStep: 'Auditar campanhas: segmentação, copy e imagens de anúncios',
        metricToWatch: 'CPL',
        source: 'br2025',
      });
    }
  }
  
  // 4. Meta Ads sem nutrição
  if (canal === 'meta_ads') {
    const leadToMql = impacts.find(i => i.stageId === 'lead_to_mql');
    if (leadToMql && leadToMql.status !== 'ok') {
      actions.push({
        id: 'midia_meta_nurturing',
        type: 'midia',
        stage: 'Lead→MQL',
        priority: 'Média',
        title: 'Implementar fluxo de nutrição',
        nextStep: 'Criar sequência de emails/WhatsApp para leads de Meta Ads',
        metricToWatch: 'Lead→MQL (%)',
        source: 'br2025',
      });
    }
  }
  
  // ========== AÇÕES DE PROCESSO (INSIDE SALES) ==========
  
  // 5. TTFT alto (speed-to-lead)
  if (inputs.ttft !== undefined && inputs.ttft > INSIDE_SALES_BR2025.speedToLead.ideal) {
    actions.push({
      id: 'processo_ttft',
      type: 'processo',
      stage: 'Lead→MQL',
      priority: 'Alta',
      title: 'Ajustar SLA de atendimento para <5 min',
      nextStep: 'Implementar distribuição automática e alerta de lead novo',
      metricToWatch: 'TTFT (min)',
      source: 'br2025',
    });
  }
  
  // 6. WhatsApp não integrado
  if (whatsappCrm === false) {
    actions.push({
      id: 'processo_whatsapp',
      type: 'processo',
      stage: 'Lead→MQL',
      priority: 'Alta',
      title: 'Integrar WhatsApp ao CRM',
      nextStep: 'Configurar integração WhatsApp + padronizar templates de follow-up',
      metricToWatch: 'Taxa de conexão',
      source: 'br2025',
    });
  }
  
  // 7. MQL→SQL crítico
  const mqlToSql = impacts.find(i => i.stageId === 'mql_to_sql');
  if (mqlToSql && mqlToSql.isEligible && mqlToSql.status === 'critico') {
    actions.push({
      id: 'processo_qualification',
      type: 'processo',
      stage: 'MQL→SQL',
      priority: 'Alta',
      title: 'Revisar critérios de qualificação MQL→SQL',
      nextStep: 'Alinhar Mkt e Vendas sobre definição de MQL e SQL',
      metricToWatch: 'MQL→SQL (%)',
      source: 'br2025',
    });
  }
  
  // 8. SQL→Contrato crítico
  const sqlToWin = impacts.find(i => i.stageId === 'sql_to_win');
  if (sqlToWin && sqlToWin.isEligible && sqlToWin.status === 'critico') {
    actions.push({
      id: 'processo_closing',
      type: 'processo',
      stage: 'SQL→Contrato',
      priority: 'Alta',
      title: 'Otimizar processo de fechamento',
      nextStep: 'Analisar objeções, proposta e ciclo. Reduzir etapas de aprovação.',
      metricToWatch: 'SQL→Contrato (%)',
      source: 'br2025',
    });
  }
  
  // 9. Connect rate / Contact rate baixo
  if (inputs.connectRate !== undefined && inputs.connectRate < 30) {
    actions.push({
      id: 'processo_connect',
      type: 'processo',
      stage: 'Lead→MQL',
      priority: 'Média',
      title: 'Aumentar taxa de conexão',
      nextStep: 'Testar diferentes horários, canais (ligação + WhatsApp) e cadências',
      metricToWatch: 'Connect rate (%)',
      source: 'br2025',
    });
  }
  
  // Ordenar por prioridade e limitar
  const priorityOrder = { 'Alta': 0, 'Média': 1, 'Baixa': 2 };
  return actions
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 6); // Máximo 6 ações
}

/**
 * Gera perguntas de qualificação para dados faltantes
 */
export function generateMissingDataQuestions(inputs: InsideSalesInputs, br2025Context: BR2025Context): string[] {
  const questions: string[] = [];
  
  if (inputs.ttft === undefined) {
    questions.push('Qual o tempo médio até primeiro contato (TTFT)?');
  }
  
  if (br2025Context.whatsappCrm === undefined) {
    questions.push('O WhatsApp está integrado ao CRM?');
  }
  
  if (inputs.connectRate === undefined) {
    questions.push('Qual a taxa de conexão (connect rate)?');
  }
  
  if (!inputs.investimento) {
    questions.push('Qual o investimento em mídia paga no período?');
  }
  
  return questions.slice(0, 3);
}

/**
 * Gera checklist do dia (top 3 ações prioritárias)
 */
export function generateDailyChecklist(
  actions: PlaybookAction[],
  confidenceScore: number
): PlaybookAction[] {
  if (confidenceScore < 50) return [];
  
  return actions
    .filter(a => a.priority === 'Alta')
    .slice(0, 3);
}
