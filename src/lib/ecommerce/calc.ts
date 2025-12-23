// E-commerce Funnel Diagnostic Calculations

export interface EcommerceInputs {
  // Tráfego
  ctrFacebook: number;
  cpcFacebook: number;
  investFacebook: number;
  ctrGoogle: number;
  cpcGoogle: number;
  investGoogle: number;
  
  // Funil
  visitantes: number;
  carrinhos: number;
  compras: number;
  vendasPagas: number;
  ticketMedio: number;
}

export interface EcommerceOutputs {
  // Investimento total
  investimentoTotal: number;
  
  // Taxas de conversão
  taxaVisitanteCarrinho: number | null;
  taxaCarrinhoCompra: number | null;
  taxaCompraPagamento: number | null;
  
  // Financeiro
  faturamento: number;
  roas: number | null;
  
  // CPC médio
  cpcMedio: number | null;
  
  // Cliques estimados
  cliquesFacebook: number | null;
  cliquesGoogle: number | null;
  cliquesTotal: number | null;
}

export type StageStatus = 'ok' | 'atencao' | 'critico' | 'sem_dados';

export interface StageResult {
  stage: string;
  label: string;
  atual: number | null;
  meta: number;
  status: StageStatus;
  gap: number | null;
}

export interface DiagnosticItem {
  id: number;
  falha: string;
  solucao: string;
}

export interface StageDiagnostic {
  stage: string;
  label: string;
  status: StageStatus;
  items: DiagnosticItem[];
}

// Benchmarks de referência (baseados na planilha)
export const BENCHMARKS = {
  cpc: 1.0, // R$ 1.00
  ctr: 1.0, // 1%
  visitanteCarrinho: 10, // 10%
  carrinhoCompra: 10, // 10%
  compraPagamento: 80, // 80% (ou seja, perda de 20%)
};

// Faixas de status (% do benchmark)
const STATUS_THRESHOLDS = {
  ok: 0.9, // >= 90% do benchmark
  atencao: 0.7, // >= 70% do benchmark
  // < 70% = crítico
};

export function calculateOutputs(inputs: EcommerceInputs): EcommerceOutputs {
  const investimentoTotal = inputs.investFacebook + inputs.investGoogle;
  
  // Taxas de conversão
  const taxaVisitanteCarrinho = inputs.visitantes > 0 
    ? (inputs.carrinhos / inputs.visitantes) * 100 
    : null;
  
  const taxaCarrinhoCompra = inputs.carrinhos > 0 
    ? (inputs.compras / inputs.carrinhos) * 100 
    : null;
  
  const taxaCompraPagamento = inputs.compras > 0 
    ? (inputs.vendasPagas / inputs.compras) * 100 
    : null;
  
  // Faturamento
  const faturamento = inputs.vendasPagas * inputs.ticketMedio;
  
  // ROAS
  const roas = investimentoTotal > 0 ? faturamento / investimentoTotal : null;
  
  // Cliques estimados (invest / CPC)
  const cliquesFacebook = inputs.cpcFacebook > 0 
    ? inputs.investFacebook / inputs.cpcFacebook 
    : null;
  const cliquesGoogle = inputs.cpcGoogle > 0 
    ? inputs.investGoogle / inputs.cpcGoogle 
    : null;
  const cliquesTotal = (cliquesFacebook ?? 0) + (cliquesGoogle ?? 0) || null;
  
  // CPC médio
  const cpcMedio = cliquesTotal && cliquesTotal > 0 
    ? investimentoTotal / cliquesTotal 
    : null;
  
  return {
    investimentoTotal,
    taxaVisitanteCarrinho,
    taxaCarrinhoCompra,
    taxaCompraPagamento,
    faturamento,
    roas,
    cpcMedio,
    cliquesFacebook,
    cliquesGoogle,
    cliquesTotal,
  };
}

export function getStatus(atual: number | null, meta: number, inverse = false): StageStatus {
  if (atual === null) return 'sem_dados';
  
  // Para métricas inversas (onde menor é melhor, como CPC)
  if (inverse) {
    if (atual <= meta) return 'ok';
    if (atual <= meta * 1.3) return 'atencao';
    return 'critico';
  }
  
  // Para métricas normais (onde maior é melhor)
  const ratio = atual / meta;
  if (ratio >= STATUS_THRESHOLDS.ok) return 'ok';
  if (ratio >= STATUS_THRESHOLDS.atencao) return 'atencao';
  return 'critico';
}

