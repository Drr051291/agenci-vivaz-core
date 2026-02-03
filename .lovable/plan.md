

# Revisão e Ajuste do Relatório de Rastreamento de Campanhas - Brandspot

## Diagnóstico

Após análise dos logs e do código, identifiquei os seguintes problemas:

### 1. Campo "Anuncio" não encontrado
O sistema está buscando por `"Anuncio"` mas o campo pode estar cadastrado com nome diferente no Pipedrive:
- `"Anúncio"` (com acento)
- `"Anuncio:"` (com dois pontos)
- Outra variação

**Logs confirmam:**
```
creative: null  ← Campo não encontrado
```

### 2. Maioria dos leads sem dados
De 376 deals no período, apenas 1 tem campanha preenchida:
- 375 deals: "Não informado"  
- 1 deal: `[M][Lead][Nativo] - Brandspot`

Isso indica que os campos personalizados ainda não foram preenchidos na maioria dos leads no Pipedrive.

---

## Solução Proposta

### 1. Melhorar busca do campo "Anuncio"

Adicionar variações de busca para encontrar o campo:

```typescript
// Buscar "Anuncio" com múltiplas variações
const creativeVariations = ['Anuncio', 'Anúncio', 'Anuncio:', 'Anúncio:']
for (const variation of creativeVariations) {
  const key = findFieldKey(variation)
  if (key) {
    result.creative = key
    break
  }
}
```

### 2. Adicionar logging detalhado

Para diagnóstico, listar todos os campos encontrados no Pipedrive:

```typescript
// Mostrar todos os campos custom para debug
const customFields = fields.filter(f => f.key.length > 30) // Keys custom são longas
console.log('Custom deal fields:', customFields.map(f => ({ name: f.name, key: f.key.slice(0,10) })))
```

### 3. Limpar cache antigo

Invalidar o cache das tracking field keys ao fazer force refresh, garantindo que novas configurações sejam aplicadas.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/pipedrive-proxy/index.ts` | Melhorar busca de campos com variações de nomes e adicionar logs de diagnóstico |

---

## Impacto

- **Imediato**: O campo "Anúncio" será encontrado corretamente
- **Diagnóstico**: Logs mostrarão quais campos existem no Pipedrive
- **Dados**: Leads que já têm os campos preenchidos aparecerão corretamente

---

## Observação Importante

Se após a correção ainda aparecer muitos leads como "Não informado", significa que os campos personalizados precisam ser **preenchidos manualmente** no Pipedrive para cada lead. O sistema só pode mostrar dados que existem no CRM.

