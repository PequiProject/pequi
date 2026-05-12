# Contexto do agente — fluxo de trabalho (Pequi)

Este arquivo define **como o agente deve conduzir cada implementação ou atualização** no repositório. É a ponte entre o conhecimento amplo do projeto e o **processo obrigatório** no dia a dia.

**Fontes canônicas (ordem de leitura quando houver dúvida):**

1. `AGENTS.md` — stack, camadas, testes, CI/CD, Bruno, LGPD, armadilhas.
2. `.agents/rules/` — políticas por tema (gitflow, testing, hooks, revisão, etc.).
3. `.agents/workflows/` — **playbooks passo a passo**; quando o tipo de tarefa cair no escopo de um workflow, **seguir o arquivo correspondente** (não resumir de memória).

Regra Cursor resumida: `.cursor/rules/agents-context.mdc`.

---

## Workflows versionados (obrigatórios quando aplicável)

A pasta **`.agents/workflows/`** lista os playbooks. O índice atual está em **`.agents/workflows/README.md`**.

| Situação | Workflow a seguir |
|----------|---------------------|
| Abrir PR com `gh`, título `PEQ-*`, corpo no template do repo | **[`workflows/open-pr.md`](../workflows/open-pr.md)** (subagente `open-pull-request`) |

**Regras:**

- Antes de executar ações cobertas por um workflow, **abrir e seguir** o Markdown do workflow (seções e ordem).
- Se o README ganhar novas linhas na tabela, este documento não precisa listar cada nome aqui, mas o agente **deve** consultar o README sempre que for **fechar ciclo** (PR, release, triagem) para não perder um playbook novo.
- O README indica espelho em **`.cursor/agents/`** para o Cursor — ao editar um workflow na fonte `.agents/workflows/`, **manter o espelho alinhado** conforme a nota no README.

---

## Workflow geral — cada atualização de código ou contrato

Use este roteiro **sempre** que for implementar ou alterar comportamento relevante. Compacte passos só quando a mudança for trivial (ex.: typo em comentário) e isso for explícito na conversa.

### 1. Entender e alinhar

- Ler trechos relevantes de `AGENTS.md` (camadas, testes, API versionada, LGPD).
- Confirmar escopo com o pedido do usuário; se faltar base branch, ticket Jira ou critério de aceite, **perguntar** cedo.
- Verificar ramo e fluxo Git em **`.agents/rules/gitflow.md`** (feature/bugfix → `develop`, etc.).

### 2. Planejar antes de codar

- Identificar camadas tocadas (`routers` / `use_cases` / `services` / `repositories` / modelos / migrações).
- Garantir que a mudança **não viole** a cadeia de dependências do `AGENTS.md`.
- Se a mudança for grande ou ambígua, propor um plano curto (arquivos, ordem, riscos) e seguir.

### 3. Implementar no padrão do projeto

- Respeitar **`.agents/rules/python.md`** e **`.agents/rules/code-style.md`** (e regras Cursor em `.cursor/rules/` quando existirem).
- Novos endpoints: prefixo `/v1/`, dependências corretas, sem lógica de negócio em router ou SQL em service.
- Migrações: Alembic com `upgrade`/`downgrade`; revisar SQL; sem `CASCADE DELETE` em entidades clínicas (ver `AGENTS.md`).

### 4. Contrato e documentação de API

- Endpoint novo ou alterado: coleção **Bruno** em `bruno/<domínio>/` alinhada ao contrato real.

### 5. Testes e qualidade

- Seguir **`.agents/rules/testing.md`**: tipo certo (unit / integration / e2e), `scripts/run_tests.sh`, sem change-detectors frágeis, LGPD e fixtures seguras.
- Seguir **`.agents/rules/hooks.md`**: Ruff (`uv run ruff check`, format) e, quando existir, pre-commit.

### 6. Segurança e dados sensíveis

- Para superfícies sensíveis, cruzar com **`.agents/rules/security.md`** e políticas LGPD do `AGENTS.md` (logs, Sentry, comunidade anonimizada, etc.).

### 7. Encerrar o ciclo (commit → PR)

- Commits: **`.agents/rules/commit-convention.md`** (Conventional Commits).
- Abrir PR: executar o playbook **`open-pr.md`** (passos completos: árvore limpa, template, confirmação do usuário antes de `gh pr create`).
- Revisão de PR: orientação em **`.agents/rules/code-review.md`** e **`.agents/rules/pull-request.md`** quando aplicável.

---

## Checklist rápido antes de considerar a tarefa “pronta”

- [ ] Mudança respeita arquitetura em camadas.
- [ ] Testes adequados rodando via `scripts/run_tests.sh` (quando houver código de produção tocado).
- [ ] Bruno atualizado se houver mudança de API pública.
- [ ] Ruff / formatação ok nos arquivos alterados.
- [ ] Sem PII nem segredos novos no repo; variáveis sensíveis só em env/secret store.
- [ ] Se houve PR: workflow `open-pr.md` seguido (incluindo confirmação explícita do usuário).

---

## Resumo

**Cada implementação** = entender → planejar → codar no padrão → Bruno (se API) → testes + lint/hooks → segurança → commits convencionais → **workflows em `.agents/workflows/`** quando o tipo de trabalho for o deles (hoje: abrir PR = `open-pr.md`). O README dos workflows é a lista viva do que existe; **não pular** playbooks por conveniência.
