# Workflows e subagentes do projeto

Playbooks em Markdown com frontmatter YAML (`name`, `description`) usados como **subagentes** no Cursor. O mesmo conteúdo pode ficar referenciado em `.cursor/agents/` para o IDE carregar o agente automaticamente.

| `name` | Fonte no repositório | Uso |
|--------|----------------------|-----|
| `open-pull-request` | [`open-pr.md`](open-pr.md) | Abrir PR com `gh`, título `PEQ-*`, corpo alinhado ao template em `.github/pull_request_template.md`, confirmação explícita antes de criar. |

**Cursor:** cópia registrada em [`.cursor/agents/open-pull-request.md`](../../.cursor/agents/open-pull-request.md) — manter em sincronia com `open-pr.md` ao editar o playbook.
