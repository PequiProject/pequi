---
name: bug-investigation
description: "Use this agent when you need to investigate, diagnose, and resolve bugs in the Pequi codebase. Follows a systematic methodology from symptom collection to root cause analysis and verified fix."
tools: Read, Write, Edit, Bash, Glob, Grep
model: opus
---

# Bug Investigation — Pequi Project

> Systematic guide for bug investigation in the Pequi Project codebase.
> Stack: Python · FastAPI · SQLAlchemy 2.0 · PostgreSQL · Redis · ARQ Workers

---

## Philosophy

Bug investigation is not trial and error. It is a forensic process: collecting evidence, formulating hypotheses, testing each one in isolation, and documenting the conclusion. In the context of Pequi — a healthcare system with sensitive clinical data — a misdiagnosed bug can impact real patients.

---

## Investigation Chain

```
1. Symptom Collection
   → 2. Bug Reproduction
      → 3. Layer Isolation
         → 4. Root Cause Analysis
            → 5. Fix Implementation
               → 6. Verification and Regression
                  → 7. Documentation
```

Never skip steps. The temptation to go straight to the fix is the number one cause of regressions.

---

## Step 1 — Symptom Collection

Before touching the code, gather all available information.

### Collection Checklist

| Information | Source | Mandatory |
|---|---|---|
| Error message / stack trace | Sentry, logs, terminal | ✅ |
| Affected endpoint | Bruno, HTTP logs, Sentry | ✅ |
| Environment (dev / staging / prod) | Reporter | ✅ |
| Steps to reproduce | Issue, Slack, report | ✅ |
| Frequency (always / intermittent) | Monitoring | ✅ |
| Last deploy / relevant commit | `git log`, CI/CD | ⚠️ |
| Involved patient data (UUID) | Logs — **never CPF/name** | ⚠️ |
| Mobile app version | User report | ⚠️ |

### Collection via structured logs

```python
# Search structlog logs for correlation
# Use only UUIDs — never personal data (LGPD/GDPR)
import structlog
logger = structlog.get_logger()

# Example search by request_id in the log
# grep -r "request_id=abc123" /var/log/pequi/
```

### Collection via Sentry

```python
# Check in Sentry — critical endpoints have alerts configured
# Monitored endpoints: /checkins, /auth/login, /doses
# Never expose personal data in Sentry (send_default_pii=False)

# Useful information from Sentry:
# - Breadcrumbs (sequence of events before the error)
# - Tags (environment, endpoint, user_uuid)
# - Full stack trace
# - Associated release/commit
```

---

## Step 2 — Bug Reproduction

A bug that is not reproducible cannot be fixed with confidence.

### Local Reproduction

```bash
# 1. Start the full stack
docker compose up -d

# 2. Apply migrations
alembic upgrade head

# 3. Reproduce via Bruno API or httpx
# Use Bruno collections in bruno/ as a base
```

### Reproduction via Test

**Always create a failing test before implementing the fix.** This ensures the bug does not return.

```python
# tests/integration/test_bug_<issue_number>.py
async def test_bug_1234_duplicate_checkin_on_timeout(db_session, patient_factory):
    """
    Bug #1234: Duplicate check-in when client retries after timeout.
    
    Reproduction:
    1. Patient sends check-in
    2. Client timeout before receiving response
    3. Client retries the same check-in
    4. Two records are created (incorrect behavior)
    
    Expected: idempotency — only one record.
    """
    patient = await patient_factory.create()
    use_case = SubmitCheckinUseCase(...)
    
    data = CheckinCreate(mood="ok", symptom_intensity=5, symptom_ids=[...])
    
    # First submission
    result1 = await use_case.execute(patient_id=patient.id, data=data)
    
    # Second submission (retried)
    result2 = await use_case.execute(patient_id=patient.id, data=data)
    
    # Must return the same check-in, not create a duplicate
    assert result1.id == result2.id
```

### Reproduction Rules

- Never use real patient data for reproduction. Use `patient_factory` or fixtures.
- Always reproduce in an environment as close to production as possible (real PostgreSQL, not SQLite).
- If the bug is intermittent, document the frequency and conditions that increase probability.
- For bugs in ARQ workers, check the Redis queue and worker logs separately.

---

## Step 3 — Layer Isolation

Pequi follows a strict dependency chain. Identify which layer the bug manifests in:

