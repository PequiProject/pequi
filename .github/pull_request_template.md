# Pull Request — PEQ-02 | 06-04-2026

## Descrição

Este PR introduz **ordenação de tarefas por prioridade**, **indicadores visuais de prioridade** e refinamentos na **lógica de inferência de prioridade**, melhorando a forma como as tarefas são organizadas e exibidas tanto online quanto offline.

---

## Funcionalidades

- Implementada **ordenação por prioridade para tarefas abertas** via `SortOpenTasksByPriorityAndDue`
- Adicionado **novo módulo de prioridade** (`priority.go`) com lógica em nível de domínio
- Introduzido **sistema de inferência de prioridade** baseado em:
  - Nomes de listas de tarefas (ex: `Urgente`, `Importante`)
  - Prefixos de título (ex: `[!]` para urgente, `[*]` para importante)
- Definidos **níveis explícitos de prioridade**:
  - `TaskPriorityUrgent`
  - `TaskPriorityImportant`
  - `TaskPriorityNormal`
- Mantida a **ordenação de tarefas concluídas** via `SortDoneTasksForDisplay`

---

## Melhorias de TUI / UX

- Adicionados **indicadores visuais de prioridade**:
  - `! urgente`
  - `* importante`
- Atualizado o **display de legenda** para incluir os marcadores de prioridade
- **Ajuste dinâmico de cor de destaque** baseado na prioridade da tarefa
- Tarefas urgentes agora utilizam a **cor de erro do tema** para maior visibilidade
- Melhorada a **experiência de leitura das tarefas** com hierarquia mais clara

---

## Lógica de Prioridade

- A prioridade é **derivada (não nativa)** devido às limitações da API do Google Tasks
- Fontes de inferência:
  - **Palavras-chave no nome da lista** (ex: "urgente", "importante")
  - **Prefixos no título** (`[!]`, `[*]`)
- Utiliza utilitários padrão do Go:
  - `slices` para ordenação
  - `cmp` para comparações
  - `strings` para correspondência de palavras-chave

---

## Ajustes

- Removidas **palavras-chave de prioridade ambíguas** para reduzir falsos positivos:
  - `today`, `hoje`
  - `p0`, `p1`, `p2`
- Refinadas as listas de palavras-chave para melhorar a **precisão dos sinais**

---

## Integração

- Ordenação aplicada antes da mesclagem das listas de tarefas em `app.go`
- Avaliação de prioridade integrada ao **pipeline de renderização de tarefas**
- Ajustes de tema aplicados dinamicamente durante a renderização das listas

---

## Observações

- O sistema de prioridade é **baseado em convenção** e documentado no código
- Garante compatibilidade com as **limitações do Google Tasks**
- Melhora a usabilidade especialmente no **modo offline**
- Melhorias futuras podem incluir **regras de prioridade definidas pelo usuário**

---

## Checklist

- [ ] O código compila sem erros
- [ ] Testes foram adicionados ou atualizados
- [ ] A documentação foi atualizada
- [ ] Revisado por pelo menos um membro da equipe