---
name: pull-request
description: "Use this agent to create, review, and manage pull requests for the Pequi codebase. Enforces project standards, generates structured PR descriptions from commit history, and validates compliance with LGPD, architecture layers, and testing requirements."
tools: Read, Write, Edit, Bash, Glob, Grep
model: opus
---

# Pull Request — Pequi Project

> Comprehensive guide for creating and managing pull requests in the Pequi Project.
> Aligned with: GitFlow · Conventional Commits · AGENTS.md Architecture · LGPD/GDPR · Bruno API

---

## Philosophy

In a healthcare application handling sensitive clinical data, every pull request is a compliance checkpoint. A PR is not just a code review request — it is a traceable, auditable record that proves the change was validated against security, privacy, architecture, and testing standards before reaching patients. Every PR must answer: **what changed, why, and what guarantees it is safe.**

---

## PR Lifecycle

```
1. Pre-flight Checks (local validation)
   → 2. Context Gathering (understand the change)
      → 3. PR Creation (structured description)
         → 4. Review & Feedback Loop
            → 5. Merge & Cleanup
```

Never open a PR without running pre-flight checks. A PR that fails CI wastes reviewer time and delays the team.

---

## Step 1 — Pre-flight Checks

Before opening a PR, validate locally that all project standards are met.

### Automated Validation

```bash
# 1. Ensure branch is up to date with target
git checkout develop
git pull origin develop
git checkout feature/42-checkin-idempotency
git rebase develop

# 2. Run full test suite
scripts/run_tests.sh

# 3. Lint and format
uv run ruff check .
uv run ruff format --check .

# 4. Check migration state (if applicable)
alembic current
alembic heads
# Must be exactly ONE head

# 5. Docker stack smoke test (for integration changes)
docker compose up -d
alembic upgrade head
```

### Manual Pre-flight Checklist

- [ ] All commits follow Conventional Commits format (`feat:`, `fix:`, `chore:`, etc.)
- [ ] No personal data (CPF, patient name, coordinates) in code, logs, or commit messages
- [ ] No hardcoded credentials or production URLs
- [ ] No `print()` statements left for debugging — use `structlog` only
- [ ] `.env.example` updated if new environment variables were added

---

## Step 2 — Context Gathering

Understand the full scope of changes before writing the PR description.

### Automated Context Collection

```bash
# Changes summary
git diff --stat develop..HEAD

# Commit history for this branch
git log --oneline develop..HEAD

# Files changed by layer
git diff --name-only develop..HEAD | grep "^src/pequi/routers/"
git diff --name-only develop..HEAD | grep "^src/pequi/use_cases/"
git diff --name-only develop..HEAD | grep "^src/pequi/services/"
git diff --name-only develop..HEAD | grep "^src/pequi/repositories/"
git diff --name-only develop..HEAD | grep "^src/pequi/models/"
git diff --name-only develop..HEAD | grep "^src/pequi/schemas/"
git diff --name-only develop..HEAD | grep "^alembic/versions/"
git diff --name-only develop..HEAD | grep "^tests/"
git diff --name-only develop..HEAD | grep "^bruno/"
```

### Layer Impact Analysis

Identify which architectural layers are affected to determine review requirements:

| Layer Affected | Additional Review Required |
|---|---|
| `routers/` | Verify rate limits, status codes, Bruno file |
| `use_cases/` | Verify orchestration order, error handling |
| `services/` | Verify business logic, unit tests |
| `repositories/` | Verify soft delete, N+1 queries, SQL injection safety |
| `models/` | Verify migration, no `CASCADE DELETE`, `downgrade()` |
| `schemas/` | Verify Pydantic validation, API contract compatibility |
| `core/auth.py` or `core/security.py` | Mandatory `security-review` agent |
| `integrations/` | Verify env vars, error handling, retry logic |
| `workers/` | Verify idempotency, failure handling, Redis queue |

---

## Step 3 — PR Creation

### Target Branch Rules

| Source Branch | Target Branch | When |
|---|---|---|
| `feature/*` | `develop` | Normal feature development |
| `bugfix/*` | `develop` or `release/*` | Bug fixes |
| `release/*` | `main` | Release finalization |
| `hotfix/*` | `main` | Emergency production fix |

**Never open a PR directly to `main` from a feature branch.**

