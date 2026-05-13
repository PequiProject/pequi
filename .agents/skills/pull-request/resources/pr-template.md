## Summary

<!-- Provide a concise description of what this PR does and WHY. -->
<!-- Link to the related issue(s). -->

**Issue:** Closes #

**What changed:**


**Why:**


---

## Type of Change

<!-- Check the ONE that applies. -->

- [ ] `feat` — New feature or endpoint
- [ ] `fix` — Bug fix (attach Bug Investigation Report below)
- [ ] `refactor` — Code restructuring without behavior change
- [ ] `chore` — Build, CI, dependencies, configuration
- [ ] `docs` — Documentation only
- [ ] `test` — Adding or updating tests only
- [ ] `hotfix` — Emergency production fix (targets `main`)

---

## Architecture Compliance

<!-- Which layers does this PR touch? Check all that apply. -->

### Layers Affected

- [ ] `routers/` — HTTP layer
- [ ] `use_cases/` — Orchestration layer
- [ ] `services/` — Business logic layer
- [ ] `repositories/` — Data access layer
- [ ] `models/` — ORM models
- [ ] `schemas/` — Pydantic schemas (request/response)
- [ ] `workers/` — ARQ async jobs
- [ ] `integrations/` — External clients (Twilio, MinIO, Anthropic)
- [ ] `core/` — Auth, security, dependencies, exceptions
- [ ] `alembic/versions/` — Database migrations

### Dependency Chain Verification

<!-- The Pequi dependency chain: routers → use_cases → services → repositories → database -->

- [ ] No database access from routers (queries go through repositories only)
- [ ] No business logic in ORM models
- [ ] No SQL queries in services (queries go through repositories only)
- [ ] No HTTP-specific logic in use cases or services

---

## Database Changes

<!-- Skip this section if no database changes in this PR. -->

- [ ] Migration generated with `alembic revision --autogenerate -m "..."`
- [ ] Migration SQL reviewed with `alembic upgrade head --sql`
- [ ] `upgrade()` function implemented
- [ ] `downgrade()` function implemented and tested (`alembic downgrade -1` works)
- [ ] **No `CASCADE DELETE`** on clinical entities (using `ON DELETE RESTRICT`)
- [ ] Soft delete uses `deleted_at TIMESTAMPTZ NULL` (not `is_deleted boolean`)
- [ ] No `bytea` fields for images (using MinIO/R2 with `image_url`/`image_key` only)
- [ ] Single Alembic head confirmed (`alembic heads` returns one result)

---

## Privacy & LGPD/GDPR Compliance

<!-- MANDATORY — every PR must verify these items. -->

- [ ] **No personal data** (CPF, name, date of birth, coordinates) in logs, Sentry extras, or error messages
- [ ] **No personal data** in commit messages, PR description, or code comments
- [ ] Only **UUIDs** used for patient correlation in `structlog` and Sentry
- [ ] `send_default_pii=False` remains in Sentry configuration
- [ ] `audit_logs` entry added for new endpoints that access patient data (`entity_type` specified)
- [ ] `audit_logs` table not modified (it is **append-only** — no UPDATE or DELETE)
- [ ] Community features use `author_anonymous_id` only (never `user_id` in public responses)
- [ ] `community_anonymous_map` access restricted to `admin` role
- [ ] If collecting new personal data: `consents` table updated with new term version
- [ ] If storing images: using MinIO/R2 object storage (never PostgreSQL `bytea`)

---

## Testing

<!-- Describe what was tested and how. -->

### Tests Added/Modified

<!-- List the test files created or updated. -->

- `tests/unit/...`
- `tests/integration/...`
- `tests/e2e/...` (if applicable)

### Test Verification

- [ ] All tests pass locally (`scripts/run_tests.sh`)
- [ ] New tests are **not** change-detector tests (no exact count assertions on catalogs)
- [ ] Tests use `patient_factory` or fixtures (never real patient data)
- [ ] Tests use `tmp_path` for file operations (never `~/.pequi/`)
- [ ] No real credentials (Anthropic, Twilio) in tests — mocks or fixtures only
- [ ] Community tests verify `author_anonymous_id` never exposes real `user_id`

### How to Reproduce/Verify

<!-- Step-by-step instructions for a reviewer to verify the change. -->

```bash
# Example:
docker compose up -d
alembic upgrade head
scripts/run_tests.sh tests/integration/test_<specific_file>.py -v
```

---

## API Contract

<!-- Skip this section if no API changes in this PR. -->

- [ ] Endpoint uses `/v1/` prefix
- [ ] Bruno file (`.bru`) created or updated in `bruno/`
- [ ] Bruno assertions (`assert {}`) match actual response schema
- [ ] Bruno uses `{{token}}` variable for auth (no hardcoded tokens)
- [ ] Bruno uses `{{baseUrl}}` with environments (no production URLs)
- [ ] Rate limit defined with `@limiter.limit(...)` for sensitive endpoints
- [ ] No breaking changes to existing endpoints (if breaking: MAJOR version bump required)
- [ ] Previous API version (`/v1`) preserved if new version (`/v2`) introduced

### Rate Limits (if applicable)

<!-- Specify the rate limit for new or modified endpoints. -->

| Endpoint | Limit | Window |
|---|---|---|
| `POST /v1/...` | X requests | per minute per user |

---

## Code Quality

- [ ] `ruff check .` — no errors
- [ ] `ruff format --check .` — no differences
- [ ] No `print()` statements (using `structlog` for debugging)
- [ ] No hardcoded credentials or production URLs
- [ ] No `TODO` without linked issue number (`# TODO(#123): description`)
- [ ] `.env.example` updated if new environment variables added
- [ ] All new functions/classes have docstrings

---

## Bug Investigation Report

<!-- REQUIRED for `fix` and `hotfix` PRs. Delete this section for other PR types. -->

**Symptom:**

**Affected Layer:**

**Root Cause:**

**Applied Fix:**

**Added Tests:**
-

**Impact:**

---

## Screenshots / Evidence

<!-- Optional. Add screenshots, API responses, or log output that demonstrates the change works. -->

---

## Deployment Notes

<!-- Optional. Special instructions for deploying this change. -->

- [ ] New environment variables required (listed in `.env.example`)
- [ ] Migration must be applied before deploying new code
- [ ] External service configuration required (MinIO bucket, Twilio webhook, etc.)
- [ ] Frontend/mobile team coordination required (API contract change)
- [ ] Sentry alert configuration update needed

---

## Final Checklist

<!-- ALL items must be checked before requesting review. -->

- [ ] PR title follows Conventional Commits format (`feat(scope): description`)
- [ ] PR targets the correct branch (`develop` for features, `main` for hotfixes)
- [ ] All CI checks pass
- [ ] Self-review completed — I have read my own code changes
- [ ] No unrelated changes included in this PR
- [ ] Documentation updated where applicable
- [ ] Ready for review (not a draft)
