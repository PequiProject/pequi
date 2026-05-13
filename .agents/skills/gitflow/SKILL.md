---
name: gitflow
description: "Use this agent to manage GitFlow branching workflows in the Pequi codebase. Handles release creation, hotfix flows, feature branching, and version management aligned with CI/CD pipelines."
tools: Read, Write, Edit, Bash, Glob, Grep
model: opus
---

# GitFlow — Pequi Project

> Branching strategy and release workflow guide for the Pequi Project.
> Aligned with: GitHub Actions CI/CD · Alembic Migrations · Docker · Conventional Commits

---

## Philosophy

Pequi is a healthcare application that handles sensitive clinical data. Every release must be traceable, reversible, and validated before reaching patients. GitFlow provides the structure to ensure that `main` is always production-ready, `develop` always reflects the latest approved work, and releases follow a predictable, auditable process.

---

## Branch Model

```
main          ← production (deployed via deploy.yml on merge)
  ↑
release/*     ← stabilization before prod (testing + final fixes)
  ↑
develop       ← integration branch (CI runs on every PR)
  ↑
feature/*     ← individual features or tasks
hotfix/*      ← emergency fixes branching from main
bugfix/*      ← non-emergency bug fixes branching from develop
```

### Branch Naming Conventions

| Branch Type | Pattern | Example |
|---|---|---|
| Feature | `feature/<issue>-<short-description>` | `feature/42-checkin-idempotency` |
| Bugfix | `bugfix/<issue>-<short-description>` | `bugfix/78-soft-delete-filter` |
| Release | `release/<semver>` | `release/1.3.0` |
| Hotfix | `hotfix/<semver>` | `hotfix/1.2.1` |

Rules:
- Always use lowercase with hyphens — no underscores, no camelCase.
- Always include the issue number when available.
- Release and hotfix branches use semantic versioning (`MAJOR.MINOR.PATCH`).

---

## The Release Lifecycle

### Overview

```
1. Start Release
   → 2. Stabilization (release branch)
      → 3. Pre-release Validation
         → 4. Finish Release (merge to main + tag)
            → 5. Post-release (back-merge to develop)
```

Never skip the stabilization phase. A release pushed directly from `develop` to `main` bypasses the safety net that protects patients.

---

## Step 1 — Start Release

### Prerequisites

Before starting a release, verify:

```bash
# 1. Ensure develop is up to date
git checkout develop
git pull origin develop

# 2. Ensure all CI checks pass on develop
# Check GitHub Actions: ci.yml must be green

# 3. Ensure no pending migrations conflict
alembic current
alembic heads
# There should be exactly one head — multiple heads indicate a merge conflict in migrations

# 4. Ensure Docker stack runs cleanly
docker compose up -d
alembic upgrade head
scripts/run_tests.sh
```

### Creating the Release Branch

```bash
# Determine the next version based on changes since last release
git log --oneline $(git describe --tags --abbrev=0)..HEAD

# Create the release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/1.3.0

# Push the branch
git push -u origin release/1.3.0
```

### Version Bumping

Update the version in `pyproject.toml`:

```toml
# pyproject.toml
[project]
name = "pequi"
version = "1.3.0"   # ← update this
```

Commit the version bump:

```bash
git add pyproject.toml
git commit -m "chore(release): bump version to 1.3.0"
```

### Semantic Versioning Rules for Pequi

| Change Type | Version Bump | Examples |
|---|---|---|
| Breaking API change (removed field, type change) | MAJOR (`1.x.x` → `2.0.0`) | Removed `symptom_ids` from `CheckinCreate`, changed `/v1/` to `/v2/` |
| New feature, additive change | MINOR (`1.2.x` → `1.3.0`) | New endpoint `/v1/body-map`, new optional field in response |
| Bug fix, no API change | PATCH (`1.2.0` → `1.2.1`) | Fixed soft delete filter, corrected adherence calculation |

Rules:
- Keep the previous API version (`/v1`) active for at least 2 sprints after launching a new one.
- Never remove `/v1` while the production mobile app still depends on it — coordinate with the frontend team.
- Hotfixes always bump PATCH.

---

## Step 2 — Stabilization

The release branch is for stabilization only. No new features allowed.

### Allowed Changes on Release Branch

| Allowed | Not Allowed |
|---|---|
| Bug fixes | New features |
| Documentation updates | Refactoring |
| Translation fixes | Dependency upgrades (unless security) |
| Test coverage improvements | ORM model changes (unless bug fix) |
| Configuration adjustments | New endpoints |

