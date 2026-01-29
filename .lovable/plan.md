

## Duas Visualizações do Funil: Fluxo do Período vs Snapshot Atual

### Problema
Atualmente, o funil mostra os dados de forma misturada:
- "Leads no período" (176) = entrada de leads nos últimos 30 dias
- "X deals" por etapa = deals **ativos agora**, não do período

Isso causa confusão porque os números não "batem": 176 entraram, mas só 20 estão em Lead (os outros avançaram ou foram perdidos).

### Solução: Toggle/Tabs para Alternar Visualizações

Adicionar um seletor simples com duas opções:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Funil de Vendas (Pipedrive)         [Período ▼] [Atualizar]        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Fluxo do Período] [Snapshot Atual]  ← Toggle compacto             │
│                                                                     │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐    │
│  │  Lead   │ 69%  │   MQL   │  X%  │   SQL   │  X%  │  Oport. │    │
│  │176 leads│  →   │  X conv │  →   │  X conv │  →   │  X conv │    │
│  └─────────┘      └─────────┘      └─────────┘      └─────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Diferenças Entre as Duas Visualizações

| Aspecto | Fluxo do Período | Snapshot Atual |
|---------|------------------|----------------|
| **Pergunta** | "Quantos passaram por cada etapa nos últimos 30 dias?" | "Quantos estão em cada etapa agora?" |
| **KPI principal** | 176 leads entraram | Total de deals ativos |
| **Números nas etapas** | Fluxo/conversões do período | Deals abertos por etapa |
| **Conversões** | Taxa entre etapas (69%) | Não se aplica |
| **Uso** | Análise de performance de vendas | Gestão do pipeline atual |

### Mudanças Técnicas

**1. Novo tipo de visualização**
Adicionar prop `viewMode` ao componente `FunnelStepper`:
- `"period"` = Fluxo do período (padrão)
- `"snapshot"` = Snapshot atual

**2. Atualizar `FunnelStepper.tsx`**
- Receber `viewMode` e alternar exibição
- Para **Snapshot**: mostrar deals ativos, remover conversões entre etapas
- Para **Period**: manter visualização atual com conversões

**3. Atualizar `PipedriveFunnelDashboard.tsx`**
- Adicionar state `viewMode`
- Adicionar toggle ou tabs compactas acima do funil
- Passar `viewMode` para o componente

**4. Atualizar labels dinâmicamente**
- Period: "Leads no período: 176"
- Snapshot: "Deals ativos: [soma de todos]"

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `FunnelStepper.tsx` | Adicionar prop `viewMode`, lógica condicional para exibição |
| `PipedriveFunnelDashboard.tsx` | State de `viewMode`, toggle/tabs, passar para componente |
| `types.ts` | Adicionar tipo `ViewMode = 'period' \| 'snapshot'` |

### Resultado Visual

**Modo "Fluxo do Período"** (padrão):
- KPI: "176 leads entraram"
- Etapas: Nome + taxa de conversão entre elas
- Foco: Performance de conversão

**Modo "Snapshot Atual"**:
- KPI: "57 deals ativos" (soma de todos)
- Etapas: Nome + número atual de deals (20 em Lead, 15 em MQL, etc.)
- Foco: Gestão operacional do pipeline

