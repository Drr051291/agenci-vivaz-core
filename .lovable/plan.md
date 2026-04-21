
# Otimização das Reuniões — Visual + Integração com Atividades

Vou simplificar a estrutura das reuniões e transformar o **Plano de Ação** em um workspace visual estilo Monday/ClickUp/Notion, totalmente integrado ao módulo de Atividades.

## O que muda no editor de reuniões

**Seções removidas / simplificadas:**
- ❌ **Diagnóstico estruturado** (tags + contexto + solução) — removido do template padrão
- ✏️ **Resumo Executivo** — vira **um único campo** de texto rico (em vez das 3 listas: destaques / vitórias / riscos)

**Seções mantidas:** Abertura (Objetivo + Contexto), KPIs, Desempenho por Canal, Plano de Ação (redesenhado), Dúvidas e Discussões, Tasks.

## Plano de Ação redesenhado (o coração da mudança)

Substituo a lista atual por um workspace com **3 visualizações alternáveis** no mesmo bloco:

```text
┌─────────────────────────────────────────────────────────────┐
│  Plano de Ação    [+ Nova task] [🔗 Vincular existente]    │
│  [Lista]  [Kanban]  [Timeline]              3/8 concluídas │
├─────────────────────────────────────────────────────────────┤
│  KANBAN ▼                                                   │
│  ┌──────────┐ ┌──────────────┐ ┌─────────────┐             │
│  │Pendente 3│ │Em andamento 2│ │Concluído 3 │             │
│  ├──────────┤ ├──────────────┤ ├─────────────┤             │
│  │🔴 Card   │ │🟡 Card       │ │✅ Card      │             │
│  │ Meta Ads │ │ Criar arte   │ │ Aprovar bri │             │
│  │ 👤 João  │ │ 👤 Ana       │ │ 👤 Vivaz    │             │
│  │ 📅 25/04 │ │ 📅 28/04     │ │             │             │
│  └──────────┘ └──────────────┘ └─────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

**Cada card mostra:** título, responsável (avatar), prazo (com cor se atrasado), prioridade (cor lateral), categoria (badge), dono (Vivaz/Cliente).

**Visualizações:**
- **Lista** — agrupada por Vivaz/Cliente, com checkbox de status inline
- **Kanban** — colunas Pendente / Em andamento / Concluído com **drag & drop**
- **Timeline** — linha do tempo horizontal por prazo (semana/mês)

## Integração com Atividades (Tasks)

Cada item do Plano vira uma linha em `meeting_action_links` apontando para uma `task` real:

- **[+ Nova task]** — abre mini-form (título, responsável, prazo, prioridade, categoria) → cria registro em `tasks` + link em `meeting_action_links`
- **[🔗 Vincular existente]** — popover de busca em tasks já cadastradas do cliente → cria apenas o link
- Mudar status no card do plano → atualiza a task real (e vice-versa, por realtime)
- Card tem botão **"Abrir task"** que leva ao TaskDetailDialog completo (briefing, comentários, anexos)
- Excluir do plano → opção: "remover do plano" ou "remover do plano e deletar task"

## Aplicação a todos os clientes

- O novo template é o **default** em qualquer reunião nova (qualquer cliente, presente ou futuro) — não precisa configurar por cliente
- **Reuniões existentes ficam como estão** (somente leitura no formato antigo) — o `MeetingPresentationView` detecta `template_version` e renderiza o layout correspondente
- Novas reuniões salvam `template_version = 'v2'`

## Apresentação ao cliente (área do cliente + link público)

O `MeetingPresentationView` ganha o mesmo bloco visual (somente leitura): o cliente vê o Kanban/Timeline/Lista do Plano com os mesmos cards ricos, sem permissão de editar. Status reflete em tempo real conforme a equipe Vivaz atualiza as tasks.

---

## Detalhes técnicos

**Banco (1 migration):**
- Reaproveitar `meeting_action_links` (já existe: `meeting_id`, `task_id`, `action_item jsonb`, `is_task_created`)
- Adicionar coluna `sort_order int` e `view_mode text default 'kanban'` (preferência por reunião) em `meeting_sections` (metadata)
- Habilitar Realtime em `tasks` e `meeting_action_links`

**Frontend novos componentes (`src/components/meetings/v2/action-plan/`):**
- `ActionPlanWorkspace.tsx` — wrapper com tabs Lista/Kanban/Timeline + toolbar
- `ActionPlanKanban.tsx` — drag & drop usando `@dnd-kit/core` (já leve, sem nova dep pesada)
- `ActionPlanTimeline.tsx` — barras horizontais por data (CSS grid)
- `ActionPlanList.tsx` — refator do `ActionPlanSection` atual, agrupado por owner
- `ActionCard.tsx` — card visual reutilizado nas 3 visualizações
- `LinkExistingTaskPopover.tsx` — busca de tasks do cliente
- `QuickCreateTaskForm.tsx` — form compacto reutilizando lógica de `SendToTasksButton`

**Hooks:**
- `useMeetingActionPlan(meetingId, clientId)` — carrega links + tasks (join), expõe CRUD e sincroniza via Realtime

**Arquivos atualizados:**
- `MeetingEditor.tsx` — remove seção de Diagnóstico, simplifica Resumo Executivo, troca `MeetingActionPlan` por `ActionPlanWorkspace`
- `MeetingPresentationView.tsx` — renderiza o novo workspace em modo read-only quando `template_version = 'v2'`; mantém render legado caso contrário
- `ClientMeetingView.tsx` — passa a buscar dados via `useMeetingActionPlan` para visualização do cliente
- `DEFAULT_SECTIONS` no editor — remove `diagnosisItems`, simplifica `executiveSummary` para string única

**Compatibilidade:**
- Reuniões com `template_version != 'v2'` continuam abrindo no layout antigo
- `actionPlanItems` legados (jsonb em `meeting_sections.action_plan`) continuam exibidos em modo read-only

**Dependência nova:** `@dnd-kit/core` + `@dnd-kit/sortable` (~15kb, padrão do ecossistema React para Kanban)