export function calculateStageResults(outputs: EcommerceOutputs): StageResult[] {
  return [
    {
      stage: 'visitante_carrinho',
      label: 'Visitantes → Carrinho',
      atual: outputs.taxaVisitanteCarrinho,
      meta: BENCHMARKS.visitanteCarrinho,
      status: getStatus(outputs.taxaVisitanteCarrinho, BENCHMARKS.visitanteCarrinho),
      gap: outputs.taxaVisitanteCarrinho !== null 
        ? outputs.taxaVisitanteCarrinho - BENCHMARKS.visitanteCarrinho 
        : null,
    },
    {
      stage: 'carrinho_compra',
      label: 'Carrinho → Compra',
      atual: outputs.taxaCarrinhoCompra,
      meta: BENCHMARKS.carrinhoCompra,
      status: getStatus(outputs.taxaCarrinhoCompra, BENCHMARKS.carrinhoCompra),
      gap: outputs.taxaCarrinhoCompra !== null 
        ? outputs.taxaCarrinhoCompra - BENCHMARKS.carrinhoCompra 
        : null,
    },
    {
      stage: 'compra_pagamento',
      label: 'Compra → Pagamento',
      atual: outputs.taxaCompraPagamento,
      meta: BENCHMARKS.compraPagamento,
      status: getStatus(outputs.taxaCompraPagamento, BENCHMARKS.compraPagamento),
      gap: outputs.taxaCompraPagamento !== null 
        ? outputs.taxaCompraPagamento - BENCHMARKS.compraPagamento 
        : null,
    },
  ];
}

// Diagnósticos por etapa (baseado na planilha)
const DIAGNOSTICS_DB: Record<string, { falhas: DiagnosticItem[] }> = {
  trafego: {
    falhas: [
      { id: 1, falha: 'Produto não corresponde ao canal (Facebook = Intenção, Google = Necessidade)', solucao: 'Definir produtos de Intenção para Facebook e Necessidade para Google' },
      { id: 2, falha: 'Objetivo de campanha incorreto', solucao: 'Conversão AddtoCart/ViewContent = Topo, Purchase = Meio/Fundo, Tráfego = Topo/Meio' },
      { id: 3, falha: 'Público errado', solucao: 'Trabalhar público condizente com a Persona/Oferta' },
      { id: 4, falha: 'Oferta não atrativa', solucao: 'Gerar mais valor (Frete Grátis, Desconto, Brinde, Kit)' },
      { id: 5, falha: 'Criativo ruim ou poucos criativos', solucao: 'Testar mínimo 4 criativos por conjunto, formatos diferentes' },
      { id: 6, falha: 'Copy ruim', solucao: 'Usar gatilhos de Autoridade, Benefício e Escassez' },
      { id: 7, falha: 'Frequência muito alta (>3 nos últimos 7 dias)', solucao: 'Reduzir frequência, trazer novos públicos para topo' },
      { id: 8, falha: 'Carregamento lento da página de destino', solucao: 'Analisar taxa de carregamento, otimizar página' },
    ],
  },
  visitante_carrinho: {
    falhas: [
      { id: 1, falha: 'UX/UI no Mobile', solucao: 'Usar checklist de UX/UI mobile' },
      { id: 2, falha: 'UX/UI no Site', solucao: 'Revisar experiência geral do site' },
      { id: 3, falha: 'Foto e/ou Vídeo do Produto inadequados', solucao: 'Foto e vídeo atrativos mostrando benefícios, diferenciais e usabilidade' },
      { id: 4, falha: 'Descrição incompleta', solucao: 'Descrição com benefícios, quebra de objeções, todas as informações do produto' },
      { id: 5, falha: 'Precificação fora do mercado', solucao: 'Fazer estudo de mercado/benchmark de preços' },
      { id: 6, falha: 'Falta de prova social', solucao: 'Ter avaliações em vídeo e texto explicando soluções' },
      { id: 7, falha: 'Grade quebrada (estoque)', solucao: 'Desativar produtos sem estoque, guardar para saldões' },
      { id: 8, falha: 'Produtos anunciados não visíveis', solucao: 'Garantir produtos anunciados nas primeiras seções' },
      { id: 9, falha: 'Falta de selos de segurança', solucao: 'Adicionar selos de segurança, bancos, bandeiras de cartão' },
      { id: 10, falha: 'Sazonalidade não considerada', solucao: 'Garantir escala de produtos por estação' },
      { id: 11, falha: 'Pop-up de carrinho atrapalhando', solucao: 'Remover pop-up para metrificação adequada' },
    ],
  },
  carrinho_compra: {
    falhas: [
      { id: 1, falha: 'Preço do frete elevado', solucao: 'Contratar Hub de Frete (MelhorEnvio, Enviando, Frenet) ou segmentar região' },
      { id: 2, falha: 'Problemas na plataforma/checkout', solucao: 'Otimizar campos do checkout, usar checkout one page transparente' },
      { id: 3, falha: 'Tempo de entrega elevado', solucao: 'Contratar Hub de Frete ou segmentar por região próxima' },
      { id: 4, falha: 'Recusa elevada de pagamento', solucao: 'Trocar gateway (PayPal, MercadoPago, PagSeguro, Pagar.me)' },
      { id: 5, falha: 'Condições de pagamento ruins', solucao: 'Facilitar parcelamento (mínimo 3x sem juros para ticket baixo)' },
      { id: 6, falha: 'Campo cupom de desconto com problema', solucao: 'Verificar se cupons estão funcionando' },
      { id: 7, falha: 'Falta de confiabilidade no checkout', solucao: 'Reforçar compra segura com slogans e certificados' },
      { id: 8, falha: 'Demora no processamento da compra', solucao: 'Usar SpeedPage Insights para verificar velocidade' },
    ],
  },
  compra_pagamento: {
    falhas: [
      { id: 1, falha: 'Não há processo de recuperação de venda', solucao: 'Iniciar recuperação manual ou automatizada (e-vendas, Active Campaign)' },
      { id: 2, falha: 'Tempo muito longo no boleto', solucao: 'Reduzir vencimento do boleto para máximo 72h' },
      { id: 3, falha: 'Público muito jovem (boletos não pagos)', solucao: 'Revisar segmentação de público nas campanhas' },
      { id: 4, falha: 'Problema com automações de email', solucao: 'Revisar disparos e verificar integrações' },
      { id: 5, falha: 'Gateway de pagamento com recusas em massa', solucao: 'Contatar gateway ou migrar para outro meio de pagamento' },
      { id: 6, falha: 'Problema na plataforma', solucao: 'Migrar para plataformas como Tray, Loja Integrada, NuvemShop' },
      { id: 7, falha: 'Boleto/Pix inválido', solucao: 'Revisar integrações e validar token do gateway' },
      { id: 8, falha: 'Falta de confiabilidade', solucao: 'Reforçar compra segura com certificados nos emails' },
    ],
  },
};

