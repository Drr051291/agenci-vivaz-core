// Projection calculation utilities for E-commerce and WhatsApp channels

export type Channel = 'ecommerce' | 'whatsapp';
export type Mode = 'target_to_budget' | 'budget_to_projection';

export interface ProjectionInputs {
  // Common inputs
  ticketMedio: number;        // Average Order Value (R$)
  aprovacao: number;          // Payment approval rate (0-1)
  taxaConversao: number;      // Conversion rate (0-1)
  custoUnitario: number;      // CPS (R$/session) or CPCv (R$/conversation)
  
  // Mode-specific
  metaReceitaFaturada?: number; // Target revenue for target_to_budget mode
  investimento?: number;        // Budget for budget_to_projection mode
}

export interface ProjectionOutputs {
  // Revenue
  receitaFaturada: number;
  receitaCaptada: number;
  
  // Orders
  pedidosFaturados: number;
  pedidosCaptados: number;
  
  // Volume (Sessions or Conversations)
  volumeTopoFunil: number;
  
  // Investment
  investimento: number;
  
  // KPIs
  roasPago: number;
  roasCaptado: number;
  cpaPago: number;
  cpaCaptado: number;
  percentMidiaPago: number;
  percentMidiaCaptado: number;
}

// Benchmarks by channel
export const BENCHMARKS = {
  ecommerce: {
    taxaConversao: 0.012,    // 1.2%
    aprovacao: 0.90,         // 90%
    ticketMedio: 430,        // R$ 430
    custoUnitario: 0.35,     // R$ 0.35 CPS
  },
  whatsapp: {
    taxaConversao: 0.08,     // 8%
    aprovacao: 0.90,         // 90%
    ticketMedio: 430,        // R$ 430
    custoUnitario: 2.50,     // R$ 2.50 CPCv
  },
} as const;

// Calculate projection based on mode
export function calculateProjection(
  inputs: ProjectionInputs,
  mode: Mode
): ProjectionOutputs {
  const { ticketMedio, aprovacao, taxaConversao, custoUnitario } = inputs;
  
  // Validate inputs to prevent division by zero
  const safeTicketMedio = ticketMedio || 0.01;
  const safeAprovacao = aprovacao || 0.01;
  const safeTaxaConversao = taxaConversao || 0.0001;
  const safeCustoUnitario = custoUnitario || 0.01;
  
  let receitaFaturada: number;
  let receitaCaptada: number;
  let pedidosFaturados: number;
  let pedidosCaptados: number;
  let volumeTopoFunil: number;
  let investimento: number;
  
  if (mode === 'target_to_budget') {
    // Mode A: Meta → Orçamento necessário
    const meta = inputs.metaReceitaFaturada || 0;
    
    receitaFaturada = meta;
    pedidosFaturados = meta / safeTicketMedio;
    pedidosCaptados = pedidosFaturados / safeAprovacao;
    volumeTopoFunil = pedidosCaptados / safeTaxaConversao;
    investimento = volumeTopoFunil * safeCustoUnitario;
    receitaCaptada = meta / safeAprovacao;
  } else {
    // Mode B: Orçamento → Projeção de resultado
    investimento = inputs.investimento || 0;
    
    volumeTopoFunil = investimento / safeCustoUnitario;
    pedidosCaptados = volumeTopoFunil * taxaConversao;
    pedidosFaturados = pedidosCaptados * aprovacao;
    receitaFaturada = pedidosFaturados * ticketMedio;
    receitaCaptada = receitaFaturada / safeAprovacao;
  }
  
  // Calculate KPIs
  const safeInvestimento = investimento || 0.01;
  const safePedidosCaptados = pedidosCaptados || 0.01;
  const safePedidosFaturados = pedidosFaturados || 0.01;
  const safeReceitaFaturada = receitaFaturada || 0.01;
  const safeReceitaCaptada = receitaCaptada || 0.01;
  
  const roasPago = receitaFaturada / safeInvestimento;
  const roasCaptado = receitaCaptada / safeInvestimento;
  const cpaPago = investimento / safePedidosFaturados;
  const cpaCaptado = investimento / safePedidosCaptados;
  const percentMidiaPago = investimento / safeReceitaFaturada;
  const percentMidiaCaptado = investimento / safeReceitaCaptada;
  
  return {
    receitaFaturada,
    receitaCaptada,
    pedidosFaturados,
    pedidosCaptados,
    volumeTopoFunil,
    investimento,
    roasPago,
    roasCaptado,
    cpaPago,
    cpaCaptado,
    percentMidiaPago,
    percentMidiaCaptado,
  };
}

// Generate insights based on outputs
export function generateInsights(outputs: ProjectionOutputs, channel: Channel): string[] {
  const insights: string[] = [];
  
  // High media dependency warning
  if (outputs.percentMidiaPago > 0.20) {
    insights.push(
      `⚠️ Alta dependência de mídia: ${formatPercent(outputs.percentMidiaPago)} do faturamento vai para investimento.`
    );
  }
  
  // Low ROAS warning
  if (outputs.roasPago > 0 && outputs.roasPago < 3) {
    insights.push(
      `⚠️ ROAS baixo (${formatNumber(outputs.roasPago)}x). Considere otimizar campanhas ou revisar o custo por ${channel === 'ecommerce' ? 'sessão' : 'conversa'}.`
    );
  }
  
  // Good ROAS
  if (outputs.roasPago >= 5) {
    insights.push(
      `✅ ROAS saudável (${formatNumber(outputs.roasPago)}x). Bom retorno sobre investimento.`
    );
  }
  
  // Conversion bottleneck
  const volumeLabel = channel === 'ecommerce' ? 'sessões' : 'conversas';
  if (outputs.volumeTopoFunil > 0 && outputs.pedidosCaptados > 0) {
    const convRate = outputs.pedidosCaptados / outputs.volumeTopoFunil;
    if (convRate < 0.01) {
      insights.push(
        `🔍 Gargalo provável: taxa de conversão muito baixa. Revise a jornada de ${volumeLabel} até pedido.`
      );
    }
  }
  
  // CPA check
  if (outputs.cpaPago > outputs.receitaFaturada / (outputs.pedidosFaturados || 1) * 0.5) {
    insights.push(
      `💰 CPA elevado em relação ao ticket médio. Margem pode estar comprometida.`
    );
  }
  
  return insights.slice(0, 3); // Max 3 insights
}

// Formatting helpers
export function formatCurrency(value: number): string {
  if (!isFinite(value) || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatNumber(value: number, decimals: number = 2): string {
  if (!isFinite(value) || isNaN(value)) return '0';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number): string {
  if (!isFinite(value) || isNaN(value)) return '0,00%';
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatInteger(value: number): string {
  if (!isFinite(value) || isNaN(value)) return '0';
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

// Labels by channel
export function getChannelLabels(channel: Channel) {
  if (channel === 'ecommerce') {
    return {
      volumeLabel: 'Sessões',
      custoUnitarioLabel: 'CPS (R$/sessão)',
      taxaConversaoLabel: 'Taxa de conversão (sessão → pedido)',
      custoUnitarioTooltip: 'Custo por sessão no site',
    };
  }
  return {
    volumeLabel: 'Conversas',
    custoUnitarioLabel: 'Custo por conversa (R$/conversa)',
    taxaConversaoLabel: 'Taxa de conversão (conversa → pedido)',
    custoUnitarioTooltip: 'Custo para gerar cada conversa qualificada',
  };
}
