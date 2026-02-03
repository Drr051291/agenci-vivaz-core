

# Revisão do Relatório de Rastreamento de Campanhas - Brandspot

## ✅ Status: Implementado

A função `getTrackingFieldKeys` foi atualizada com:

### Melhorias Implementadas

1. **Busca com múltiplas variações de nome**:
   - Campanha: `Campanha`, `Campanha:`, `campanha`
   - Conjunto: `Conjunto`, `Conjunto:`, `conjunto`, `Conjunto de Anúncios`, `Conjunto de Anuncios`
   - Anuncio: `Anuncio`, `Anúncio`, `Anuncio:`, `Anúncio:`, `anuncio`, `anúncio`

2. **Logging detalhado** para diagnóstico:
   - Lista todos os campos personalizados encontrados no Pipedrive
   - Mostra qual variação de nome foi encontrada para cada campo
   - Indica claramente quando um campo não é encontrado

3. **Cache atualizado** (versão v3) para garantir que novas configurações sejam aplicadas

### Como Testar

1. No dashboard Brandspot, clique no botão de atualização forçada (force refresh)
2. Verifique os logs da Edge Function para ver quais campos foram encontrados
3. Se algum campo ainda não aparecer, os logs mostrarão exatamente como o campo está nomeado no Pipedrive

### Observação

Se muitos leads ainda aparecerem como "Não informado", significa que os campos personalizados no Pipedrive ainda não foram preenchidos para esses leads.
