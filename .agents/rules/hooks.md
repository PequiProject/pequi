# Hooks — Projeto Pequi

Guia para desenvolvedores e agentes: **hooks locais (pre-commit, a adicionar)**, **Python (UV + Ruff)** e **comportamento de hooks ** quando aplicável.

Regra Cursor resumida: `.cursor/rules/hooks.mdc`.

---

## Pre-commit (planejado)

O repositório **ainda não** contém `.pre-commit-config.yaml`; o time deve adicioná-lo para unificar checagens antes do `git commit`.

**Quando o pre-commit existir, o padrão esperado para Python no Pequi será alinhado ao CI e ao `pyproject.toml`:**

- `ruff check` (lint) no código Python sob `src/` e `tests/` (e demais paths definidos no config).
- `ruff format` (formatação), em modo check no CI e aplicável no commit local.
- Hooks genéricos úteis: fim de linha, trailing whitespace, YAML/json válidos, se forem adotados.

**Regras:**

- Não documentar nem sugerir `git commit --no-verify` / `--no-verify` como rotina; só em exceção acordada com o time.
- Após adicionar o arquivo de configuração, instalar com `pre-commit install` e, uma vez, `pre-commit run --all-files` para limpar o histórico recente de violações.
- Manter a **mesma versão de Ruff** (ou faixa compatível) entre `pyproject.toml`, pre-commit e CI, para evitar divergência local vs pipeline.

**Até o pre-commit ser mergeado:** o agente e o desenvolvedor devem reproduzir manualmente o mesmo espírito das checagens (ver secção Python abaixo) antes de abrir PR.

---

## Python — o que rodar localmente

Stack: **UV** + **Ruff** (já no `pyproject.toml`).

Comandos equivalentes ao que o pre-commit provavelmente chamará:

```bash
uv run ruff check .
uv run ruff format --check .
```

Para corrigir formatação automaticamente:

```bash
uv run ruff format .
```

Testes continuam pelo wrapper oficial (paridade com CI):

```bash
scripts/run_tests.sh
```

**Regras para o agente:**

- Ao editar `.py`, assumir que o commit será barrado se Ruff ou testes falharem; preferir deixar o arquivo já formatado e sem novos avisos de lint nos arquivos tocados.
- Não introduzir dependência de hook que só exista na máquina de uma pessoa; tudo deve estar em `pyproject.toml` / `.pre-commit-config.yaml` / scripts versionados.

---

## Paridade com CI

Quando o workflow de CI estiver ativo, ele deve espelhar **Ruff + testes** (e o que mais for adotado). Qualquer novo hook no pre-commit que altere arquivos ou falhe no CI precisa de **entrada correspondente no CI** ou justificativa explícita (ex.: hook só local que não afeta o build).

---

## Hooks do agente (Cursor)

Tipos úteis no ecossistema Cursor (quando configurados no projeto):

- **PreToolUse:** validação ou ajuste de parâmetros antes de executar ferramentas.
- **PostToolUse:** pós-processamento (ex.: formatação após edição).
- **Stop:** verificação final ao encerrar uma sessão ou tarefa.

### Auto-accept de permissões

Usar com cautela; desabilitar em trabalho exploratório; evitar flags que ignorem políticas de segurança; preferir listas explícitas de ferramentas permitidas onde a ferramenta suportar.

### TodoWrite (tarefas do agente)

Usar para tarefas multi-etapa: progresso visível, granularidade adequada e detecção de passos fora de ordem ou requisitos mal interpretados.
