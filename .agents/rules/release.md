# Release process — Projeto Pequi

Este documento descreve o **processo de release** (versionamento do artefato, changelog, tags e merges) do repositório Pequi.

Para o modelo de ramos, nomes de branches e commits, veja **[gitflow.md](./gitflow.md)**. Para stack, testes e CI/CD em alto nível, veja **`AGENTS.md`** na raiz do repositório.

---

## Prerequisites

- Funcionalidades do release estão integradas em **`develop`** (ou branch de integração acordada pelo time).
- **Testes e lint** passando no branch de integração (`scripts/run_tests.sh`; alinhado ao CI quando `ci.yml` / `tests.yml` estiverem ativos).
- Permissão de escrita no repositório e acesso para criar tags.
- Familiaridade com [Semantic Versioning](https://semver.org/) e [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
- **Migrações:** antes de liberar produção, garantir que o script de deploy aplique **`alembic upgrade head`** (conforme `AGENTS.md`).

---

## Dois tipos de “versão” (não confundir)

| O quê | Onde | Regra |
|--------|------|--------|
| **Versão do pacote / release** | `pyproject.toml` (`[project].version`), tag Git `vX.Y.Z` | **SemVer** `MAJOR.MINOR.PATCH` para o produto entregue neste repo (backend monólito na raiz). |
| **Versão da API HTTP** | Prefixos `/v1/`, `/v2/` nas rotas | Governado por `AGENTS.md`: mudanças incompatíveis exigem nova versão de API; coordenação com mobile; não remover `/v1` sem plano. |

Um release `1.2.0` do pacote **não** substitui sozinho a política de `/v1` vs `/v2`.

---

## Version numbering (SemVer)

- **MAJOR** (`X.0.0`): mudanças incompatíveis na superfície **acordada** para o release (incluindo quebras de contrato de API se forem entregues neste ciclo — alinhar com mobile).
- **MINOR** (`0.X.0`): novas funcionalidades compatíveis com versão anterior.
- **PATCH** (`0.0.X`): correções compatíveis.

Exemplos:

- Novo endpoint opcional, sem quebrar clientes: `1.1.0` → `1.2.0` (minor).
- Correção de bug em regra existente: `1.2.0` → `1.2.1` (patch).
- Remoção de campo ou mudança de contrato com versão nova de API: pode implicar **MAJOR** do produto **e** incremento de versão de API (`/v2`), conforme planejamento.

---

## Release process

### Step 1: Create release branch

```bash
git checkout develop
git pull origin develop

git checkout -b release/X.Y.Z
```

Use `X.Y.Z` sem prefixo `v` no nome da branch (ex.: `release/1.2.0`), alinhado a [gitflow.md](./gitflow.md).

> Se o remoto do time usar outro nome para integração (ex.: `development`), use esse branch no lugar de `develop` após alinhar com o time.

### Step 2: Update version files

#### 2.1. `pyproject.toml` (raiz)

```toml
[project]
name = "pequi"
version = "X.Y.Z"   # atualizar
```

#### 2.2. `CHANGELOG.md`

Se ainda não existir na raiz, **crie** seguindo [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). Adicione no topo:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- …

### Changed
- …

### Fixed
- …

### Removed
- …
```

**Diretrizes:**

- Tempo verbal em inglês no estilo Keep a Changelog (ex.: “Add”, “Fix”) ou o padrão que o time adotar, **consistente** no arquivo.
- Destacar mudanças visíveis a operação, integrações e mobile; refator interno só se relevante para release notes.
- Referenciar PRs quando útil: `(#123)`.
- Incluir itens de **segurança/LGPD** quando aplicável (sem dados sensíveis no texto).

**Coletar mudanças:**

```bash
git log --oneline vA.B.C..HEAD          # última tag para HEAD
git log --oneline --grep="Merge pull request" vA.B.C..HEAD
```

(Ajuste `vA.B.C` para a última tag publicada.)

### Step 3: Commit release preparation

```bash
git add pyproject.toml CHANGELOG.md
git commit -m "chore: prepare release X.Y.Z"
git push -u origin release/X.Y.Z
```

Inclua outros arquivos só se forem parte explícita do “congelamento” do release (ex.: bump de versão em doc gerada).

### Step 4: Testing and review

- Abrir **PR** de `release/X.Y.Z` → **`main`** (fluxo de aprovação do time).
- Garantir **CI verde** (lint, testes) conforme workflows em `.github/workflows/` e `AGENTS.md`.
- Aprovações necessárias antes do merge final.
- Merge para `main` costuma ser o gatilho de **deploy** descrito em `AGENTS.md` (`deploy.yml` em push para `main`); confira o YAML real do repositório — o template em `AGENTS.md` pode divergir até a infra estar finalizada.

### Step 5: Merge to `main` and tag

Após aprovação (local ou via merge do PR no GitHub):

```bash
git checkout main
git pull origin main

git merge --no-ff release/X.Y.Z

git tag -a vX.Y.Z -m "Release X.Y.Z

Resumo:
- …
"

git push origin main
git push origin vX.Y.Z
```

### Step 6: Merge back to `develop`

```bash
git checkout develop
git pull origin develop
git merge --no-ff release/X.Y.Z
git push origin develop
```

### Step 7: Cleanup

```bash
git branch -d release/X.Y.Z
git push origin --delete release/X.Y.Z
```

### Step 8: GitHub Release (recomendado)

1. Repositório → **Releases** → Draft a new release.
2. Escolher a tag `vX.Y.Z`.
3. Título sugerido: `Pequi vX.Y.Z`.
4. Corpo: copiar a seção `[X.Y.Z]` do `CHANGELOG.md`.

---

## What happens after release

- **`AGENTS.md`:** merge/push em **`main`** pode disparar **`deploy.yml`** (build/imagem/migrações conforme configurado no YAML real).
- **Sonar / build:** se existir workflow de análise ou build em `main`, consulte `.github/workflows/` (ex.: `build.yml`).
- **Produção:** seguir runbook interno; segredos apenas em GitHub Secrets / ambiente, nunca no repositório.

---

## Hotfix process

Correção urgente em produção — branch a partir de **`main`**, merge em **`main`** e **`develop`**, SemVer **PATCH**.

### Step 1: Branch

```bash
git checkout main
git pull origin main
git checkout -b hotfix/X.Y.Z
```

(`X.Y.Z` = próximo patch, ex.: `1.2.1`.)

### Step 2: Fix mínimo

```bash
git add …
git commit -m "fix: descrição curta do problema crítico"
```

### Step 3: Versão e changelog

- Atualizar `pyproject.toml` e `CHANGELOG.md` como no release.
- Commit: `chore: prepare hotfix X.Y.Z`

```bash
git push -u origin hotfix/X.Y.Z
```

### Step 4: Merge, tag, backport

```bash
git checkout main
git merge --no-ff hotfix/X.Y.Z
git tag -a vX.Y.Z -m "Hotfix X.Y.Z — …"
git push origin main --tags

git checkout develop
git merge --no-ff hotfix/X.Y.Z
git push origin develop

git branch -d hotfix/X.Y.Z
git push origin --delete hotfix/X.Y.Z
```

---

## Checklist (release)

- [ ] Integração em `develop` (ou equivalente) completa para o escopo do release
- [ ] `scripts/run_tests.sh` (e CI) ok
- [ ] Branch `release/X.Y.Z` criada
- [ ] `pyproject.toml` com versão `X.Y.Z`
- [ ] `CHANGELOG.md` atualizado
- [ ] Commit `chore: prepare release X.Y.Z`
- [ ] PR para `main` revisado e aprovado
- [ ] Merge `--no-ff` em `main`
- [ ] Tag anotada `vX.Y.Z` enviada ao remoto
- [ ] Merge de volta em `develop` e push
- [ ] Branches de release removidas (local e remoto)
- [ ] GitHub Release publicado (opcional mas recomendado)
- [ ] Deploy/migrações verificados conforme runbook
- [ ] Time comunicado; mobile avisado se houver mudança de API

---

## Troubleshooting

### Conflitos de merge

```bash
git status
# resolver arquivos, depois:
git add .
git commit   # conclui o merge
```

### Tag já existente

Só corrigir tag **antes** de qualquer consumo em produção:

```bash
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z
git tag -a vX.Y.Z -m "…"
git push origin vX.Y.Z
```

### Falha de deploy ou CI

- Ver logs em **GitHub Actions** do repositório.
- Conferir `Dockerfile`, variáveis de ambiente e `alembic` conforme `AGENTS.md`.

---

## References

- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [gitflow.md](./gitflow.md) — ramos e convenções Pequi
- **`AGENTS.md`** — CI/CD, testes, API `/v1`, Docker, migrações