### Fix on Release Branch

```bash
# Fix a bug found during stabilization
git checkout release/1.3.0
git checkout -b bugfix/92-checkin-date-timezone

# Make the fix, commit with conventional commits
git commit -m "fix(checkin): correct timezone conversion for checked_in_at

The checked_in_at timestamp was stored in server timezone instead of UTC.
All timestamps must use UTC as defined in the project standard.

Closes #92"

# Open PR targeting the release branch (not develop)
# PR target: release/1.3.0
```

### Running Validation on Release Branch

```bash
# Full test suite
scripts/run_tests.sh

# Lint
uv run ruff check .
uv run ruff format --check .

# Migration check (dry run)
alembic upgrade head --sql

# Docker stack smoke test
docker compose up -d
alembic upgrade head

# Run Bruno API collections against local stack
# bruno/auth/login.bru
# bruno/checkin/submit_checkin.bru
# bruno/patient/get_profile.bru
```

---

## Step 3 — Pre-release Validation

### Checklist

Before merging the release branch to `main`:

- [ ] All CI checks pass on release branch (`ci.yml` green)
- [ ] Full test suite passes (`scripts/run_tests.sh`)
- [ ] `ruff check .` — no errors
- [ ] `ruff format --check .` — no differences
- [ ] `alembic upgrade head --sql` — reviewed migration SQL
- [ ] `pyproject.toml` version matches release branch name
- [ ] No personal data exposed in logs or Sentry (`send_default_pii=False`)
- [ ] Bruno API assertions pass against local stack
- [ ] Soft delete respected in all new/modified queries
- [ ] `community_anonymous_map` does not expose `user_id`
- [ ] All new endpoints have corresponding `.bru` files
- [ ] Rate limits defined for new sensitive endpoints
- [ ] `audit_logs` entries for new patient data access endpoints
- [ ] LGPD/GDPR compliance verified (no new PII collection without `consents` update)
- [ ] `downgrade()` implemented for all new migrations
- [ ] No `CASCADE DELETE` on clinical entities

### Review the Release

```bash
# See all changes in the release
git log --oneline develop..release/1.3.0

# See files changed
git diff --stat develop..release/1.3.0

# Review the generated migration SQL one more time
alembic upgrade head --sql
```

---

## Step 4 — Finish Release

### Merge to Main

```bash
# Merge release branch into main
git checkout main
git pull origin main
git merge --no-ff release/1.3.0 -m "release: merge release/1.3.0 into main"

# Tag the release
git tag -a v1.3.0 -m "Release v1.3.0

Changes:
- feat(checkin): add idempotency key for duplicate prevention
- feat(body-map): new body area history endpoint
- fix(adherence): correct percentage calculation rounding
- fix(community): filter soft-deleted posts from feed

Full changelog: https://github.com/org/pequi/compare/v1.2.0...v1.3.0"

# Push main and tags
git push origin main
git push origin v1.3.0
```

### Deploy Pipeline Trigger

Pushing to `main` triggers `deploy.yml` automatically:

```yaml
# .github/workflows/deploy.yml (reference)
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and push Docker image
        run: |
          docker build -t $IMAGE_TAG .
          docker push $IMAGE_TAG
      - name: Apply migrations
        run: alembic upgrade head
      - name: Deploy
        run: echo "configure deploy target"
```

Rules:
- Alembic migrations always run BEFORE the new container goes up in production.
- `deploy.yml` only triggers on `main` — never on feature branches.
- Secrets (API keys, production `DATABASE_URL`) are only in GitHub Secrets, never in code.

---

## Step 5 — Post-release (Back-merge)

### Merge Back to Develop

```bash
# Ensure develop has all release fixes
git checkout develop
git pull origin develop
git merge --no-ff main -m "chore: back-merge main (v1.3.0) into develop"

# Resolve any conflicts carefully
# Priority: develop changes take precedence for in-progress features
# Priority: main changes take precedence for version/config

git push origin develop

# Delete the release branch
git branch -d release/1.3.0
git push origin --delete release/1.3.0
```

### Post-release Verification

```bash
# Verify develop still builds and tests pass after back-merge
git checkout develop
scripts/run_tests.sh
uv run ruff check .
```

---

## Hotfix Flow

Hotfixes are emergency fixes that go directly to production from `main`.

### When to Use Hotfix

| Use Hotfix | Use Regular Bugfix |
|---|---|
| P0/P1 severity (data corruption, security) | P2/P3 severity (UX, cosmetic) |
| Production is broken | Bug exists but is not critical |
| Cannot wait for next release cycle | Can wait for next release |

