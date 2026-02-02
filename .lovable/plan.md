
# Plano: Melhorias no Modulo Educacao e Processos

## Resumo das Alteracoes

O objetivo e tornar o modulo de Educacao e Processos mais integrado e visualmente rico, adicionando-o como uma aba dedicada em todos os clientes e aprimorando o Playbook SDR com elementos interativos.

---

## 1. Nova Aba "Educacao" no Menu de Detalhes do Cliente

**O que sera feito:**
- Adicionar uma nova aba "Educacao" no componente `ClientDetails.tsx`
- Posicionar antes da aba "Financeiro" (entre Performance e Financeiro)
- A aba exibira o conteudo filtrado pelo cliente atual (global + especifico)

**Estrutura das abas apos a mudanca:**
```text
Visao Geral | Atividades | Reunioes | Dashboards | Performance | Educacao | Financeiro | Vivaz AI
```

---

## 2. Remover Card de Educacao do DashboardList (Setima e outros)

**O que sera feito:**
- Remover o card "Educacao & Processos" da listagem de dashboards em `DashboardList.tsx`
- Isso evita duplicidade, ja que agora existe uma aba dedicada
- O acesso sera exclusivamente pela nova aba do menu

---

## 3. Playbook SDR Interativo e Visual (Nova Versao)

**Novas Secoes e Componentes:**

### 3.1 Secao "Como Funciona o Funil" (Nova)
- Introducao explicativa sobre o funil de vendas SDR
- Diagrama visual interativo mostrando o fluxo Lead - MQL - SQL - Oportunidade - Contrato
- Cards clicaveis com animacoes de hover

### 3.2 Screenshots de Exemplo do Pipedrive
- Copiar as imagens enviadas para o projeto (`src/assets/pipedrive/`)
- Exibir em uma galeria/carousel dentro do Playbook
- Legendas explicativas para cada screenshot
- Indicadores visuais mostrando onde cada etapa aparece no CRM

### 3.3 Ferramenta Matriz de Performance Pro Embedada
- Nova secao "Simulador de Funil" integrada ao Playbook
- Versao simplificada/embedada da ferramenta de diagnostico
- Permite que o usuario visualize benchmarks e simule cenarios
- Inputs simplificados com resultados visuais imediatos

### 3.4 Elementos Visuais Aprimorados
- Funil com gradientes e animacoes de transicao
- Progress indicators para cada etapa
- Badges de status (Lead, MQL, SQL, etc.) com cores consistentes
- Tooltips informativos em cada elemento
- Accordions expandiveis para templates e objecoes
- Cards de checklist interativos com feedback visual

---

## Arquivos a Serem Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/ClientDetails.tsx` | Adicionar aba "Educacao" e componente correspondente |
| `src/components/client-details/DashboardList.tsx` | Remover card "Educacao & Processos" |
| `src/components/client-details/ClientEducation.tsx` | **Novo** - Wrapper para exibir PlaybookSDRTab filtrado por cliente |
| `src/components/education/PlaybookSDRTab.tsx` | Refatorar com nova estrutura visual e interativa |
| `src/components/education/FunnelExplainer.tsx` | **Novo** - Secao explicativa do funil com diagrama |
| `src/components/education/PipedriveExamples.tsx` | **Novo** - Galeria de screenshots do Pipedrive |
| `src/components/education/EmbeddedPerformanceMatrix.tsx` | **Novo** - Versao embedada do simulador |
| `src/assets/pipedrive/` | **Novo** - Diretorio com imagens de exemplo |

---

## Secao Tecnica

### Estrutura do Novo PlaybookSDRTab

```text
PlaybookSDRTab
  +-- FunnelExplainer (diagrama interativo + explicacao)
  +-- PipedriveExamples (galeria de screenshots)
  +-- InteractiveFunnelStages (etapas clicaveis - existente, aprimorado)
  +-- EmbeddedPerformanceMatrix (simulador embedado)
  +-- GlossarySection (definicoes - existente)
  +-- PlaybookSections (conteudo markdown - existente)
```

### Componente EmbeddedPerformanceMatrix

Versao simplificada da Matriz de Performance Pro com:
- Inputs apenas para: Leads, MQL, SQL, Oportunidades, Contratos
- Selector de setor (usando benchmarks existentes)
- Visualizacao de taxas de conversao vs benchmark
- Indicadores visuais de status (verde/amarelo/vermelho)
- Sem funcionalidades de salvar/exportar (apenas visualizacao)

### Imagens do Pipedrive

As imagens serao copiadas para `src/assets/pipedrive/` e importadas como modulos ES6 para garantir otimizacao e bundling adequado.

---

## Resultado Esperado

1. Todos os clientes terao acesso a aba "Educacao" no menu de detalhes
2. O Playbook SDR sera muito mais visual e interativo
3. Usuarios poderao ver exemplos reais do Pipedrive
4. A ferramenta de diagnostico estara embedada para analises rapidas
5. Experiencia unificada e consistente em toda a plataforma