### PR Title Format

Follow Conventional Commits format for the PR title:

```
<type>(<scope>): <description>

# Examples:
feat(checkin): add idempotency key to prevent duplicates
fix(adherence): correct percentage calculation rounding
chore(deps): update SQLAlchemy to 2.0.31
docs(api): update Bruno collection for body-map endpoints
refactor(community): extract anonymous ID mapping to service
```

### PR Description

Use the template at `resources/pr-template.md`. The description must include:

1. **Summary** — What changed and why (link to issue)
2. **Type of Change** — Feature, bugfix, refactor, etc.
3. **Architecture Compliance** — Which layers are affected, dependency chain respected
4. **Database Changes** — Migrations, soft delete, no cascade delete
5. **Privacy & LGPD** — No PII exposure, audit logs, anonymous IDs
6. **Testing** — What was tested, how to reproduce
7. **API Contract** — Bruno files, versioning, rate limits
8. **Checklist** — Mandatory checkboxes that must all be checked

### Generating PR Description from Commits

```bash
# Extract structured information from commit history
git log --oneline develop..HEAD

# Example output:
# a1b2c3d feat(checkin): add idempotency key based on patient+date
# d4e5f6g test(checkin): add integration test for duplicate prevention
# g7h8i9j chore(migration): add unique constraint on checkins table
# k0l1m2n docs(bruno): update submit_checkin.bru with new response

# Map commits to PR sections:
# feat → Summary, Type of Change
# test → Testing section
# chore(migration) → Database Changes section
# docs(bruno) → API Contract section
```

---

## Step 4 — Review & Feedback Loop

### Review Requirements

| PR Type | Minimum Reviewers | Required Agents |
|---|---|---|
| Feature (new endpoint) | 1 developer | `code-review`, `testing` |
| Feature (auth/security) | 2 developers | `code-review`, `security-review` |
| Bug fix | 1 developer | `code-review`, `bug-investigation` |
| Hotfix (production) | 1 developer (fast-track) | `code-review`, `security-review` |
| Migration change | 1 developer + DBA/lead | `code-review`, `architecture-review` |
| Community feature | 1 developer | `code-review`, `security-review` |

### Responding to Review Feedback

```bash
# Address review comments with fixup commits
git commit --fixup=<original-commit-hash>

# Before merge, squash fixups
git rebase -i --autosquash develop
```

### Review Blockers

The following issues **block merge** — no exceptions:

| Blocker | Resolution |
|---|---|
| CI failing (`ci.yml` red) | Fix tests or lint errors |
| `CASCADE DELETE` on clinical entity | Replace with `ON DELETE RESTRICT` |
| Personal data in logs/Sentry | Remove PII, use UUIDs only |
| Missing `downgrade()` in migration | Implement the downgrade function |
| `user_id` exposed in community queries | Use `author_anonymous_id` only |
| Missing `.bru` file for new endpoint | Create Bruno API documentation |
| Missing rate limit on sensitive endpoint | Add `@limiter.limit(...)` |
| Missing `audit_logs` for patient data access | Add audit entry |
| `print()` left in code | Replace with `structlog` |
| Hardcoded credentials or production URLs | Move to environment variables |

---

## Step 5 — Merge & Cleanup

### Merge Strategy

```bash
# Use merge commit (--no-ff) to preserve branch history
git checkout develop
git merge --no-ff feature/42-checkin-idempotency

# Never use fast-forward merge on develop or main
# The merge commit provides a clear record of when the feature was integrated
```

### Post-merge Cleanup

```bash
# Delete the feature branch locally and remotely
git branch -d feature/42-checkin-idempotency
git push origin --delete feature/42-checkin-idempotency

# Verify develop still passes
git checkout develop
git pull origin develop
scripts/run_tests.sh
```

---

## PR Types — Specific Guidance

### Feature PR (New Endpoint)

Must include all 9 steps from AGENTS.md "Adding a new endpoint":

1. ✅ Pydantic schema in `schemas/`
2. ✅ Repository in `repositories/`
3. ✅ Business logic in `services/` (if needed)
4. ✅ Use case in `use_cases/`
5. ✅ Route in `routers/` with `/v1/` prefix
6. ✅ Rate limit with `@limiter.limit(...)` for sensitive endpoints
7. ✅ Unit + integration tests
8. ✅ Bruno file in `bruno/`
9. ✅ `audit_logs` entry if endpoint accesses patient data