### Hotfix Workflow

```bash
# 1. Branch from main
git checkout main
git pull origin main
git checkout -b hotfix/1.2.1

# 2. Apply the fix (with test — mandatory even in emergencies)
# Follow bug-investigation skill methodology

# 3. Bump patch version
# pyproject.toml: version = "1.2.1"
git commit -m "chore(release): bump version to 1.2.1"

# 4. Merge to main
git checkout main
git merge --no-ff hotfix/1.2.1 -m "hotfix: merge hotfix/1.2.1 into main"
git tag -a v1.2.1 -m "Hotfix v1.2.1 - fix critical checkin duplication"
git push origin main
git push origin v1.2.1

# 5. Back-merge to develop
git checkout develop
git merge --no-ff main -m "chore: back-merge main (v1.2.1) into develop"
git push origin develop

# 6. Delete hotfix branch
git branch -d hotfix/1.2.1
git push origin --delete hotfix/1.2.1
```

### Hotfix Rules

- **Always write a test first**, even under time pressure. A hotfix without a test is a guaranteed future regression.
- Never use `CASCADE DELETE` in clinical entities — even as a "quick fix".
- Never expose personal data in hotfix commits, PRs, or logs.
- Hotfix PRs must still pass CI (`ci.yml`) before merge.
- Document the hotfix in the Bug Investigation Report template (see `bug-investigation` skill).

---

## Feature Branch Flow

### Starting a Feature

```bash
# Always branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/42-checkin-idempotency
```

### Working on a Feature

Follow the layer pattern from AGENTS.md:

1. Create Pydantic schema in `schemas/`
2. Create or update repository in `repositories/`
3. Implement business logic in `services/` (if needed)
4. Create use case in `use_cases/`
5. Add route in `routers/` with `/v1/` prefix
6. Add rate limit with `@limiter.limit(...)` if endpoint is sensitive
7. Write unit + integration tests
8. Add `.bru` file in `bruno/`
9. Register in `audit_logs` if endpoint accesses patient data

### Committing on Feature Branch

Use Conventional Commits:

```bash
# Types: feat, fix, chore, docs, test, refactor, ci, style
git commit -m "feat(checkin): add idempotency key to prevent duplicates

Added unique constraint on (patient_id, DATE(checked_in_at)) to prevent
duplicate check-ins within the same day. Returns existing record on
duplicate submission instead of creating a new one.

Refs #42"
```

### Finishing a Feature

```bash
# Rebase on develop before opening PR
git checkout develop
git pull origin develop
git checkout feature/42-checkin-idempotency
git rebase develop

# Push and open PR targeting develop
git push -u origin feature/42-checkin-idempotency
# Open PR: feature/42-checkin-idempotency → develop
```

### Feature PR Checklist

- [ ] PR targets `develop` (never `main` directly)
- [ ] CI passes (`ci.yml` green)
- [ ] Tests written (unit + integration)
- [ ] `.bru` file added for new endpoints
- [ ] Rate limit defined for sensitive endpoints
- [ ] `audit_logs` for patient data access
- [ ] Migration has `upgrade()` and `downgrade()`
- [ ] No `CASCADE DELETE` on clinical entities
- [ ] No personal data in logs/Sentry
- [ ] Code review approved (see `code-review` skill)

---

## Migration Handling Across Branches

Alembic migrations require special care in GitFlow to avoid conflicts.

### Rules

```bash
# Generate migration from ORM model changes
alembic revision --autogenerate -m "add_body_area_history"

# ALWAYS review the generated file before committing
# Check: upgrade() AND downgrade() are both implemented

# Review the SQL that would be executed
alembic upgrade head --sql
```

### Avoiding Migration Conflicts

| Scenario | Problem | Solution |
|---|---|---|
| Two features add migrations | Multiple Alembic heads | Merge one first, then rebase the other and regenerate migration |
| Release branch has migration fix | Conflict on back-merge to develop | Resolve manually, then run `alembic upgrade head` to verify |
| Hotfix adds migration | Must go to main AND develop | Back-merge immediately to prevent divergence |

```bash
# If you have multiple heads (conflict)
alembic heads
# If more than one head:
alembic merge heads -m "merge_migration_heads"
```

### Migration Safety