```
routers/ (HTTP)          → Validation, serialization, status code issues
  → use_cases/           → Orchestration, order of operations issues
     → services/         → Business logic, calculation issues
        → repositories/  → Queries, ORM, transaction issues
           → database.py → Connection, pool, deadlock issues
```

### Diagnosis by Layer

#### Router (HTTP)

```python
# Symptoms: wrong status code, malformed response, 422 Validation Error
# Tools: Bruno API, httpx.AsyncClient, request logs

# Verify input schema
from pequi.schemas.checkin import CheckinCreate
try:
    CheckinCreate.model_validate(suspect_payload)
except ValidationError as e:
    print(e.errors())  # Shows exactly which fields failed
```

#### Use Case (Orchestration)

```python
# Symptoms: partial operations, unexpected side effects
# Tools: debugger, logs, integration tests

# Verify execution order in the use case
# Example: alert generated BEFORE check-in is saved?
async def execute(self, patient_id, data):
    checkin = await self.checkin_repo.create(patient_id, data)  # 1st
    await self.alert_service.evaluate_after_checkin(checkin)     # 2nd — depends on (1)
    # If (1) fails, (2) should never execute
```

#### Service (Business Logic)

```python
# Symptoms: wrong calculations, incorrect business rules
# Tools: unit tests, pytest-mock

# Example: adherence calculated incorrectly
from decimal import Decimal
result = AdherenceService.calculate_pct(doses)
# Check: division by zero? rounding? timezone?
```

#### Repository (Queries)

```python
# Symptoms: wrong data, N+1, deadlocks, ghost records
# Tools: SQLAlchemy echo, EXPLAIN ANALYZE

# Enable SQL logging for diagnosis
import logging
logging.getLogger("sqlalchemy.engine").setLevel(logging.DEBUG)

# Check generated queries
# EXPLAIN ANALYZE SELECT * FROM checkins WHERE patient_id = '...' AND deleted_at IS NULL;
```

#### Database / Infrastructure

```bash
# Symptoms: connection refused, pool exhausted, pending migration
# Tools: docker logs, pg_stat_activity, Redis CLI

# Check connection pool
docker exec -it pequi-db-1 psql -U pequi -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Check pending migrations
alembic current
alembic heads

# Check Redis (ARQ queues)
docker exec -it pequi-redis-1 redis-cli KEYS "arq:*"
```

---

## Step 4 — Root Cause Analysis

### 5 Whys Technique

Apply iteratively until reaching the root cause:

```
Bug: Check-in does not appear on the doctor's dashboard.

1. Why? → The weekly_symptom_summary does not include the check-in.
2. Why? → The summary_worker did not process the check-in.
3. Why? → The ARQ job failed silently.
4. Why? → The worker did not have access to the database (connection refused).
5. Why? → The worker's docker-compose.yml was missing depends_on: [db].

Root cause: Missing dependency in docker-compose.yml.
```

### Regression Analysis with git bisect

```bash
# Find the commit that introduced the bug
git bisect start
git bisect bad                          # current commit (buggy)
git bisect good v1.2.0                  # last version without the bug

# For each commit, run the reproduction test
scripts/run_tests.sh tests/integration/test_bug_1234.py

git bisect good   # if the test passed
git bisect bad    # if the test failed

# In the end, git shows the culprit commit
git bisect reset
```

### Common Bug Patterns in Pequi

| Pattern | Symptom | Probable Cause | Where to Investigate |
|---|---|---|---|
| Soft delete ignored | "Deleted" records appear | Query without `WHERE deleted_at IS NULL` | `repositories/` |
| Community data leaks `user_id` | Identity exposed in posts | Query returns `user_id` instead of `anonymous_id` | `repositories/community_repo.py` |
| Adherence shows 0% | Dashboard shows zero adherence | `adherence_snapshots` empty or worker stopped | `workers/adherence_worker.py` |
| Check-in timeout | 504 on mobile | Synchronous AI feedback blocking response | `use_cases/submit_checkin.py` |
| Image doesn't load | 404 on lesion photos | MinIO URL not accessible outside Docker | `integrations/object_storage.py` |
| Alert not generated | Severe symptom without notification | Wrong threshold in `alert_service` | `services/alert_service.py` |
| Migration fails in prod | `alembic upgrade` breaks | `downgrade()` not implemented | `alembic/versions/` |
| Duplicate record | Two identical check-ins | Lack of idempotency in the endpoint | `routers/` + `repositories/` |

