
# Plano: Sistema de Comparação de Períodos para o Funil Pipedrive

## Objetivo
Implementar um sistema inteligente de comparação que automaticamente calcule a diferença percentual entre o período atual e um período anterior, permitindo customização do período de comparação.

---

## Comportamento Automático (Regra Padrão)

O sistema calculará automaticamente o período de comparação com base no período selecionado:

| Período Selecionado | Período de Comparação Automático |
|---------------------|----------------------------------|
| Hoje | Ontem |
| Esta semana | Semana passada |
| Últimos 7 dias | 7 dias anteriores (D-14 a D-7) |
| Últimos 14 dias | 14 dias anteriores (D-28 a D-14) |
| Este mês | Mês passado |
| Mês passado | Mês retrasado |
| Este ano | Ano passado |
| Personalizado | Mesmo intervalo anterior |

**Regra para período personalizado**: Se o usuário seleciona 01/01 a 15/01 (15 dias), a comparação será 17/12 a 31/12 (mesma duração).

---

## Customização do Período de Comparação

O usuário poderá sobrescrever o período automático com opções como:

- Período automático (padrão)
- Mês anterior
- Trimestre passado
- Mesmo período do ano anterior
- Período personalizado

---

## Arquitetura da Solução

### 1. Novos Tipos

**Arquivo:** `src/components/pipedrive-funnel/types.ts`

Adicionar:
- `ComparisonPreset`: tipo para presets de comparação
- `ComparisonData`: estrutura para dados de comparação
- `ComparisonConfig`: configuração de comparação

```text
type ComparisonPreset = 'auto' | 'previousMonth' | 'previousQuarter' | 'sameLastYear' | 'custom' | 'off';

interface ComparisonConfig {
  enabled: boolean;
  preset: ComparisonPreset;
  customRange?: DateRange;
}

interface ComparisonData {
  current: number;
  previous: number;
  variation: number;        // Percentual: ((current - previous) / previous) * 100
  trend: 'up' | 'down' | 'stable';
  periodLabel: string;      // Ex: "vs mês passado"
}
```

### 2. Utilitário de Cálculo

**Arquivo:** `src/components/pipedrive-funnel/comparisonUtils.ts`

Funções:
- `getAutoComparisonRange(currentRange, preset)`: Calcula o período de comparação automático
- `calculateVariation(current, previous)`: Calcula a variação percentual
- `getTrend(variation, threshold)`: Determina a tendência (up/down/stable)
- `formatVariation(variation)`: Formata para exibição (+12.5%, -8.2%)

### 3. Modificação do Hook

**Arquivo:** `src/components/pipedrive-funnel/usePipedriveFunnel.ts`

Modificar para buscar dados de dois períodos em paralelo:

```text
// Retorno atualizado
interface UsePipedriveFunnelReturn {
  data: FunnelData | null;
  comparisonData: FunnelData | null;     // NOVO
  loading: boolean;
  comparisonLoading: boolean;             // NOVO
  ...
}
```

### 4. Novo Componente de Filtro

**Arquivo:** `src/components/pipedrive-funnel/ComparisonPeriodSelector.tsx`

Selector compacto que permite:
- Toggle on/off da comparação
- Seleção do preset de comparação
- Calendário para período personalizado

### 5. Componente de Badge de Variação

**Arquivo:** `src/components/pipedrive-funnel/VariationBadge.tsx`

Badge reutilizável que exibe:
- Seta de tendência (TrendingUp/TrendingDown/Minus)
- Valor percentual com cor (verde/vermelho/cinza)
- Tooltip com detalhes do período

### 6. Atualização do FunnelStepper

O componente do funil exibirá indicadores de variação ao lado de cada métrica:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Leads no período: 45  ▲+12.5% vs mês passado                   │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────┐        ┌─────────┐        ┌─────────┐              │
│ │  Lead   │  42%   │   MQL   │  58%   │   SQL   │              │
│ │   45    │───────▶│   19    │───────▶│   11    │              │
│ │ ▲+12%   │ ▼-3pp  │ ▲+8%    │ ▲+15pp │ ▲+22%   │              │
│ └─────────┘        └─────────┘        └─────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### 7. Atualização do LeadSourceChart

Adicionar variação por origem:

```text
Lead Nativo    ███████████  78 (58%) ▲+15% vs mês passado
Landing Page   ██████       45 (33%) ▼-8%
Base Sétima    ███          12 (9%)  ▲+25%
```

---

## Interface do Usuário

### Seletor de Comparação no Header

```text
┌─────────────────────────────────────────────────────────────────┐
│ Período: [Este mês ▼]   Comparar com: [Automático (mês passado) ▼] │
│                                        ○ Desligado               │
│                                        ● Automático              │
│                                        ○ Trimestre passado       │
│                                        ○ Mesmo período ano ant.  │
│                                        ○ Personalizado...        │
└─────────────────────────────────────────────────────────────────┘
```

### Badges de Variação

Três estados visuais:

**Positivo (verde)**:
- Ícone TrendingUp
- Fundo verde claro
- Texto "+12.5%"

**Negativo (vermelho)**:
- Ícone TrendingDown
- Fundo vermelho claro
- Texto "-8.2%"

**Estável (cinza, ±2%)**:
- Ícone Minus
- Fundo cinza
- Texto "~0%"

---

## Etapas de Implementação

1. **Tipos e Utilitários** - Criar tipos e funções de cálculo de períodos
2. **ComparisonPeriodSelector** - Componente de seleção do período de comparação
3. **VariationBadge** - Componente de badge reutilizável
4. **Hook usePipedriveFunnel** - Adicionar busca de dados de comparação
5. **FunnelPeriodFilter** - Integrar seletor de comparação
6. **FunnelStepper** - Exibir variações ao lado das métricas
7. **LeadSourceChart** - Adicionar comparação por origem
8. **Dashboard** - Integrar tudo no dashboard principal

---

## Detalhes Técnicos

### Cálculo do Período Automático

```text
function getAutoComparisonRange(current: DateRange, preset: PeriodPreset): DateRange {
  const durationMs = current.end.getTime() - current.start.getTime();
  const durationDays = durationMs / (1000 * 60 * 60 * 24);
  
  switch (preset) {
    case 'today':
      return { start: subDays(current.start, 1), end: subDays(current.end, 1) };
    case 'thisWeek':
      return { start: subWeeks(current.start, 1), end: subWeeks(current.end, 1) };
    case 'thisMonth':
      return { start: subMonths(current.start, 1), end: endOfMonth(subMonths(current.start, 1)) };
    case 'custom':
    default:
      // Mesmo intervalo anterior
      return { 
        start: subDays(current.start, durationDays + 1), 
        end: subDays(current.start, 1) 
      };
  }
}
```

### Variação de Taxas de Conversão

Para taxas de conversão, usar **pontos percentuais (pp)** em vez de variação relativa:

- Período atual: 42% de conversão
- Período anterior: 45% de conversão
- Variação: -3pp (não -6.67%)

### Performance

Para evitar chamadas duplicadas:
- Usar Promise.all para buscar dados de ambos os períodos em paralelo
- Manter cache separado para cada período
- Debounce de 500ms igual ao existente

---

## Resultado Final

O usuário poderá:
1. Ver automaticamente a comparação com o período anterior equivalente
2. Personalizar o período de comparação quando necessário
3. Visualizar as variações de forma clara e destacada
4. Entender rapidamente se o desempenho melhorou ou piorou
5. Identificar em qual etapa do funil houve maior variação
6. Desligar a comparação se desejar uma visualização mais limpa
