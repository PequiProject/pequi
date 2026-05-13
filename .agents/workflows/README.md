# Workflows e subagentes do projeto

Playbooks em Markdown com frontmatter YAML (`name`, `description`) usados como **subagentes** no Cursor. O mesmo conteúdo pode ficar referenciado em `.cursor/agents/` para o IDE carregar o agente automaticamente.

| `name` | Fonte no repositório | Uso |
|--------|----------------------|-----|
| `open-pull-request` | [`open-pr.md`](open-pr.md) | Abrir PR com `gh`, título `PEQ-*`, corpo alinhado ao template em `.github/pull_request_template.md`, confirmação explícita antes de criar. |
| `release-flow` | [`release-flow.md`](release-flow.md) | Orquestrar o ciclo de release completo: bump de versão em `pyproject.toml`, `CHANGELOG.md`, branch `release/X.Y.Z` ou `hotfix/X.Y.Z`, merge `--no-ff` em `main`, tag `vX.Y.Z`, GitHub Release via `gh`, backport em `develop` e cleanup. |

**Cursor:** cópias registradas em [`.cursor/agents/open-pull-request.md`](../../.cursor/agents/open-pull-request.md) e [`.cursor/agents/release-flow.md`](../../.cursor/agents/release-flow.md) — manter em sincronia com as fontes em `.agents/workflows/` ao editar os playbooks.
