// DRE Projection Calculation Engine

export type ProjectionModel = 'INVEST_TO_REV' | 'REV_GROWTH';
export type ScalingType = 'pedidos' | 'receita' | 'fixo';

export interface DREInputs {
  // Base month data
  receitaBase: number;
  pedidosBase: number;
  cmvBase: number;
  freteBase: number;
  investimentoBase: number;
  comissaoBase: number;
  custosFixosBase: number;
  impostoPct: number;
  
  // Model settings
  model: ProjectionModel;
  horizonMonths: number;
  
  // Growth params
  gMkt: number;     // Crescimento do investimento (% ao mês)
  dRoas: number;    // Queda de ROAS (% ao mês)
  gRev: number;     // Crescimento da receita (% ao mês)
  gTicket: number;  // Crescimento do ticket (% ao mês)
  gFix: number;     // Crescimento dos custos fixos (% ao mês)
  retornoPct: number; // Taxa de retorno/recorrência
  
  // Scaling options
  cmvScaling: ScalingType;
  freteScaling: ScalingType;
  comissaoScaling: ScalingType;
  
  // Thresholds (optional)
  margemMinima?: number;
  roasMinimo?: number;
  ebitdaMinimo?: number;
}

export interface MonthProjection {
  month: number;
  label: string;
  receita: number;
  impostos: number;
  receitaLiquida: number;
  cmv: number;
  frete: number;
  comissao: number;
  margemContrib: number;
  margemContribPct: number;
  investimento: number;
  custosFixos: number;
  ebitda: number;
  ebitdaPct: number;
  pedidos: number;
  ticket: number;
  roas: number;
}

export interface DREAlert {
  month: number;
  label: string;
  type: 'margem' | 'ebitda' | 'roas';
  message: string;
  severity: 'warning' | 'error';
}

export interface DREProjection {
  months: MonthProjection[];
  alerts: DREAlert[];
  baseMonth: MonthProjection;
  lastMonth: MonthProjection;
}

