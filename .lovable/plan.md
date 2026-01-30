
# Plano: Gráfico de Rastreamento de Campanhas Meta Ads

## Objetivo
Criar um novo gráfico que exiba a distribuição de negócios por etapa do funil, agrupados por Campanha, Conjunto de Anúncios e Criativo do Meta Ads, usando o campo personalizado "Origem - Campanha / Conjunto / Criativo" do Pipedrive.

## Entendimento do Campo

O campo "Origem - Campanha / Conjunto / Criativo" contém informações separadas por "/" no formato:

```text
[Campanha] / [Conjunto] / [Criativo]
```

Exemplo da imagem:
- **Campanha**: `[M][Lead][Nativo] - Brandspot`
- **Conjunto**: `00 Profissionais de marketig - Novos criativos - 12/25 — ADv +`
- **Criativo**: `ad 07 gravar mais custar menos`

---

## Arquitetura da Solução

### 1. Backend (Edge Function)

**Arquivo:** `supabase/functions/pipedrive-proxy/index.ts`

- Adicionar nova action `get_campaign_tracking` ou estender `get_funnel_data` para incluir dados de rastreamento
- Buscar deals com o campo personalizado "Origem - Campanha / Conjunto / Criativo" (precisa identificar o `custom_field_key` via API do Pipedrive)
- Fazer parse do campo separando por "/" para extrair Campanha, Conjunto e Criativo
- Agrupar contagens por etapa e por cada nível de rastreamento
- Aplicar mesmos filtros de data e `DEALS_CREATED_AFTER`

### 2. Frontend (Novo Componente)

**Arquivo:** `src/components/pipedrive-funnel/CampaignTrackingChart.tsx`

- Componente com abas para alternar entre visões:
  - **Por Campanha**: Agrupa por campanha
  - **Por Conjunto**: Agrupa por conjunto de anúncios
  - **Por Criativo**: Agrupa por criativo
- Gráfico de barras horizontais (similar ao LostReasonsChart)
- Cada barra mostra quantidade de deals e percentual
- Filtro por etapa do funil ou visão total

---

## Detalhes Técnicos

### Identificação do Campo Personalizado

Primeiro, é necessário identificar a chave do campo personalizado no Pipedrive. Campos personalizados no Pipedrive são acessados via chaves como `abc123_campo_hash`. A API de deals retorna esses campos diretamente no objeto do deal.

```typescript
// Estrutura esperada do deal com campo personalizado
interface DealWithTracking {
  id: number
  stage_id: number
  add_time: string
  // Campo personalizado (chave hash)
  [customFieldKey: string]: string // Ex: "abc123_tracking_field"
}
```

### Lógica de Parse do Campo

```typescript
function parseTrackingField(value: string): {
  campaign: string
  adSet: string  
  creative: string
} {
  if (!value) {
    return { campaign: 'Não informado', adSet: 'Não informado', creative: 'Não informado' }
  }
  
  // Dividir por "/" e limpar espaços
  const parts = value.split('/').map(p => p.trim())
  
  return {
    campaign: parts[0] || 'Não informado',
    adSet: parts[1] || 'Não informado',
    creative: parts[2] || 'Não informado'
  }
}
```

### Estrutura de Dados Retornada

```typescript
interface CampaignTrackingData {
  // Contagem total por campanha
  by_campaign: Record<string, {
    total: number
    by_stage: Record<number, number>
  }>
  // Contagem total por conjunto
  by_adset: Record<string, {
    total: number
    by_stage: Record<number, number>
  }>
  // Contagem total por criativo
  by_creative: Record<string, {
    total: number
    by_stage: Record<number, number>
  }>
}
```

### Componente Frontend

- Usar Recharts (BarChart horizontal) igual ao gráfico de Motivos de Perda
- Tabs para alternar entre Campanha / Conjunto / Criativo
- Sub-tabs para filtrar por etapa específica ou ver total
- Exibir top 10 itens mais frequentes
- Cores diferenciadas para cada item

---

## Etapas de Implementação

1. **Edge Function** - Identificar a chave do campo personalizado e criar lógica de busca/parse
2. **Tipos TypeScript** - Atualizar `types.ts` com interface para dados de tracking
3. **Hook** - Estender `usePipedriveFunnel` ou criar novo hook para dados de tracking
4. **Componente** - Criar `CampaignTrackingChart.tsx`
5. **Dashboard** - Integrar componente no `PipedriveFunnelDashboard.tsx`

---

## Visualização Final

O gráfico terá uma estrutura similar a esta:

```text
┌─────────────────────────────────────────────────────────────┐
│ Rastreamento de Campanhas                                   │
├─────────────────────────────────────────────────────────────┤
│ [Campanha] [Conjunto] [Criativo]     ← Tabs principais      │
│─────────────────────────────────────────────────────────────│
│ [Total] [Lead] [MQL] [SQL] [...]     ← Sub-tabs por etapa   │
│─────────────────────────────────────────────────────────────│
│                                                             │
│ [M][Lead][Nativo] - Brandspot  ████████████████  45 (62%)   │
│ [M][Lead][Stories] - XYZ       ██████████        18 (25%)   │
│ [M][Retargeting] - ABC         ████              10 (13%)   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Observação Importante

Preciso primeiro identificar a **chave exata** do campo personalizado no Pipedrive. Isso pode ser feito:
1. Buscando a lista de campos personalizados via API `/dealFields`
2. Ou verificando a resposta de um deal que tenha esse campo preenchido

Após identificar a chave, a implementação seguirá normalmente.
