

# Fix: Rastreamento de Campanhas duplicado no Dashboard 3D

## Problema Identificado

O campo "Campanha" no Pipedrive esta retornando valores como `[M][Lead][Nativo][Sétima] - Contínua/00 - Empregadores...` -- esse e o **campo legado** que concatenava campanha + conjunto + anuncio em um unico campo.

O usuario criou um grupo chamado **"UTM"** no Pipedrive com tres campos separados (Campanha, Conjunto, Anuncio), mas a funcao `getTK` nao esta os encontrando corretamente. O filtro atual (`grp.length >= 3`) provavelmente falha porque o grupo UTM pode ter menos de 3 campos retornados pela API, fazendo o sistema cair no fallback que pega o campo legado.

## Solucao

Ajustar a logica de `getTK` na Edge Function `pipedrive-proxy` para:

1. **Priorizar campos do grupo UTM** -- se existir qualquer campo no grupo UTM, buscar SOMENTE dentro dele (mudar `>= 3` para `> 0`)
2. **Adicionar log dos field keys encontrados** para diagnostico futuro
3. **Incrementar a cache key** para `tk6` para forcar refresh
4. **Limpar cache antigo** das campanhas para garantir dados limpos

## Detalhes Tecnicos

### Arquivo: `supabase/functions/pipedrive-proxy/index.ts`

Alterar a funcao `getTK` (linha 40):

**Antes:**
```typescript
const src = grp.length >= 3 ? grp : fds;
```

**Depois:**
```typescript
const src = grp.length > 0 ? grp : fds;
```

E incrementar cache key de `tk5` para `tk6`.

### Banco de dados

Executar limpeza de cache:
```sql
DELETE FROM pipedrive_cache 
WHERE key LIKE 'tk%' 
   OR key LIKE 'campaign_%';
```

Isso forcara o sistema a re-descobrir os campos UTM corretos e re-agregar os dados de campanha com os campos separados.
