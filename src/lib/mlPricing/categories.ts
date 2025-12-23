// Mercado Livre categories with commission rates (updated Jan 2025)
// Source: mercadolivre.com.br/landing/custos-de-venda/tarifas-de-venda

export interface MLCategory {
  id: string;
  label: string;
  classico: number; // Commission % for Clássico
  premium: number;  // Commission % for Premium
}

export const ML_CATEGORIES: MLCategory[] = [
  { id: 'acessorios_veiculos', label: 'Acessórios para Veículos', classico: 12, premium: 17 },
  { id: 'agro', label: 'Agro', classico: 11.5, premium: 16.5 },
  { id: 'alimentos_bebidas', label: 'Alimentos e Bebidas', classico: 14, premium: 19 },
  { id: 'antiguidades', label: 'Antiguidades e Coleções', classico: 11.5, premium: 16.5 },
  { id: 'arte_papelaria', label: 'Arte, Papelaria e Armarinho', classico: 11.5, premium: 16.5 },
  { id: 'bebes', label: 'Bebês', classico: 14, premium: 19 },
  { id: 'beleza', label: 'Beleza e Cuidado Pessoal', classico: 14, premium: 19 },
  { id: 'brinquedos', label: 'Brinquedos e Hobbies', classico: 11.5, premium: 16.5 },
  { id: 'moda', label: 'Calçados, Roupas e Bolsas', classico: 14, premium: 19 },
  { id: 'cameras', label: 'Câmeras e Acessórios', classico: 11, premium: 16 },
  { id: 'casa_decoracao', label: 'Casa, Móveis e Decoração', classico: 11.5, premium: 16.5 },
  { id: 'construcao', label: 'Construção', classico: 11.5, premium: 16.5 },
  { id: 'eletrodomesticos', label: 'Eletrodomésticos', classico: 11, premium: 16 },
  { id: 'eletronicos', label: 'Eletrônicos, Áudio e Vídeo', classico: 13, premium: 18 },
  { id: 'esportes', label: 'Esportes e Fitness', classico: 14, premium: 19 },
  { id: 'festas', label: 'Festas e Lembrancinhas', classico: 11.5, premium: 16.5 },
  { id: 'games', label: 'Games', classico: 13, premium: 18 },
  { id: 'informatica', label: 'Informática (Celulares, Notebooks...)', classico: 11, premium: 16 },
  { id: 'industria', label: 'Indústria e Comércio', classico: 12, premium: 17 },
  { id: 'ingressos', label: 'Ingressos', classico: 11.5, premium: 16.5 },
  { id: 'instrumentos', label: 'Instrumentos Musicais', classico: 11.5, premium: 16.5 },
  { id: 'joias', label: 'Joias e Relógios', classico: 12.5, premium: 17.5 },
  { id: 'livros', label: 'Livros, Revistas e Comics', classico: 12, premium: 17 },
  { id: 'musica_filmes', label: 'Música, Filmes e Seriados', classico: 12, premium: 17 },
  { id: 'pet_shop', label: 'Pet Shop', classico: 12.5, premium: 17.5 },
  { id: 'saude', label: 'Saúde', classico: 12, premium: 17 },
  { id: 'outros', label: 'Outras categorias', classico: 13, premium: 18 },
];

// Fixed fee rules based on price range (Jan 2025)
// Products >= R$ 79 don't pay fixed fee
export interface FixedFeeRule {
  minPrice: number;
  maxPrice: number;
  fee: number;
  description: string;
}

export const FIXED_FEE_RULES: FixedFeeRule[] = [
  { minPrice: 0, maxPrice: 12.49, fee: 0, description: 'Até R$ 12,50: paga 50% do valor do produto' },
  { minPrice: 12.50, maxPrice: 28.99, fee: 6.25, description: 'R$ 12,50 a R$ 29: R$ 6,25' },
  { minPrice: 29.00, maxPrice: 49.99, fee: 6.50, description: 'R$ 29 a R$ 50: R$ 6,50' },
  { minPrice: 50.00, maxPrice: 78.99, fee: 6.75, description: 'R$ 50 a R$ 79: R$ 6,75' },
  { minPrice: 79.00, maxPrice: Infinity, fee: 0, description: 'Acima de R$ 79: sem taxa fixa' },
];

// Special rules for books
export const FIXED_FEE_RULES_BOOKS: FixedFeeRule[] = [
  { minPrice: 0, maxPrice: 5.99, fee: 0, description: 'Até R$ 6: paga 50% do valor do produto' },
  { minPrice: 6.00, maxPrice: 28.99, fee: 3.00, description: 'R$ 6 a R$ 29: R$ 3,00' },
  { minPrice: 29.00, maxPrice: 49.99, fee: 3.50, description: 'R$ 29 a R$ 50: R$ 3,50' },
  { minPrice: 50.00, maxPrice: 78.99, fee: 4.00, description: 'R$ 50 a R$ 79: R$ 4,00' },
  { minPrice: 79.00, maxPrice: Infinity, fee: 0, description: 'Acima de R$ 79: sem taxa fixa' },
];

/**
 * Get the fixed fee based on price and category
 */
