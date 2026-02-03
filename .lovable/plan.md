

# Reestruturação do Relatório de Rastreamento de Campanhas

## Visão Geral

Você criou 3 novos campos personalizados no Pipedrive: **Campanha**, **Conjunto** e **Anuncio**. Vamos reestruturar todo o sistema de rastreamento para usar esses campos separados, removendo a lógica antiga de parsing de um único campo.

---

## O Que Vai Mudar

### Antes (Atual)
- Buscava um campo único chamado "Origem - Campanha / Conjunto / Criativo"
- Usava regras complexas de parsing com "/" e " - " como separadores
- Difícil de manter e propenso a erros

### Depois (Novo)
- Leitura direta dos 3 campos separados: `Campanha:`, `Conjunto:`, `Anuncio:`
- Sem parsing complexo - valores já vêm prontos do Pipedrive
- Visual mais claro com cards dedicados para cada dimensão

---

## Novo Design Visual

O relatório será redesenhado com uma estrutura mais clara e visual:

```text
+--------------------------------------------------+
|  Rastreamento de Campanhas                       |
|  [Fluxo do Período ▼]           12 negócios      |
+--------------------------------------------------+
|                                                  |
|  CAMPANHA                                        |
|  +--------------------------------------------+  |
|  | Nome da Campanha 1        ██████████ 8 (67%)|  |
|  | Nome da Campanha 2        ████       4 (33%)|  |
|  +--------------------------------------------+  |
|                                                  |
|  CONJUNTO DE ANÚNCIOS                            |
|  +--------------------------------------------+  |
|  | Conjunto A                ████████   6 (50%)|  |
|  | Conjunto B                ██████     4 (33%)|  |
|  | Conjunto C                ██         2 (17%)|  |
|  +--------------------------------------------+  |
|                                                  |
|  ANÚNCIO                                         |
|  +--------------------------------------------+  |
|  | Anúncio 01                ██████████ 6 (50%)|  |
|  | Anúncio 02                ████       4 (33%)|  |
|  | Anúncio 03                ██         2 (17%)|  |
|  +--------------------------------------------+  |
|                                                  |
|  [Total] [Lead] [MQL] [SQL] [Oportunidade]       |
+--------------------------------------------------+
```

### Melhorias Visuais
1. **Três seções verticais** - Uma para cada dimensão (Campanha, Conjunto, Anúncio)
2. **Barras horizontais coloridas** - Fácil visualização da proporção
3. **Contagem e percentual** - Exibidos ao lado de cada barra
4. **Filtro por etapa** - Mantém a capacidade de filtrar por Lead, MQL, SQL, etc.
5. **Toggle de visualização** - Período vs Cenário Atual

---

## Detalhes Técnicos

### 1. Edge Function (`pipedrive-proxy/index.ts`)

**Remover:**
- Função `getTrackingFieldKey()` - não mais necessária
- Função `parseTrackingField()` - não mais necessária

**Adicionar:**
- Função `getTrackingFieldKeys()` para buscar as 3 chaves dos campos personalizados
- Lógica simplificada que lê diretamente dos 3 campos

```typescript
// Nova estrutura para buscar as 3 chaves de campo
async function getTrackingFieldKeys(supabase, forceRefresh): Promise<{
  campaignKey: string | null;
  adsetKey: string | null; 
  creativeKey: string | null;
}>

// Processamento direto sem parsing
const campaign = deal[campaignKey] || 'Não informado';
const adset = deal[adsetKey] || 'Não informado';
const creative = deal[creativeKey] || 'Não informado';
```

**Funções afetadas:**
- `getCampaignTrackingData()` - Atualizar para usar os 3 campos
- `getCampaignTrackingSnapshotData()` - Atualizar para usar os 3 campos

### 2. Tipos (`types.ts`)

**Atualizar:**
```typescript
// Indicar que temos 3 campos separados
export interface CampaignTrackingData {
  by_campaign: Record<string, { total: number; by_stage: Record<number, number> }>;
  by_adset: Record<string, { total: number; by_stage: Record<number, number> }>;
  by_creative: Record<string, { total: number; by_stage: Record<number, number> }>;
  field_keys: {
    campaign: string | null;
    adset: string | null;
    creative: string | null;
  };
  all_stages?: StageInfo[];
  fetched_at?: string;
}
```

### 3. Componente Visual (`CampaignTrackingChart.tsx`)

**Redesign completo:**
- Layout em 3 seções verticais (Campanha, Conjunto, Anúncio)
- Cards individuais para cada dimensão
- Cores diferenciadas por seção
- Remoção das tabs de nível (agora todas visíveis simultaneamente)
- Manutenção do filtro por etapa do funil

**Nova estrutura de layout:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Rastreamento de Campanhas</CardTitle>
    <FilterTabs stages={stagesWithData} />
  </CardHeader>
  <CardContent>
    <div className="grid gap-4 md:grid-cols-3">
      <TrackingSection title="Campanha" data={campaignData} color="blue" />
      <TrackingSection title="Conjunto" data={adsetData} color="purple" />
      <TrackingSection title="Anúncio" data={creativeData} color="green" />
    </div>
  </CardContent>
</Card>
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/pipedrive-proxy/index.ts` | Substituir lógica de parsing por leitura direta dos 3 campos |
| `src/components/pipedrive-funnel/types.ts` | Atualizar interface `CampaignTrackingData` |
| `src/components/pipedrive-funnel/CampaignTrackingChart.tsx` | Redesign visual com 3 seções |

---

## Impacto

- **Ambos os pipelines** (Brandspot ID 9 e 3D ID 13) usarão a mesma lógica
- **Visão da agência** e **visão do cliente** verão o mesmo componente visual melhorado
- **Cache existente** será invalidado automaticamente na próxima requisição com `force: true`

---

## Resultado Esperado

Após a implementação:
1. Os leads com os campos preenchidos aparecerão corretamente no relatório
2. Cada dimensão (Campanha, Conjunto, Anúncio) terá sua própria visualização
3. Interface mais clara e profissional para análise de performance de mídia paga