---

## Step 5 — Fix Implementation

### Implementation Rules

1. **Never apply the fix without a test that reproduces the bug.** The test must fail before the fix and pass after.
2. **Respect the dependency chain.** If the bug is in the service, the fix goes in the service — not in the router.
3. **Do not introduce `CASCADE DELETE` in clinical entities.** Even as a "temporary fix".
4. **Do not expose personal data** in logs, Sentry, or error messages — even during debugging.
5. **Prefer minimal fix.** Larger refactorings go in separate PRs.

### Fix Example — Soft Delete Ignored

```python
# repositories/patient_repo.py

# BEFORE (buggy) — returns deleted patients
async def get_by_id(self, patient_id: UUID) -> Patient | None:
    stmt = select(Patient).where(Patient.id == patient_id)
    result = await self.session.execute(stmt)
    return result.scalar_one_or_none()

# AFTER (fixed) — filters soft delete
async def get_by_id(self, patient_id: UUID) -> Patient | None:
    stmt = select(Patient).where(
        Patient.id == patient_id,
        Patient.deleted_at.is_(None),  # ← fix: respect soft delete
    )
    result = await self.session.execute(stmt)
    return result.scalar_one_or_none()
```

### Fix Example — Identity Leak in Community

```python
# repositories/community_repo.py

# BEFORE (buggy) — exposes real user_id
async def list_posts(self) -> list[CommunityPost]:
    stmt = select(CommunityPost)  # user_id accessible in the model
    ...

# AFTER (fixed) — returns only anonymous_id
async def list_posts(self) -> list[CommunityPostPublic]:
    stmt = select(
        CommunityPost.id,
        CommunityPost.content,
        CommunityPost.author_anonymous_id,  # ← never user_id
        CommunityPost.created_at,
    ).where(CommunityPost.deleted_at.is_(None))
    ...
```

---

## Step 6 — Verification and Regression

### Run the Reproduction Test

```bash
# The test written in Step 2 should now pass
scripts/run_tests.sh tests/integration/test_bug_1234.py -v --tb=long
```

### Run Full Suite

```bash
# Ensure the fix didn't break anything
scripts/run_tests.sh
```

### Manual Verification (when applicable)

```bash
# Start stack and test via Bruno API
docker compose up -d
alembic upgrade head

# Execute the corresponding Bruno collection
# bruno/checkin/submit_checkin.bru → verify assert { res.status: eq 201 }
```

### Verification Checklist

- [ ] Bug reproduction test passes
- [ ] Full test suite passes (`scripts/run_tests.sh`)
- [ ] `ruff check .` with no errors
- [ ] `ruff format --check .` with no differences
- [ ] No personal data exposed in logs or Sentry
- [ ] Soft delete respected in all affected queries
- [ ] `community_anonymous_map` does not expose `user_id`
- [ ] Migration (if any) has `upgrade()` and `downgrade()`
- [ ] Bruno file updated (if API contract changed)

---

## Step 7 — Documentation

### In the Commit

Use Conventional Commits with issue reference:

```bash
git commit -m "fix(checkin): prevent duplicate check-ins on client retry

Check-ins now use idempotency key based on patient_id + date.
Duplicate submissions within the same day return the existing record
instead of creating a new one.

Closes #1234"
```

### In the Issue / PR

Document using the following template:

```markdown
## Bug Investigation Report

**Symptom:** Duplicate check-in when mobile app retries after timeout.

**Affected Layer:** `use_cases/submit_checkin.py` + `repositories/checkin_repo.py`

**Root Cause:** Lack of idempotency in the submission flow. The endpoint
created a new record on every call without checking if a check-in
already existed for the same patient on the same day.

**Applied Fix:** Added idempotency check in the repository using
`patient_id + DATE(checked_in_at)` as a natural key. The use case now
returns the existing check-in if a duplicate is detected.

**Added Tests:**
- `tests/integration/test_bug_1234_duplicate_checkin_on_timeout.py`

**Impact:** No breaking change. The endpoint continues to return 201 for
the first submission and now returns 200 for duplicate submissions.
```

---

## Bug Investigation in ARQ Workers

ARQ workers run in a separate process. Investigation has particularities:

