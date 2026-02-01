
# Plano: Gráfico de Origem dos Leads por Etapa do Funil

## Objetivo
Criar uma nova visualização que mostra a distribuição dos leads por **origem** (Landing Page, Base Sétima, Lead Nativo) em cada etapa do funil do Pipedrive.

## Regras de Classificação

| Origem | Regra de Identificação |
|--------|------------------------|
| **Landing Page** | Título do deal contém `[Lead Site]` |
| **Base Sétima** | Deal possui a etiqueta (label) `BASE SETIMA` |
| **Lead Nativo** | Todos os demais (padrão) |

A ordem de verificação será: Landing Page > Base Sétima > Lead Nativo (fallback).

---

## Arquitetura da Solução

### 1. Backend (Edge Function)

**Arquivo:** `supabase/functions/pipedrive-proxy/index.ts`

Adicionar nova action `get_lead_source_tracking`:

1. **Buscar Labels do Pipeline**
   - Endpoint: `/v1/dealLabels`
   - Mapear `label_id` para `label_name`
   - Identificar o ID da label "BASE SETIMA"

2. **Buscar Deals com Campos Necessários**
   - Endpoint: `/v1/deals` (com paginação)
   - Campos necessários: `title`, `label_ids`, `stage_id`, `add_time`
   - Aplicar filtros de data e `DEALS_CREATED_AFTER`

3. **Classificar Cada Deal**
   ```text
   function classifyDealSource(deal, baseSétimaLabelId):
     if title contains "[Lead Site]":
       return "Landing Page"
     if label_ids includes baseSétimaLabelId:
       return "Base Sétima"
     return "Lead Nativo"
   ```

4. **Agregar por Origem e Etapa**
   - Estrutura retornada:
   ```text
   {
     by_source: {
       "Landing Page": { total: 45, by_stage: { 1: 20, 2: 15, 3: 10 } },
       "Base Sétima": { total: 12, by_stage: { 1: 8, 2: 4 } },
       "Lead Nativo": { total: 78, by_stage: { 1: 40, 2: 25, 3: 13 } }
     }
   }
   ```

### 2. Frontend (Novo Componente)

**Arquivo:** `src/components/pipedrive-funnel/LeadSourceChart.tsx`

- Gráfico de barras horizontais (similar ao LostReasonsChart)
- Cada barra representa uma origem com quantidade e percentual
- **Tabs por Etapa**: filtrar por etapa específica ou ver total
- Cores distintas para cada origem:
  - Landing Page: Azul (marketing digital)
  - Base Sétima: Roxo (relacionamento)
  - Lead Nativo: Verde (campanhas nativas)

### 3. Atualizações de Tipos e Hook

**Arquivo:** `src/components/pipedrive-funnel/types.ts`
- Adicionar interface `LeadSourceData`
- Adicionar tipo `LeadSource = 'Landing Page' | 'Base Sétima' | 'Lead Nativo'`

**Arquivo:** `src/components/pipedrive-funnel/useLeadSourceTracking.ts`
- Novo hook para buscar dados de origem dos leads

### 4. Integração no Dashboard

**Arquivo:** `src/components/pipedrive-funnel/PipedriveFunnelDashboard.tsx`
- Adicionar o novo componente `LeadSourceChart`

---

## Visualização Final

```text
┌─────────────────────────────────────────────────────────────┐
│ Origem dos Leads                                            │
├─────────────────────────────────────────────────────────────┤
│ [Total] [Lead] [MQL] [SQL] [...]     ← Tabs por etapa       │
│─────────────────────────────────────────────────────────────│
│                                                             │
│ Lead Nativo     ██████████████████████████████  78 (58%)    │
│ Landing Page    ███████████████                 45 (33%)    │
│ Base Sétima     █████                           12 (9%)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Etapas de Implementação

1. **Edge Function** - Implementar action `get_lead_source_tracking` com busca de labels e classificação
2. **Tipos TypeScript** - Adicionar interfaces para dados de origem
3. **Hook** - Criar `useLeadSourceTracking.ts`
4. **Componente** - Criar `LeadSourceChart.tsx`
5. **Dashboard** - Integrar no `PipedriveFunnelDashboard.tsx`
6. **Cache** - Usar mesma estratégia de cache TTL já existente

---

## Detalhes Técnicos

### Endpoint de Labels do Pipedrive

```text
GET /v1/dealLabels

Resposta esperada:
{
  "data": [
    { "id": "uuid-1", "name": "BASE SETIMA", "color": "blue" },
    { "id": "uuid-2", "name": "Outro Label", "color": "green" }
  ]
}
```

### Estrutura do Deal com Label IDs

```text
{
  "id": 123,
  "title": "[Lead Site] João da Silva",
  "stage_id": 45,
  "label_ids": ["uuid-1", "uuid-2"],
  "add_time": "2026-01-15T10:30:00Z"
}
```

### Lógica de Classificação

```text
1. Verificar título:
   - Se contém "[Lead Site]" → "Landing Page"

2. Se não for Landing Page, verificar labels:
   - Buscar ID do label "BASE SETIMA" (case-insensitive)
   - Se deal.label_ids inclui esse ID → "Base Sétima"

3. Fallback:
   - Retornar "Lead Nativo"
```

Esta funcionalidade permitirá analisar de forma clara a eficiência de cada canal de aquisição de leads em cada etapa do funil de vendas.