### Bug Fix PR

Must include Bug Investigation Report (from `bug-investigation` skill):

```markdown
## Bug Investigation Report

**Symptom:** [What was observed]
**Affected Layer:** [Which files/layers]
**Root Cause:** [Why it happened]
**Applied Fix:** [What was changed]
**Added Tests:** [Test files that reproduce the bug]
**Impact:** [Breaking changes? Behavior changes?]
```

### Hotfix PR

- Target: `main` (not `develop`)
- Must include failing test before fix
- Must bump PATCH version in `pyproject.toml`
- Must back-merge to `develop` after merge to `main`
- Requires fast-track review (1 reviewer minimum)

### Migration PR

Additional requirements:

```bash
# Review generated SQL
alembic upgrade head --sql

# Verify downgrade works
alembic downgrade -1
alembic upgrade head
```

- No `CASCADE DELETE` on clinical entities
- `deleted_at TIMESTAMPTZ NULL` for soft delete (not `is_deleted boolean`)
- Both `upgrade()` and `downgrade()` implemented

### Community Feature PR

Additional privacy requirements:

- `user_id` never appears in public-facing queries
- Only `author_anonymous_id` in `community_posts` and `community_comments`
- `community_anonymous_map` access restricted to `admin` role
- Test verifying anonymous ID never exposes real user ID

---

## LGPD/GDPR Compliance in PRs

Every PR must be evaluated for privacy impact:

### Privacy Impact Assessment

| Question | If Yes → Action Required |
|---|---|
| Does this PR collect new personal data? | Update `consents` table, verify minimization |
| Does this PR log patient-related data? | Verify only UUIDs in structlog, no PII |
| Does this PR add Sentry context? | Verify `send_default_pii=False`, no name/CPF in extras |
| Does this PR expose data to the community? | Verify `anonymous_id` only, no `user_id` leaks |
| Does this PR modify `audit_logs`? | **BLOCKED** — audit_logs is append-only |
| Does this PR affect the `DELETE /v1/account` endpoint? | Verify right-to-erasure still works |
| Does this PR store images? | Verify MinIO/R2 only, no `bytea` in PostgreSQL |

---

## Automated PR Checks (CI Integration)

The following checks run automatically via `ci.yml` on every PR:

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
- **No PR can be merged with CI failing.** No exceptions.
- CI runs `ruff check`, `ruff format --check`, and the full test suite.
- Tests run against real PostgreSQL (PostGIS) and Redis — not SQLite mocks.

---

## Pitfalls — Don't Do

**Do not open a PR without running tests locally first.** A PR that fails CI on the first push wastes reviewer time and pollutes the CI queue.

**Do not put "WIP" PRs targeting `develop` or `main`.** Use draft PRs instead. A non-draft PR signals readiness for review.

**Do not squash commits before review.** Reviewers benefit from seeing the logical progression of changes. Squash only after approval, before merge.

**Do not include unrelated changes.** Each PR should address one concern. "While I was here, I also refactored..." belongs in a separate PR.

**Do not hardcode UUIDs from production in test code or PR descriptions.** Use factory-generated IDs and issue references only.

**Do not merge your own PR without review.** Even for small changes, at least one other team member must approve.

**Do not forget to update Bruno files.** A new endpoint without a `.bru` file is not "done" — it fails the PR checklist.

**Do not leave `TODO` comments without linking to an issue.** Every `TODO` must reference a GitHub issue number: `# TODO(#123): implement retry logic`.

---

## Integration with Other Agents

- **code-review**: Performs the technical review of PR changes.
- **security-review**: Mandatory for PRs touching `core/auth.py`, `core/security.py`, or community features.
- **bug-investigation**: Provides Bug Investigation Report format for bug fix PRs.
- **testing**: Validates test coverage and quality for new features.
- **gitflow**: Determines correct target branch and merge strategy.
- **release-manager**: Coordinates PRs on release branches.
- **conventional-commits**: Enforces commit message and PR title format.
- **architecture-review**: Reviews PRs that cross multiple architectural layers.

---

*Pull Request Skill — Pequi Project — version 1.0 — May 2026*
