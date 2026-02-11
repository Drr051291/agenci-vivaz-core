
# Recriar Relatorio de Rastreamento de Campanhas

## Objetivo

Criar um relatorio limpo e focado que mostra, **por etapa do funil**, a distribuicao percentual de Campanha, Conjunto e Anuncio. O usuario seleciona uma etapa e ve de onde vieram os deals daquela etapa. Pipeline fixo: **3D Inbound (ID 13)**.

## Conceito da Interface

- Seletor de etapa no topo (tabs com as etapas do funil + "Todas")
- Ao selecionar uma etapa, exibe tres secoes lado a lado: **Campanha**, **Conjunto**, **Anuncio**
- Cada secao mostra uma lista rankeada com barra de progresso horizontal e percentual
- Os dados vem dos campos personalizados do Pipedrive (Campanha, Conjunto, Anuncios)
- Respeita o viewMode existente (Fluxo do Periodo / Cenario Atual)

## Mudancas Tecnicas

### 1. Reescrever `CampaignTrackingChart.tsx` (100% novo)

- Remover toda a logica de source (Landing Page, Base Setima, Lead Nativo) -- isso ja esta no `LeadSourceChart`
- Interface simplificada:
  - Tabs de etapas no topo
  - Grid 3 colunas: Campanha | Conjunto | Anuncio
  - Cada item: nome truncado + count + percentual + barra horizontal colorida proporcional
- Quando uma etapa e selecionada, filtra `by_stage[stageId]` para cada item
- Percentual calculado sobre o total da dimensao naquela etapa
- Top 10 itens por dimensao, ordenados por count decrescente
- Itens vazios ("Nao informado") agrupados no final

### 2. Sem mudancas na Edge Function

A logica do backend (`getTrk` no `pipedrive-proxy`) ja retorna `by_campaign`, `by_adset`, `by_creative` com `by_stage` por item. Os dados necessarios ja existem -- a mudanca e puramente visual/frontend.

### 3. Sem mudancas nos types ou hook

Os tipos `CampaignTrackingData`, `CampaignTrackingItem` e o hook `useCampaignTracking` permanecem inalterados.

## Layout Visual

```text
+----------------------------------------------------------+
| Rastreamento de Campanhas        12 negocios              |
+----------------------------------------------------------+
| [Todas] [Lead] [MQL] [SQL] [Oportunidade] [Contrato]     |
+----------------------------------------------------------+
| Campanha        | Conjunto         | Anuncio              |
|                 |                  |                       |
| Camp A  5 (42%) | Conj X  4 (33%) | Ad 1    3 (25%)      |
| ████████░░░░░░  | ██████░░░░░░░░  | █████░░░░░░░░░       |
|                 |                  |                       |
| Camp B  4 (33%) | Conj Y  3 (25%) | Ad 2    3 (25%)      |
| ██████░░░░░░░░  | █████░░░░░░░░░  | █████░░░░░░░░░       |
|                 |                  |                       |
| Camp C  3 (25%) | Conj Z  5 (42%) | Ad 3    6 (50%)      |
| █████░░░░░░░░░  | ████████░░░░░░  | ██████████░░░        |
+----------------------------------------------------------+
```

## Resumo

- **1 arquivo reescrito**: `src/components/pipedrive-funnel/CampaignTrackingChart.tsx`
- **0 arquivos de backend alterados**
- **0 tipos alterados**
- Visual limpo focado na pergunta: "de onde vieram os deals desta etapa?"