export function getFixedFee(price: number, categoryId: string): number {
  const rules = categoryId === 'livros' ? FIXED_FEE_RULES_BOOKS : FIXED_FEE_RULES;
  
  // Special case: price < threshold, pay 50% of product value
  if (categoryId === 'livros' && price < 6) {
    return price * 0.5;
  }
  if (categoryId !== 'livros' && price < 12.50) {
    return price * 0.5;
  }
  
  const rule = rules.find(r => price >= r.minPrice && price <= r.maxPrice);
  return rule?.fee ?? 0;
}

/**
 * Get commission percentage based on category and listing type
 */
export function getCommission(categoryId: string, listingType: 'CLASSICO' | 'PREMIUM'): number {
  const category = ML_CATEGORIES.find(c => c.id === categoryId);
  if (!category) return listingType === 'CLASSICO' ? 13 : 18; // Default
  return listingType === 'CLASSICO' ? category.classico : category.premium;
}

// Tax presets for Brazil
export interface TaxPreset {
  id: string;
  label: string;
  rate: number;
  description: string;
}

export const TAX_PRESETS: TaxPreset[] = [
  { id: 'isento', label: 'Isento / Não aplicável', rate: 0, description: 'Sem impostos' },
  { id: 'mei', label: 'MEI', rate: 0, description: 'Microempreendedor Individual - DAS fixo' },
  { id: 'simples_baixo', label: 'Simples Nacional (faixa 1)', rate: 4, description: 'Até R$ 180 mil/ano' },
  { id: 'simples_medio', label: 'Simples Nacional (faixa 2-3)', rate: 7.3, description: 'R$ 180 mil a R$ 720 mil/ano' },
  { id: 'simples_alto', label: 'Simples Nacional (faixa 4-5)', rate: 11, description: 'R$ 720 mil a R$ 1.8 mi/ano' },
  { id: 'lucro_presumido', label: 'Lucro Presumido', rate: 11.33, description: 'PIS + COFINS + IRPJ + CSLL' },
  { id: 'personalizado', label: 'Personalizado', rate: -1, description: 'Definir manualmente' },
];

// Shipping cost presets based on seller reputation and weight
export interface ShippingPreset {
  id: string;
  label: string;
  cost: number;
  description: string;
}

export const SHIPPING_PRESETS: ShippingPreset[] = [
  { id: 'leve_verde', label: 'Até 300g (rep. verde)', cost: 11.99, description: 'Pacote pequeno, reputação verde' },
  { id: 'leve_amarela', label: 'Até 300g (rep. amarela)', cost: 15.99, description: 'Pacote pequeno, reputação amarela' },
  { id: 'medio_verde', label: '300g a 1kg (rep. verde)', cost: 18.99, description: 'Pacote médio, reputação verde' },
  { id: 'medio_amarela', label: '300g a 1kg (rep. amarela)', cost: 24.99, description: 'Pacote médio, reputação amarela' },
  { id: 'pesado_verde', label: '1kg a 5kg (rep. verde)', cost: 24.99, description: 'Pacote pesado, reputação verde' },
  { id: 'pesado_amarela', label: '1kg a 5kg (rep. amarela)', cost: 32.99, description: 'Pacote pesado, reputação amarela' },
  { id: 'full', label: 'Mercado Envios Full', cost: 8.99, description: 'Estoque no fulfillment ML' },
  { id: 'personalizado', label: 'Personalizado', cost: -1, description: 'Definir manualmente' },
];

/**
 * Free shipping rules based on sale price (Updated Jun 2025):
 * 
 * - Abaixo de R$ 19: Frete grátis OPCIONAL, se oferecer, VENDEDOR paga
 * - R$ 19 a R$ 78,99: Frete grátis AUTOMÁTICO, MERCADO LIVRE paga (custo 0 para vendedor)
 * - R$ 79 ou mais: Frete grátis AUTOMÁTICO, VENDEDOR paga (com desconto por reputação)
 */
export type FreeShippingStatus = 
  | 'OPTIONAL_SELLER_PAYS' // < R$ 19: opcional, vendedor paga se oferecer
  | 'MANDATORY_ML_PAYS'     // R$ 19-78,99: obrigatório, ML paga
  | 'MANDATORY_SELLER_PAYS' // >= R$ 79: obrigatório, vendedor paga

export interface FreeShippingRule {
  status: FreeShippingStatus;
  label: string;
  description: string;
  sellerPays: boolean;
  isOptional: boolean;
}

export function getFreeShippingRule(salePrice: number): FreeShippingRule {
  if (salePrice < 19) {
    return {
      status: 'OPTIONAL_SELLER_PAYS',
      label: 'Frete grátis opcional',
      description: 'Você pode oferecer frete grátis, mas pagará o custo do envio.',
      sellerPays: true,
      isOptional: true,
    };
  } else if (salePrice < 79) {
    return {
      status: 'MANDATORY_ML_PAYS',
      label: 'Frete grátis pelo Mercado Livre',
      description: 'O ML paga o frete grátis automaticamente. Você não paga nada.',
      sellerPays: false,
      isOptional: false,
    };
  } else {
    return {
      status: 'MANDATORY_SELLER_PAYS',
      label: 'Frete grátis obrigatório',
      description: 'Você oferece frete grátis e paga o custo (com desconto por reputação).',
      sellerPays: true,
      isOptional: false,
    };
  }
}
