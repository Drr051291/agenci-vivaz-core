

## Consolidação do Funil de Vendas (Pipedrive)

### Problema Atual
A mesma informação do funil está sendo exibida três vezes:
- Cards de KPI (Leads, taxas de conversão)
- Visualização horizontal colorida do funil
- Tabela de detalhes expandível

### Solução Proposta
Criar **uma única visualização unificada** que combine todas as informações em um layout limpo e eficiente.

### Layout Consolidado

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Header: Funil de Vendas (Pipedrive)          [Período] [Atualizar] │
│  Pipeline: serviços_b2b (ID 9)                 Atualizado às HH:MM  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐    │
│  │  Lead   │ 69%  │   MQL   │  0%  │   SQL   │  0%  │  Oport. │... │
│  │176 deals│  →   │15 deals │  →   │ 2 deals │  →   │ 1 deal  │    │
│  └─────────┘      └─────────┘      └─────────┘      └─────────┘    │
│                                                                     │
│  [Detalhes do período ▼] (colapsável)                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Mudanças Técnicas

**1. Remover os KPI Cards (linha 115-148)**
- Os cards de conversão por etapa são redundantes
- O número de leads já aparece na primeira etapa do funil

**2. Atualizar o FunnelStepper para incluir:**
- **KPI destacado**: Total de leads no período (formato grande, à esquerda)
- **Visualização colorida**: Mantém as etapas com número de deals
- **Taxas de conversão**: Entre cada etapa (já existe)

**3. Manter o FunnelDetailsTable:**
- Permanece como seção colapsável para usuários que querem mais detalhes
- Informação complementar, não repetida

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `PipedriveFunnelDashboard.tsx` | Remover grid de KPI Cards; manter apenas FunnelStepper e Details |
| `FunnelStepper.tsx` | Adicionar KPI de "Total de Leads" integrado ao cabeçalho do funil |

### Resultado Visual
Uma interface limpa com:
- Header com filtros
- **Uma única Card** contendo:
  - Título + tooltip explicativo
  - KPI de "Total de leads no período" em destaque
  - Funil horizontal colorido com stages, deals e conversões
- Seção de detalhes colapsável (opcional)

