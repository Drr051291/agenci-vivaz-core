// Calculation utilities for Mercado Livre pricing calculator

export interface MLPricingInputs {
  salePrice: number;
  cogs: number;
  commissionPct: number;
  fixedFee: number;
  taxPct: number;
  shippingCost: number;
  packagingCost: number;
  platformCost: number;
  adsCost: number;
  otherCost: number;
}

export interface MLPricingOutputs {
  mlFee: number;
  taxAmount: number;
  extraCosts: number;
  netReceipt: number;
  profit: number;
  marginPct: number;
  breakEvenPrice: number;
}

export interface TargetPriceResult {
  suggestedPrice: number;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Calculate all derived values from sale price and costs
 */
export function calculateFromPrice(inputs: MLPricingInputs): MLPricingOutputs {
  const { salePrice, cogs, commissionPct, fixedFee, taxPct, shippingCost, packagingCost, platformCost, adsCost, otherCost } = inputs;
  
  const c = commissionPct / 100;
  const t = taxPct / 100;
  
  // ML fee = (price * commission%) + fixed fee
  const mlFee = (salePrice * c) + fixedFee;
  
  // Taxes = price * tax%
  const taxAmount = salePrice * t;
  
  // Extra costs sum
  const extraCosts = packagingCost + platformCost + adsCost + otherCost;
  
  // Net receipt (what seller receives after ML fees and shipping)
  const netReceipt = salePrice - mlFee - shippingCost;
  
  // Profit = price - ML fee - shipping - taxes - COGS - extras
  const profit = salePrice - mlFee - shippingCost - taxAmount - cogs - extraCosts;
  
  // Margin % = profit / price * 100
  const marginPct = salePrice > 0 ? (profit / salePrice) * 100 : 0;
  
  // Break even price: solve for P where profit = 0
  // 0 = P - (P*c + F) - S - P*t - C - E
  // 0 = P - P*c - F - S - P*t - C - E
  // 0 = P(1 - c - t) - (F + S + C + E)
  // P = (F + S + C + E) / (1 - c - t)
  const denominator = 1 - c - t;
  const breakEvenPrice = denominator > 0 
    ? (fixedFee + shippingCost + cogs + extraCosts) / denominator 
    : 0;
  
  return {
    mlFee: Math.round(mlFee * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    extraCosts: Math.round(extraCosts * 100) / 100,
    netReceipt: Math.round(netReceipt * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    marginPct: Math.round(marginPct * 100) / 100,
    breakEvenPrice: Math.round(breakEvenPrice * 100) / 100,
  };
}

/**
 * Calculate required price to achieve target margin
 * Target margin m (0-1): P = (C + F + S + E) / (1 - c - t - m)
 */
export function calculatePriceForMargin(
  targetMarginPct: number,
  cogs: number,
  commissionPct: number,
  fixedFee: number,
  taxPct: number,
  shippingCost: number,
  extraCosts: number
): TargetPriceResult {
  const c = commissionPct / 100;
  const t = taxPct / 100;
  const m = targetMarginPct / 100;
  
  const denominator = 1 - c - t - m;
  
  if (denominator <= 0) {
    return {
      suggestedPrice: 0,
      isValid: false,
      errorMessage: 'A soma de comissão, impostos e margem desejada excede 100%. Reduza a meta de margem ou os custos percentuais.',
    };
  }
  
  const price = (cogs + fixedFee + shippingCost + extraCosts) / denominator;
  
  return {
    suggestedPrice: Math.round(price * 100) / 100,
    isValid: true,
  };
}

/**
 * Calculate required price to achieve target profit
 * Target profit L: P = (C + F + S + E + L) / (1 - c - t)
 */
export function calculatePriceForProfit(
  targetProfit: number,
  cogs: number,
  commissionPct: number,
  fixedFee: number,
  taxPct: number,
  shippingCost: number,
  extraCosts: number
): TargetPriceResult {
  const c = commissionPct / 100;
  const t = taxPct / 100;
  
  const denominator = 1 - c - t;
  
  if (denominator <= 0) {
    return {
      suggestedPrice: 0,
      isValid: false,
      errorMessage: 'A soma de comissão e impostos excede 100%. Revise os percentuais.',
    };
  }
  
  const price = (cogs + fixedFee + shippingCost + extraCosts + targetProfit) / denominator;
  
  return {
    suggestedPrice: Math.round(price * 100) / 100,
    isValid: true,
  };
}

/**
 * Format number as Brazilian currency
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Format number as percentage
 */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + '%';
}
