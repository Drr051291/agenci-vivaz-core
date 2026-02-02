
# Plano: Melhorias Visuais e Estruturais no Modulo Trilhas e Processos

## Resumo das Alteracoes

O objetivo e refinar o modulo tornando-o mais sobrio, elegante e visualmente coeso, alem de corrigir a estrutura da cadencia de contato e melhorar a disposicao dos elementos.

---

## 1. Renomear para "Trilhas e Processos" em Todos os Lugares

**Arquivos afetados:**
- `src/components/layout/DashboardLayout.tsx` - Menu lateral da agencia
- `src/pages/EducacaoProcessos.tsx` - Titulo e meta da pagina global
- `src/pages/ClientDetails.tsx` - Aba do cliente (ja esta como "Trilhas", manter)

**Alteracao:**
```text
Antes: "Educacao & Processos"
Depois: "Trilhas e Processos"
```

---

## 2. Visao Geral como Sumario Visual

**Arquivo:** `src/components/education/PlaybookSDRTab.tsx`

**O que sera feito:**
- Transformar a "Visao Geral" em um sumario interativo com cards visuais
- Criar tres blocos principais em destaque:
  1. **Funil de Vendas** - Visao interativa das etapas (ja existe, otimizar)
  2. **Atribuicoes do SDR** - Card resumido e clicavel
  3. **Cadencia de Contato** - Card resumido apontando para a secao completa

- Cada bloco sera um card com:
  - Icone
  - Titulo
  - Breve descricao
  - Indicador visual ou mini-preview
  - Acao de navegacao interna

---

## 3. Corrigir Fluxo da Cadencia de Contato

**Arquivo:** `src/components/education/ContactCadenceFlow.tsx`

**Problema atual:**
O fluxo apos "conseguiu contato" nao esta claro. A logica correta e:

**Fluxo corrigido:**

```text
MQL Qualificado
     |
     v
Dia 1: Ligacao + WhatsApp (se nao atender)
     |
     +----> CONSEGUIU CONTATO?
     |          |
     |   [SIM]  v  [NAO]
     |    +-------------+
     |    | OBRIGATORIO:|     +---> Dia 1: LinkedIn (pesquisar + convite)
     |    | - Retorno   |     |
     |    | - SQL       |     v
     |    | - Perdido   |   Dia 2: LinkedIn + WhatsApp call
     |    +-------------+     |
     |                        v
     |                  CONSEGUIU CONTATO?
     |                        |
     |                  [SIM] | [NAO]
     |                        |
     |            (mesmo fluxo)|---> Dias 3-4: Espera
     |                               |
     |                               v
     |                         Dia 5: Ultima tentativa
     |                               |
     |                         [SIM] | [NAO]
     |                               |
     +---------------------------+   v
                                 PERDIDO
```

**Alteracoes:**
- Reestruturar outcomes do "Dia 1 - Primeiro Contato" para mostrar que ao conseguir contato, ha duas opcoes OBRIGATORIAS: agendar retorno/SQL ou marcar perdido
- O fluxo so continua para dia 2+ se NAO conseguiu contato
- Ajustar visual do "decision" node para mostrar claramente as 3 opcoes (Retorno, SQL, Perdido)
- Simplificar cards mantendo informacao essencial

---

## 4. Otimizar Imagens do CRM (Carousel)

**Arquivo:** `src/components/education/PipedriveExamples.tsx`

**Problema atual:**
As imagens tem dimensoes muito diferentes, causando desproporcao visual.

**Solucao:**
- Adicionar uma "moldura" (frame) padronizada para as imagens
- Definir altura maxima fixa para o container do carousel
- Usar `object-contain` com background sutil para preencher espaco
- Adicionar sombra e borda para criar efeito de "janela de navegador"
- Controlar melhor o aspect-ratio

---

## 5. Paleta de Cores Mais Sobria e Elegante

**Arquivos afetados:**
- `ContactCadenceFlow.tsx`
- `FunnelExplainer.tsx`
- `PlaybookSDRTab.tsx`
- `PipedriveExamples.tsx`

**Alteracoes de cores:**

