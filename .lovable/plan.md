

# Correção: Hook de Setor não Reage Corretamente a Mudanças de Pipeline

## Problema Identificado

A Edge Function está funcionando corretamente após as correções (confirmado via curl - cada pipeline retorna dados diferentes). O problema está no hook `useSectorTracking.ts`:

1. **Estado stale** - Quando o usuário troca de dashboard, os dados antigos continuam sendo exibidos porque:
   - O `useEffect` que reseta os refs roda, mas os dados em `data` e `snapshotData` não são limpos
   - O usuário vê os dados do pipeline anterior enquanto o novo carrega

2. **Dependências de useCallback incorretas** - `fetchData` tem `data` como dependência, o que pode causar comportamento inesperado com closures

3. **useEffect sem dependência de função** - O `useEffect` para snapshot (linha 145-147) não inclui `fetchSnapshotData` como dependência

---

## Solução

### 1. Limpar dados imediatamente quando pipeline muda

Quando o `pipelineId` muda, devemos:
- Limpar `data` e `snapshotData` para evitar exibir dados do pipeline errado
- Resetar os refs de tracking

```typescript
// Reset state and refs when pipelineId changes
useEffect(() => {
  // Clear previous data immediately
  setData(null);
  setSnapshotData(null);
  
  // Reset fetch tracking refs
  lastFetchRef.current = '';
  snapshotFetchedRef.current = '';
}, [pipelineId]);
```

### 2. Remover `data` das dependências de useCallback

O `fetchData` não deve depender de `data` para evitar closures stale:

```typescript
const fetchData = useCallback(async (force = false) => {
  // ... logic
}, [dateRange.start.getTime(), dateRange.end.getTime(), pipelineId]);
// Removido: data
```

### 3. Adicionar fetchSnapshotData como dependência

```typescript
useEffect(() => {
  fetchSnapshotData();
}, [pipelineId, fetchSnapshotData]);
```

### 4. Verificar se está vazio ao invés de checar por estado anterior

```typescript
const fetchSnapshotData = useCallback(async (force = false) => {
  const snapshotKey = `${pipelineId}`;
  if (!force && snapshotFetchedRef.current === snapshotKey) {
    return; // Removido: && snapshotData
  }
  // ...
}, [pipelineId]); // Removido: snapshotData
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/pipedrive-funnel/useSectorTracking.ts` | Limpar estado ao trocar pipeline, corrigir dependências de useCallback/useEffect |

---

## Impacto

- Ao trocar de Brandspot para 3D (ou vice-versa), o gráfico mostrará um loading enquanto busca os novos dados
- Não haverá mais exibição de dados do pipeline errado
- Cada dashboard terá seus próprios dados de setor corretos

---

## Detalhes Técnicos

O problema fundamental era uma combinação de:

1. **Cache de backend correto** mas dados de frontend não sendo atualizados
2. **Closures de React** mantendo referências stale quando o pipelineId mudava
3. **Estados não limpos** ao trocar de pipeline, causando exibição de dados incorretos durante o carregamento

A correção garante que:
- O estado é limpo imediatamente quando o pipeline muda
- As funções de fetch são recriadas corretamente com os novos valores
- Os useEffects reagem apropriadamente às mudanças

