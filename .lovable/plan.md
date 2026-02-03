

# Correção: Relatório de Setor Replicado entre Dashboards

## Problema Identificado

O relatório de Distribuição por Setor está mostrando os **mesmos dados** em ambos os dashboards (Brandspot e 3D) porque:

1. **Cache do campo de setor é compartilhado** - A função `getSectorFieldKey` usa um cache key único (`pipedrive_sector_field_key_v1`) para todos os pipelines. Isso faz com que, ao buscar o campo do 3D ("Qual o setor da sua empresa"), o sistema armazena esse valor no cache. Quando o Brandspot busca seu campo ("Segmento da sua empresa"), ele retorna o cache do 3D.

2. **Hook não reage à mudança de pipelineId** - O `useEffect` que busca os dados de snapshot não inclui `pipelineId` como dependência, então não refaz a busca quando muda de um dashboard para outro.

---

## Solução

### 1. Edge Function - Cache separado por pipeline

Alterar a função `getSectorFieldKey` para incluir o `pipelineId` no cache key:

```typescript
// ANTES
const cacheKey = 'pipedrive_sector_field_key_v1'

// DEPOIS  
const cacheKey = `pipedrive_sector_field_key_${pipelineId}_v2`
```

Isso garante que cada pipeline terá seu próprio cache de campo de setor.

### 2. Hook - Dependências corretas nos useEffects

Corrigir os `useEffect` para reagir às mudanças de `pipelineId`:

```typescript
// useEffect de snapshot - adicionar pipelineId como dependência
useEffect(() => {
  fetchSnapshotData();
}, [pipelineId]); // ← Agora reage a mudanças de pipeline

// useEffect de período - adicionar pipelineId como dependência  
useEffect(() => {
  // ... debounce logic
  debounceRef.current = setTimeout(() => {
    fetchData();
  }, 500);
  // ...
}, [dateRange.start.getTime(), dateRange.end.getTime(), pipelineId]); // ← Agora reage a mudanças de pipeline
```

### 3. Limpar cache antigo

Atualizar a versão do cache para `v2`, garantindo que o cache antigo (incorreto) seja ignorado.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/pipedrive-proxy/index.ts` | Passar `pipelineId` para `getSectorFieldKey` e incluir no cache key |
| `src/components/pipedrive-funnel/useSectorTracking.ts` | Adicionar `pipelineId` como dependência nos `useEffect` e limpar refs quando muda |

---

## Impacto

- **Brandspot** usará o campo "Segmento da sua empresa"
- **3D** usará o campo "Qual o setor da sua empresa"
- Cada dashboard terá seus próprios dados de setor
- O refresh forçará a busca correta do campo