| Elemento | Antes | Depois |
|----------|-------|--------|
| Cards de etapa do funil | Gradientes coloridos variados | Tons de cinza com accent primary sutil |
| Badges de status | Cores vibrantes (verde, azul, amarelo) | Cores mais suaves e desaturadas |
| Backgrounds de secao | bg-primary/10, bg-blue-500/10 | bg-muted/30, bg-card |
| Bordas | Coloridas (border-blue-500/30) | Neutras (border-border, border-muted) |
| Icones | Cores variadas por tipo | Primary ou muted-foreground |
| Cards CRM | Cores por tipo (azul, roxo, teal) | Todos com mesmo estilo neutro |

**Paleta reduzida:**
- Primary (roxo Vivaz) para destaques importantes
- Muted/Card para backgrounds
- Foreground/muted-foreground para textos
- Verde sutil apenas para sucesso
- Vermelho sutil apenas para erros/perdido

---

## Arquivos a Serem Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/layout/DashboardLayout.tsx` | Renomear menu para "Trilhas e Processos" |
| `src/pages/EducacaoProcessos.tsx` | Renomear titulo e metas |
| `src/components/education/PlaybookSDRTab.tsx` | Refatorar Visao Geral como sumario, ajustar cores |
| `src/components/education/ContactCadenceFlow.tsx` | Corrigir fluxo de decisao, reduzir cores |
| `src/components/education/PipedriveExamples.tsx` | Adicionar moldura nas imagens, cores mais neutras |
| `src/components/education/FunnelExplainer.tsx` | Cores mais sobrias no funil |

---

## Secao Tecnica

### Estrutura da Nova Visao Geral (Sumario)

```text
[Titulo: Playbook SDR - Sumario]

+--------------------------------------------------+
|  [CARD 1]      [CARD 2]        [CARD 3]          |
|  Funil         Atribuicoes     Cadencia          |
|  de Vendas     do SDR          de Contato        |
|                                                   |
|  Mini-preview  Lista resumida  Timeline visual   |
|  5 etapas      4 pontos        5 dias           |
|                                                   |
|  [Ver etapas]  [Expandir]      [Ver fluxo]       |
+--------------------------------------------------+

[Secao expandida conforme navegacao]
```

### Nova Estrutura do ContactCadenceFlow

```text
CADENCE_STEPS = [
  { id: 'qualification', day: 0 },
  { id: 'day1-contact', day: 1, isDecision: true,
    outcomes: [
      { label: 'Conseguiu contato', nextStep: 'decision' },
      { label: 'Sem resposta', nextStep: 'day1-linkedin' }
    ]
  },
  { id: 'decision', day: 1, 
    // Este e o ponto de OBRIGATORIEDADE
    actions: [
      { label: 'Agendar Retorno', required: true },
      { label: 'Mover para SQL', required: true },
      { label: 'Marcar como Perdido', required: true }
    ]
    // Nao ha "sem resposta" aqui - uma dessas DEVE ser escolhida
  },
  { id: 'day1-linkedin', day: 1 }, // Continua apenas se sem contato
  { id: 'day2', day: 2, isDecision: true },
  { id: 'wait', day: 3 },
  { id: 'day5', day: 5, isDecision: true },
  { id: 'lost', day: 5, isFinal: true }
]
```

### Moldura para Imagens do CRM

```tsx
<div className="relative bg-muted/30 rounded-lg border shadow-sm p-2">
  <div className="bg-muted/50 rounded h-8 flex items-center px-3 gap-2 mb-2">
    <div className="flex gap-1.5">
      <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
      <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
    </div>
    <span className="text-xs text-muted-foreground">Pipedrive CRM</span>
  </div>
  <img src={image} className="w-full max-h-[350px] object-contain" />
</div>
```

---

## Resultado Esperado

1. Nome unificado "Trilhas e Processos" em toda a plataforma
2. Visao Geral funciona como sumario navegavel
3. Fluxo de cadencia corrigido com decisoes obrigatorias claras
4. Imagens do CRM com moldura elegante e dimensionamento adequado
5. Paleta de cores reduzida, mais profissional e coesa
6. Interface mais limpa e escaneravel