- Never use `CASCADE DELETE` on clinical entities. A deleted `health_professional` must not delete all linked `checkins` and `prescriptions`. Use `ON DELETE RESTRICT`.
- Soft delete uses `deleted_at TIMESTAMPTZ NULL` — never mix with `is_deleted boolean`.
- Test migration in a clean environment before applying to staging/production.
- In production, always review generated SQL with `alembic upgrade head --sql` before running.

---

## CI/CD Integration

### Branch-CI Mapping

| Branch | CI Trigger | Deploy Trigger |
|---|---|---|
| `feature/*` | `ci.yml` on PR to `develop` | ❌ Never |
| `bugfix/*` | `ci.yml` on PR to `develop` or `release/*` | ❌ Never |
| `develop` | `ci.yml` on every merge | ❌ Never (integration only) |
| `release/*` | `ci.yml` on every push/PR | ❌ Optional staging deploy |
| `hotfix/*` | `ci.yml` on PR to `main` | ❌ Until merged to `main` |
| `main` | — | `deploy.yml` on every push ✅ |

### CI Pipeline (`ci.yml`)

```yaml
# .github/workflows/ci.yml (reference)
name: CI
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env:
          POSTGRES_USER: pequi
          POSTGRES_PASSWORD: pequi
          POSTGRES_DB: pequi_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
      redis:
        image: redis:7-alpine
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: uv sync
      - run: uv run ruff check .
      - run: uv run ruff format --check .
      - run: scripts/run_tests.sh
```

Rules:
- No PR can be merged with failing tests or broken lint.
- `deploy.yml` only triggers on `main` — never on feature branches.
- Secrets are only in GitHub Secrets, never in code.

---

## Quick Reference — Common Commands

```bash
# === FEATURE ===
git checkout develop && git pull origin develop
git checkout -b feature/<issue>-<description>
# ... work, commit, push ...
# Open PR → develop

# === START RELEASE ===
git checkout develop && git pull origin develop
git checkout -b release/<version>
# Bump version in pyproject.toml
git commit -m "chore(release): bump version to <version>"
git push -u origin release/<version>

# === FINISH RELEASE ===
git checkout main && git pull origin main
git merge --no-ff release/<version>
git tag -a v<version> -m "Release v<version>"
git push origin main && git push origin v<version>
git checkout develop && git merge --no-ff main
git push origin develop
git branch -d release/<version>
git push origin --delete release/<version>

# === HOTFIX ===
git checkout main && git pull origin main
git checkout -b hotfix/<patch-version>
# ... fix, test, bump version ...
git checkout main && git merge --no-ff hotfix/<patch-version>
git tag -a v<patch-version> -m "Hotfix v<patch-version>"
git push origin main && git push origin v<patch-version>
git checkout develop && git merge --no-ff main
git push origin develop
git branch -d hotfix/<patch-version>
git push origin --delete hotfix/<patch-version>
```

---

## Pitfalls — Don't Do

**Do not push directly to `main`.** All changes reach `main` through release or hotfix branches only. Direct pushes bypass CI validation and migration review.

**Do not merge feature branches into `main`.** Features go to `develop` via PR. From `develop`, they reach `main` only through a release branch.

**Do not create release branches from `main`.** Releases always branch from `develop`. Only hotfixes branch from `main`.

**Do not skip the back-merge.** After finishing a release or hotfix, always merge `main` back into `develop`. Skipping this causes divergence and future merge conflicts.

**Do not rebase `main` or `develop`.** These are shared branches — rebase only feature/bugfix branches. Rebasing shared branches rewrites history for all contributors.

**Do not delete tags.** Tags are immutable release references. If a release has a bug, create a new hotfix version — do not re-tag.

**Do not commit `.env` with real values.** Only `.env.example` goes to the repository. Secrets stay in GitHub Secrets and the production secret manager.

**Do not include personal data (CPF, patient name) in branch names, commit messages, or PR descriptions.** Use only UUIDs and issue references. LGPD/GDPR applies to all project artifacts.

---

## Integration with Other Agents

- **release-manager**: Coordinates the release lifecycle end-to-end.
- **conventional-commits**: Enforces commit message format on all branches.
- **code-review**: Reviews all PRs before merge to `develop` or `release/*`.
- **bug-investigation**: Provides methodology for fixes on release and hotfix branches.
- **security-review**: Mandatory review for hotfixes involving authentication or data exposure.
- **testing**: Validates test coverage before any branch merge.
- **pull-request**: Provides PR templates and merge checklists.
- **architecture-review**: Consulted when feature changes touch multiple layers.

---

*GitFlow Skill — Pequi Project — version 1.0 — May 2026*