function formatMonthLabel(baseMonth: Date, offsetMonths: number): string {
  const date = new Date(baseMonth);
  date.setMonth(date.getMonth() + offsetMonths);
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${monthNames[date.getMonth()]}/${date.getFullYear()}`;
}

export function calculateDREProjection(inputs: DREInputs, baseMonth: Date): DREProjection {
  const {
    receitaBase: R0,
    pedidosBase: O0,
    cmvBase,
    freteBase,
    investimentoBase: MKT0,
    comissaoBase,
    custosFixosBase: FIX0,
    impostoPct,
    model,
    horizonMonths,
    gMkt,
    dRoas,
    gRev,
    gTicket,
    gFix,
    retornoPct,
    cmvScaling,
    freteScaling,
    comissaoScaling,
    margemMinima,
    roasMinimo,
    ebitdaMinimo,
  } = inputs;

  const tax = impostoPct / 100;
  const ticket0 = O0 > 0 ? R0 / O0 : 0;
  const roas0 = MKT0 > 0 ? R0 / MKT0 : 0;
  
  // Cost rates
  const cmvPerOrder = O0 > 0 ? cmvBase / O0 : 0;
  const cmvPctRevenue = R0 > 0 ? cmvBase / R0 : 0;
  const fretePerOrder = O0 > 0 ? freteBase / O0 : 0;
  const fretePctRevenue = R0 > 0 ? freteBase / R0 : 0;
  const comissaoPctRevenue = R0 > 0 ? comissaoBase / R0 : 0;

  const months: MonthProjection[] = [];
  const alerts: DREAlert[] = [];
  
  // Base month (month 0)
  const baseProjection: MonthProjection = {
    month: 0,
    label: formatMonthLabel(baseMonth, 0),
    receita: R0,
    impostos: R0 * tax,
    receitaLiquida: R0 * (1 - tax),
    cmv: cmvBase,
    frete: freteBase,
    comissao: comissaoBase,
    margemContrib: R0 - (R0 * tax) - cmvBase - freteBase - comissaoBase,
    margemContribPct: R0 > 0 ? ((R0 - (R0 * tax) - cmvBase - freteBase - comissaoBase) / R0) * 100 : 0,
    investimento: MKT0,
    custosFixos: FIX0,
    ebitda: R0 - (R0 * tax) - cmvBase - freteBase - comissaoBase - MKT0 - FIX0,
    ebitdaPct: R0 > 0 ? ((R0 - (R0 * tax) - cmvBase - freteBase - comissaoBase - MKT0 - FIX0) / R0) * 100 : 0,
    pedidos: O0,
    ticket: ticket0,
    roas: roas0,
  };
  months.push(baseProjection);
  
  let prevRevenue = R0;
  
  // Projection loop
  for (let i = 1; i <= horizonMonths; i++) {
    let receita: number;
    let investimento: number;
    let ticket: number;
    let pedidos: number;
    let roas: number;
    
    if (model === 'INVEST_TO_REV') {
      // Investimento → Receita (ROAS)
      investimento = MKT0 * Math.pow(1 + gMkt / 100, i);
      roas = Math.max(0, roas0 * Math.pow(1 - dRoas / 100, i));
      const newRevenue = investimento * roas;
      receita = newRevenue + (prevRevenue * retornoPct / 100);
      ticket = ticket0; // Keep ticket stable by default
      pedidos = ticket > 0 ? receita / ticket : 0;
    } else {
      // Receita → Receita (crescimento)
      receita = R0 * Math.pow(1 + gRev / 100, i) + (prevRevenue * retornoPct / 100);
      ticket = ticket0 * Math.pow(1 + gTicket / 100, i);
      pedidos = ticket > 0 ? receita / ticket : 0;
      investimento = MKT0 * Math.pow(1 + gMkt / 100, i);
      roas = investimento > 0 ? receita / investimento : 0;
    }
    
    // Costs
    const impostos = receita * tax;
    const receitaLiquida = receita * (1 - tax);
    
    let cmv: number;
    if (cmvScaling === 'pedidos') {
      cmv = cmvPerOrder * pedidos;
    } else {
      cmv = cmvPctRevenue * receita;
    }
    
    let frete: number;
    if (freteScaling === 'pedidos') {
      frete = fretePerOrder * pedidos;
    } else {
      frete = fretePctRevenue * receita;
    }
    
    let comissao: number;
    if (comissaoScaling === 'fixo') {
      comissao = comissaoBase;
    } else {
      comissao = comissaoPctRevenue * receita;
    }
    
    const custosFixos = FIX0 * Math.pow(1 + gFix / 100, i);
    
    // Contribution margin
    const varCosts = impostos + cmv + frete + comissao;
    const margemContrib = receita - varCosts;
    const margemContribPct = receita > 0 ? (margemContrib / receita) * 100 : 0;
    
    // EBITDA
    const ebitda = receita - varCosts - investimento - custosFixos;
    const ebitdaPct = receita > 0 ? (ebitda / receita) * 100 : 0;
    
    const monthData: MonthProjection = {
      month: i,
      label: formatMonthLabel(baseMonth, i),
      receita,
      impostos,
      receitaLiquida,
      cmv,
      frete,
      comissao,
      margemContrib,
      margemContribPct,
      investimento,
      custosFixos,
      ebitda,
      ebitdaPct,
      pedidos,
      ticket,
      roas,
    };
    
    months.push(monthData);
    
    // Check alerts
    if (margemMinima !== undefined && margemMinima !== null && margemContribPct < margemMinima) {
      alerts.push({
        month: i,
        label: monthData.label,
        type: 'margem',
        message: `Margem de contribuição (${margemContribPct.toFixed(1)}%) abaixo do mínimo (${margemMinima}%)`,
        severity: 'warning',
      });
    }
    
    if (ebitda < 0) {
      alerts.push({
        month: i,
        label: monthData.label,
        type: 'ebitda',
        message: `EBITDA negativo: ${formatCurrency(ebitda)}`,
        severity: 'error',
      });
    } else if (ebitdaMinimo !== undefined && ebitdaMinimo !== null && ebitda < ebitdaMinimo) {
      alerts.push({
        month: i,
        label: monthData.label,
        type: 'ebitda',
        message: `EBITDA (${formatCurrency(ebitda)}) abaixo do mínimo (${formatCurrency(ebitdaMinimo)})`,
        severity: 'warning',
      });
    }
    
    if (roasMinimo !== undefined && roasMinimo !== null && roas < roasMinimo) {
      alerts.push({
        month: i,
        label: monthData.label,
        type: 'roas',
        message: `ROAS (${roas.toFixed(2)}) abaixo do mínimo (${roasMinimo})`,
        severity: 'warning',
      });
    }
    
    prevRevenue = receita;
  }
  
  return {
    months,
    alerts,
    baseMonth: months[0],
    lastMonth: months[months.length - 1],
  };
}

// Formatting helpers
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Generate AI insights (simple, deterministic)
export function generateDREInsights(projection: DREProjection): string[] {
  const insights: string[] = [];
  const { baseMonth: base, lastMonth: last, alerts } = projection;
  
  // Revenue growth
  const revenueGrowth = base.receita > 0 
    ? ((last.receita - base.receita) / base.receita) * 100 
    : 0;
  
  if (revenueGrowth > 50) {
    insights.push(`📈 Crescimento projetado de ${formatPercent(revenueGrowth)} na receita ao longo do período.`);
  } else if (revenueGrowth > 0) {
    insights.push(`📊 Receita deve crescer ${formatPercent(revenueGrowth)} no período projetado.`);
  } else if (revenueGrowth < 0) {
    insights.push(`⚠️ Atenção: Receita projetada em queda de ${formatPercent(Math.abs(revenueGrowth))}.`);
  }
  
  // EBITDA trend
  if (last.ebitda > 0 && base.ebitda > 0) {
    const ebitdaGrowth = ((last.ebitda - base.ebitda) / base.ebitda) * 100;
    if (ebitdaGrowth > 20) {
      insights.push(`💰 EBITDA crescendo ${formatPercent(ebitdaGrowth)} - boa eficiência operacional.`);
    }
  } else if (last.ebitda < 0) {
    insights.push(`🚨 EBITDA ficará negativo no último mês projetado. Revise custos ou premissas de crescimento.`);
  }
  
  // Margin analysis
  if (last.margemContribPct < 20) {
    insights.push(`⚠️ Margem de contribuição baixa (${formatPercent(last.margemContribPct)}). Considere otimizar custos variáveis.`);
  } else if (last.margemContribPct > 40) {
    insights.push(`✅ Margem de contribuição saudável (${formatPercent(last.margemContribPct)}).`);
  }
  
  // ROAS analysis
  if (last.roas < 2) {
    insights.push(`📉 ROAS projetado (${last.roas.toFixed(2)}) está baixo. Pode ser necessário otimizar investimento em mídia.`);
  } else if (last.roas > 5) {
    insights.push(`🎯 ROAS excelente projetado (${last.roas.toFixed(2)}).`);
  }
  
  // Alert summary
  const errorAlerts = alerts.filter(a => a.severity === 'error');
  if (errorAlerts.length > 0) {
    insights.push(`🚨 ${errorAlerts.length} alerta(s) crítico(s) detectado(s). Verifique a seção de alertas.`);
  }
  
  return insights;
}

// Export to CSV
export function exportDREToCSV(projection: DREProjection): string {
  const headers = [
    'Mês',
    'Receita',
    'Impostos',
    'Receita Líquida',
    'CMV',
    'Frete',
    'Comissão',
    'Margem de Contribuição',
    'Margem Contrib. (%)',
    'Investimento',
    'Custos Fixos',
    'EBITDA',
    'EBITDA (%)',
    'Pedidos',
    'Ticket Médio',
    'ROAS',
  ];
  
  const rows = projection.months.map(m => [
    m.label,
    m.receita.toFixed(2),
    m.impostos.toFixed(2),
    m.receitaLiquida.toFixed(2),
    m.cmv.toFixed(2),
    m.frete.toFixed(2),
    m.comissao.toFixed(2),
    m.margemContrib.toFixed(2),
    m.margemContribPct.toFixed(2),
    m.investimento.toFixed(2),
    m.custosFixos.toFixed(2),
    m.ebitda.toFixed(2),
    m.ebitdaPct.toFixed(2),
    m.pedidos.toFixed(0),
    m.ticket.toFixed(2),
    m.roas.toFixed(2),
  ]);
  
  return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
}
