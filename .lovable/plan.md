
# Remoção Completa da Integração Google Calendar

## Resumo

Esta alteração remove toda a funcionalidade de integração com Google Calendar do Hub Vivaz, incluindo a Edge Function, componentes de UI, hooks, rotas e tabelas do banco de dados.

---

## Arquivos a Excluir

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/google-calendar/index.ts` | Edge Function principal |
| `src/components/calendar/GoogleCalendarConnect.tsx` | Componente de conexão |
| `src/components/calendar/GoogleCalendarManager.tsx` | Gerenciador de eventos |
| `src/components/calendar/ImportEventsDialog.tsx` | Dialog de importação |
| `src/pages/GoogleCalendarCallback.tsx` | Página de callback OAuth |
| `src/hooks/useGoogleCalendar.ts` | Hook principal de integração |
| `src/hooks/useMeetingCalendarSync.ts` | Hook de sincronização de reuniões |

---

## Arquivos a Modificar

### 1. `src/App.tsx`
- Remover import do `GoogleCalendarCallback`
- Remover rota `/google-calendar/callback`

### 2. `src/components/client-details/ClientMeetings.tsx`
- Remover imports: `GoogleCalendarManager`, `useGoogleCalendar`, `useMeetingCalendarSync`
- Remover estados: `syncedMeetingIds`, `syncingAll`
- Remover função `fetchSyncedMeetings`
- Remover função `handleSyncAll`
- Remover lógica de `handleImportEvent` relacionada ao Google Calendar
- Remover lógica de `handleDeleteConfirm` relacionada ao Google Calendar
- Remover UI condicional `{isConnected && ...}` (botões de sincronização e gerenciador)
- Remover Badge de sincronização nos cards de reunião

### 3. `supabase/config.toml`
- Remover seção `[functions.google-calendar]`

---

## Alterações no Banco de Dados

### Migração SQL para remover tabelas

```sql
-- Remover tabela de eventos sincronizados
DROP TABLE IF EXISTS google_calendar_events;

-- Remover tabela de tokens
DROP TABLE IF EXISTS google_calendar_tokens;
```

---

## Impacto

- **Funcionalidade Removida**: Não será mais possível conectar, importar ou sincronizar eventos do Google Calendar
- **Reuniões**: Continuam funcionando normalmente, apenas sem a integração com calendário externo
- **Dados existentes**: Os tokens e referências de sincronização serão removidos do banco

---

## Etapas de Implementação

1. Excluir a Edge Function e deletar do Supabase
2. Remover arquivos de componentes e hooks
3. Atualizar `App.tsx` removendo rota e import
4. Atualizar `ClientMeetings.tsx` removendo toda lógica de Google Calendar
5. Atualizar `config.toml` removendo configuração da função
6. Executar migração SQL para remover tabelas do banco