```bash
# Check worker logs
docker compose logs worker --tail=100 -f

# Check Redis queue
docker exec -it pequi-redis-1 redis-cli
> KEYS arq:*
> LRANGE arq:queue 0 -1
> GET arq:job:<job_id>

# Check failed jobs
> ZRANGE arq:queue:failed 0 -1 WITHSCORES
```

### Worker Failure Patterns

| Failure | Diagnosis | Solution |
|---|---|---|
| Job never runs | Worker is not running | `docker compose up worker` |
| Job fails with `ConnectionRefusedError` | Worker cannot reach DB | Check `depends_on` and `DATABASE_URL` |
| Job runs but wrong data | Race condition with API | Ensure transaction commit happened before enqueue |
| Job reprocesses infinitely | Exception not caught correctly | Implement max retries + dead letter |

---

## Migration Bug Investigation

```bash
# Check current migration status
alembic current

# Check if there are pending migrations
alembic heads

# Review the SQL that would be executed (without applying)
alembic upgrade head --sql

# Revert last migration (dev only)
alembic downgrade -1
```

### Migration Rules during Bug Fix

- If the fix requires ORM model change, generate migration with `alembic revision --autogenerate -m "fix_<description>"`.
- Every migration must have `downgrade()` implemented.
- Never use `CASCADE DELETE` — use `ON DELETE RESTRICT`.
- Test migration in a clean environment before applying in staging.

---

## Pitfalls during Investigation — Don't Do

**Do not debug in production with real data.** Always reproduce in local environment with fictitious data. If you need production UUIDs for correlation, use only in log filters — never in committed code.

**Do not add `print()` for debugging.** Use `structlog` with `DEBUG` level:

```python
import structlog
logger = structlog.get_logger()
logger.debug("bug_investigation.checkpoint", step="after_query", count=len(results))
```

**Do not ignore intermittent (flaky) tests.** A test that fails "sometimes" is evidence of race condition or state dependency. Investigate with the same seriousness as a production bug.

**Do not apply hotfix without a test.** Even in emergency, the reproduction test comes first. A hotfix without a test is a guaranteed future regression.

**Do not modify `audit_logs` during investigation.** The table is append-only. Never `UPDATE` or `DELETE` audit records, even to "clean up test data".

**Do not expose `patient_id`, CPF, or name in commit messages, PRs, or issues.** Use only UUIDs and indirect references. LGPD/GDPR applies also to bug documentation.

---

## Diagnostic Tools

### Quick Commands

```bash
# API logs
docker compose logs api --tail=200 -f

# Worker logs
docker compose logs worker --tail=200 -f

# PostgreSQL state
docker exec -it pequi-db-1 psql -U pequi -c "SELECT pid, state, query FROM pg_stat_activity WHERE datname = 'pequi';"

# Active connections in pool
docker exec -it pequi-db-1 psql -U pequi -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Redis state
docker exec -it pequi-redis-1 redis-cli INFO keyspace

# Run specific test with verbose output
scripts/run_tests.sh tests/integration/test_bug_1234.py -v --tb=long -s

# Check lint before committing
uv run ruff check . && uv run ruff format --check .
```

### SQLAlchemy debug mode

```python
# Temporary — NEVER commit in production
# Add in conftest.py or at the beginning of the test
import logging
logging.getLogger("sqlalchemy.engine").setLevel(logging.DEBUG)
```

---

## Severity and Prioritization

| Severity | Criteria | Investigation SLA | Examples |
|---|---|---|---|
| **P0 — Critical** | Corrupted clinical data, compromised security, app inoperable | Start in < 1h | `user_id` leak in community, exposed patient data, API completely down |
| **P1 — High** | Core functionality broken, but no data risk | Start in < 4h | Check-in doesn't save, adherence calculated wrong, alerts don't trigger |
| **P2 — Medium** | Secondary functionality, degraded UX | Start in next sprint | Wrong sorting in history, broken pagination |
| **P3 — Low** | Cosmetic, rare edge case | Backlog | Date formatting in exotic timezone, typo in message |

---

## Integration with other agents

- **code-review**: Request fix review before merging.
- **security-review**: Escalate if the bug involves data leak, authentication, or LGPD/GDPR.
- **testing**: Ensure test coverage for the fix.
- **architecture-review**: Consult if the fix suggests a larger architectural issue.
- **pull-request**: Follow PR template with Bug Investigation Report section.
- **release-manager**: Coordinate if the fix needs a hotfix release.

---

*Bug Investigation Skill — Pequi Project — version 1.0 — May 2026*
