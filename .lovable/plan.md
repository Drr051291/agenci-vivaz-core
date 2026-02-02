
# Plano: Dashboard de Funil para Pipeline 13 (3D)

## Objetivo
Criar uma cópia do dashboard do Pipeline 9 (Brandspot) para o Pipeline 13 (3D), seguindo exatamente as mesmas regras e visualizações. A solução será parametrizada para permitir reutilização e manutenção simplificada.

---

## Estratégia de Implementação

Em vez de duplicar todo o código, vamos **parametrizar** os componentes existentes para receber o `pipelineId` como prop. Isso garante que:
- Ambos os dashboards evoluam juntos em otimizações futuras
- Menor duplicação de código
- Manutenção centralizada

---

## Mudanças Necessárias

### 1. Atualizar Tipos e Constantes

**Arquivo:** `src/components/pipedrive-funnel/types.ts`

Adicionar configurações para múltiplos pipelines:

```text
PIPELINES = {
  brandspot: {
    id: 9,
    name: 'Brandspot',
    subtitle: 'serviços_b2b'
  },
  threeDimension: {
    id: 13,
    name: '3D',
    subtitle: 'pipeline_3d'  // Verificar nome real no Pipedrive
  }
}
```

### 2. Parametrizar Hooks

Modificar todos os hooks para receber `pipelineId` como parâmetro:

**`usePipedriveFunnel.ts`**
- Adicionar parâmetro `pipelineId: number`
- Usar este valor ao chamar a edge function

**`useCampaignTracking.ts`**
- Adicionar parâmetro `pipelineId: number`

**`useLeadSourceTracking.ts`**
- Adicionar parâmetro `pipelineId: number`

### 3. Parametrizar Dashboard Principal

**Arquivo:** `src/components/pipedrive-funnel/PipedriveFunnelDashboard.tsx`

Atualizar props:

```text
interface PipedriveFunnelDashboardProps {
  clientId: string;
  pipelineId: number;      // NOVO
  pipelineName?: string;   // NOVO: "Brandspot" ou "3D"
  pipelineSubtitle?: string; // NOVO
}
```

- O componente passará o `pipelineId` para todos os hooks
- Header exibirá o nome do pipeline dinamicamente

### 4. Atualizar DashboardList

**Arquivo:** `src/components/client-details/DashboardList.tsx`

Adicionar card para Pipeline 13 (3D) ao lado do card existente do Pipeline 9:

```text
{/* Cards de Funil - Sétima */}
{clientId === "c694df38-b4ec-444c-bc0d-8d8b6102b161" && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
    {/* Card Brandspot (Pipeline 9) */}
    <Card>
      <h3>Funil Brandspot</h3>
      <Badge>Pipeline ID 9</Badge>
      <Button onClick={() => openFunnel(9, 'Brandspot')}>
        Visualizar
      </Button>
    </Card>
    
    {/* Card 3D (Pipeline 13) */}
    <Card>
      <h3>Funil 3D</h3>
      <Badge>Pipeline ID 13</Badge>
      <Button onClick={() => openFunnel(13, '3D')}>
        Visualizar
      </Button>
    </Card>
  </div>
)}
```

### 5. Estado de Navegação

Atualizar estado do DashboardList para gerenciar qual pipeline está ativo:

```text
// Estado atual
const [showPipedriveFunnel, setShowPipedriveFunnel] = useState(false);

// Novo estado
const [activeFunnel, setActiveFunnel] = useState<{
  pipelineId: number;
  name: string;
  subtitle: string;
} | null>(null);
```

---

## Componentes Afetados

| Arquivo | Mudança |
|---------|---------|
| `types.ts` | Adicionar configuração de múltiplos pipelines |
| `usePipedriveFunnel.ts` | Adicionar param `pipelineId` |
| `useCampaignTracking.ts` | Adicionar param `pipelineId` |
| `useLeadSourceTracking.ts` | Adicionar param `pipelineId` |
| `PipedriveFunnelDashboard.tsx` | Adicionar props `pipelineId`, `pipelineName` |
| `DashboardList.tsx` | Adicionar card do Pipeline 13 e gerenciar navegação |

---

## Visualização Final

```text
┌─────────────────────────────────────────────────────────────┐
│ Dashboards do Cliente Sétima                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐   ┌─────────────────────┐         │
│  │ 🔵 Funil Brandspot  │   │ 🟣 Funil 3D         │         │
│  │ Pipeline ID 9       │   │ Pipeline ID 13      │         │
│  │ [Visualizar]        │   │ [Visualizar]        │         │
│  └─────────────────────┘   └─────────────────────┘         │
│                                                             │
│  ┌─ Dashboards Embarcados ──────────────────────┐          │
│  │  • Reportei Dashboard                        │          │
│  │  • Pipedrive Insights                        │          │
│  └──────────────────────────────────────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Considerações sobre Diferenças entre Pipelines

### O que será igual (compartilhado)
- Lógica de cálculo de conversão
- Visualização do funil (FunnelStepper)
- Gráfico de Motivos de Perda
- Gráfico de Rastreamento de Campanhas
- Sistema de comparação de períodos
- Filtros de data
- Toggle Período/Snapshot

### O que pode variar (específico de cada pipeline)
- **Etapas do funil**: A edge function já busca as etapas dinamicamente por pipeline
- **Labels/Etiquetas**: A lógica de "BASE SETIMA" é específica, mas o código é flexível
- **Origem dos Leads**: Depende das convenções de nomenclatura usadas no pipeline 13

### Notas sobre "Origem dos Leads"
A classificação atual usa:
1. `[Lead Site]` no título → Landing Page
2. Label `BASE SETIMA` → Base Sétima
3. Fallback → Lead Nativo

Se o pipeline 13 usar convenções diferentes, podemos adicionar configuração específica posteriormente. Por enquanto, assumimos as mesmas regras.

---

## Etapas de Implementação

1. **Tipos e Constantes** - Adicionar config de pipelines
2. **Hooks** - Parametrizar com `pipelineId`
3. **Dashboard** - Adicionar props de pipeline
4. **DashboardList** - Adicionar card do Pipeline 13
5. **Testes** - Validar ambos os dashboards funcionando

---

## Benefícios da Abordagem Parametrizada

- **Manutenção única**: Correções e melhorias aplicam-se automaticamente a ambos os pipelines
- **Escalabilidade**: Fácil adicionar novos pipelines no futuro
- **Consistência**: Garantia de que ambos os dashboards têm as mesmas funcionalidades
- **Menos código**: Sem duplicação de componentes ou hooks