export function getStageDiagnostics(stageResults: StageResult[]): StageDiagnostic[] {
  const diagnostics: StageDiagnostic[] = [];
  
  for (const result of stageResults) {
    if (result.status === 'atencao' || result.status === 'critico') {
      const stageData = DIAGNOSTICS_DB[result.stage];
      if (stageData) {
        // Retorna 3-5 itens dependendo da severidade
        const itemCount = result.status === 'critico' ? 5 : 3;
        diagnostics.push({
          stage: result.stage,
          label: result.label,
          status: result.status,
          items: stageData.falhas.slice(0, itemCount),
        });
      }
    }
  }
  
  return diagnostics;
}

// Formatters
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPercent(value: number | null, decimals = 2): string {
  if (value === null) return '—';
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Gera insights rápidos baseado nos resultados
export function generateInsights(stageResults: StageResult[], outputs: EcommerceOutputs): string[] {
  const insights: string[] = [];
  
  // Encontra o maior gargalo
  const criticalStages = stageResults.filter(s => s.status === 'critico');
  const attentionStages = stageResults.filter(s => s.status === 'atencao');
  
  if (criticalStages.length > 0) {
    const worst = criticalStages.reduce((a, b) => 
      (a.gap ?? 0) < (b.gap ?? 0) ? a : b
    );
    insights.push(`⚠️ Gargalo crítico: ${worst.label} está ${formatPercent(Math.abs(worst.gap ?? 0))} abaixo do benchmark.`);
  }
  
  if (attentionStages.length > 0) {
    insights.push(`🔍 ${attentionStages.length} etapa(s) precisam de atenção.`);
  }
  
  if (outputs.roas !== null) {
    if (outputs.roas < 2) {
      insights.push(`📊 ROAS de ${outputs.roas.toFixed(2)}x está abaixo do ideal (2x+).`);
    } else if (outputs.roas >= 4) {
      insights.push(`✅ ROAS excelente de ${outputs.roas.toFixed(2)}x.`);
    }
  }
  
  // Taxa de pagamento
  if (outputs.taxaCompraPagamento !== null && outputs.taxaCompraPagamento < 70) {
    insights.push(`💳 Taxa de pagamento de ${formatPercent(outputs.taxaCompraPagamento)} indica problemas de checkout ou boletos não pagos.`);
  }
  
  return insights;
}

// Export para CSV
export function exportToCSV(
  inputs: EcommerceInputs, 
  outputs: EcommerceOutputs, 
  stageResults: StageResult[]
): string {
  const rows = [
    ['Métrica', 'Valor', 'Meta', 'Status'],
    ['Visitantes', inputs.visitantes.toString(), '', ''],
    ['Carrinhos', inputs.carrinhos.toString(), '', ''],
    ['Compras', inputs.compras.toString(), '', ''],
    ['Vendas Pagas', inputs.vendasPagas.toString(), '', ''],
    ['Ticket Médio', formatCurrency(inputs.ticketMedio), '', ''],
    ['Faturamento', formatCurrency(outputs.faturamento), '', ''],
    ['Investimento Total', formatCurrency(outputs.investimentoTotal), '', ''],
    ['ROAS', outputs.roas?.toFixed(2) ?? '—', '', ''],
    ['', '', '', ''],
    ['Etapa', 'Taxa Atual', 'Meta', 'Status'],
    ...stageResults.map(s => [
      s.label,
      formatPercent(s.atual),
      formatPercent(s.meta),
      s.status,
    ]),
  ];
  
  return rows.map(row => row.join(';')).join('\n');
}
