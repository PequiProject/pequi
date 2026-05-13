# Code Review Checklist — Pequi Project

> Actionable checklist for reviewing pull requests in the Pequi codebase.
> Use this checklist systematically — work through each section in order.
> Every item marked 🚫 is a **merge blocker** if violated.

---

## 1. Architecture & Layer Compliance

The Pequi dependency chain is: `routers → use_cases → services → repositories → database`.

| # | Check | Severity |
|---|---|---|
| 1.1 | No direct database access from routers (all queries go through repositories) | 🚫 Blocker |
| 1.2 | No business logic in ORM models (`models/`) | 🚫 Blocker |
| 1.3 | No SQL queries in services (queries go through repositories only) | 🚫 Blocker |
| 1.4 | No HTTP-specific logic (Request, Response, status codes) in use cases or services | 🚫 Blocker |
| 1.5 | Use case only orchestrates — calls services and repositories, no inline logic | ⚠️ Warning |
| 1.6 | Router is thin — receives request, calls use case, returns response | ⚠️ Warning |
| 1.7 | New services are stateless and testable in isolation | ⚠️ Warning |

### What to look for

```python
# 🚫 WRONG — database access in router
@router.get("/v1/patients/{id}")
async def get_patient(id: UUID, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Patient).where(Patient.id == id))  # ← violation
    return result.scalar_one_or_none()

# ✅ CORRECT — router delegates to use case
@router.get("/v1/patients/{id}")
async def get_patient(id: UUID, use_case: GetPatientUseCase = Depends()):
    return await use_case.execute(patient_id=id)
```

---

## 2. Security & LGPD/GDPR

| # | Check | Severity |
|---|---|---|
| 2.1 | No personal data (CPF, name, date of birth, coordinates) in `structlog` calls | 🚫 Blocker |
| 2.2 | No personal data in Sentry `extras`, `tags`, or `breadcrumbs` | 🚫 Blocker |
| 2.3 | No personal data in commit messages, PR description, or code comments | 🚫 Blocker |
| 2.4 | `send_default_pii=False` remains unchanged in Sentry configuration | 🚫 Blocker |
| 2.5 | Only UUIDs used for patient correlation in logs | 🚫 Blocker |
| 2.6 | `audit_logs` table is append-only — no UPDATE or DELETE statements | 🚫 Blocker |
| 2.7 | New patient data access endpoints register in `audit_logs` with correct `entity_type` | 🚫 Blocker |
| 2.8 | Community features use `author_anonymous_id` exclusively (never `user_id` in public responses) | 🚫 Blocker |
| 2.9 | `community_anonymous_map` access restricted to `admin` role only | 🚫 Blocker |
| 2.10 | If new personal data collected → `consents` table updated with new term version | 🚫 Blocker |
| 2.11 | JWT tokens validated correctly (`python-jose` + `bcrypt`) | ⚠️ Warning |
| 2.12 | No hardcoded credentials, API keys, or production URLs in code | 🚫 Blocker |
| 2.13 | `.env.example` updated if new environment variables introduced (no real values) | ⚠️ Warning |
| 2.14 | Input validation via Pydantic schemas — no manual parsing of request body | ⚠️ Warning |

### What to look for

```python
# 🚫 WRONG — personal data in logs
logger.info("checkin.created", patient_name="João Silva", cpf="123.456.789-00")

# ✅ CORRECT — UUIDs only
logger.info("checkin.created", patient_id=str(patient_id), intensity=data.symptom_intensity)
```

```python
# 🚫 WRONG — user_id exposed in community
async def list_posts(self) -> list[CommunityPost]:
    stmt = select(CommunityPost)  # user_id accessible via model

# ✅ CORRECT — anonymous_id only
async def list_posts(self) -> list[CommunityPostPublic]:
    stmt = select(
        CommunityPost.id,
        CommunityPost.content,
        CommunityPost.author_anonymous_id,
        CommunityPost.created_at,
    ).where(CommunityPost.deleted_at.is_(None))
```

---

## 3. Database & Migrations

| # | Check | Severity |
|---|---|---|
| 3.1 | No `CASCADE DELETE` on clinical entities — must use `ON DELETE RESTRICT` | 🚫 Blocker |
| 3.2 | Soft delete uses `deleted_at TIMESTAMPTZ NULL` (not `is_deleted boolean`) | 🚫 Blocker |
| 3.3 | All queries on soft-deletable entities filter `WHERE deleted_at IS NULL` | 🚫 Blocker |
| 3.4 | No `bytea` fields for images — use MinIO/R2 with `image_url`/`image_key` | 🚫 Blocker |
| 3.5 | Migration has both `upgrade()` and `downgrade()` implemented | 🚫 Blocker |
| 3.6 | Migration SQL reviewed (`alembic upgrade head --sql`) | ⚠️ Warning |
| 3.7 | Single Alembic head (`alembic heads` returns one result) | 🚫 Blocker |
| 3.8 | No raw SQL in services — all queries go through repository layer with SQLAlchemy | ⚠️ Warning |
| 3.9 | No N+1 query patterns (eager loading or explicit joins where needed) | ⚠️ Warning |
| 3.10 | Indexes added for columns used in WHERE/JOIN on high-traffic queries | ⚠️ Warning |

### What to look for

```python
# 🚫 WRONG — soft delete ignored
stmt = select(Patient).where(Patient.id == patient_id)

# ✅ CORRECT — soft delete filtered
stmt = select(Patient).where(
    Patient.id == patient_id,
    Patient.deleted_at.is_(None),
)
```

```python
# 🚫 WRONG — CASCADE DELETE on clinical entity
class Checkin(Base):
    patient_id = Column(UUID, ForeignKey("patients.id", ondelete="CASCADE"))  # ← violation

# ✅ CORRECT — RESTRICT
class Checkin(Base):
    patient_id = Column(UUID, ForeignKey("patients.id", ondelete="RESTRICT"))
```

---

## 4. API Contract & Endpoints

| # | Check | Severity |
|---|---|---|
| 4.1 | New endpoint uses `/v1/` prefix | 🚫 Blocker |
| 4.2 | Bruno file (`.bru`) created or updated in `bruno/` for new/modified endpoints | 🚫 Blocker |
| 4.3 | Bruno assertions (`assert {}`) match actual response schema | ⚠️ Warning |
| 4.4 | Bruno uses `{{token}}` variable for auth — no hardcoded tokens | ⚠️ Warning |
| 4.5 | Bruno uses `{{baseUrl}}` with environments — no production URLs | 🚫 Blocker |
| 4.6 | Rate limit defined with `@limiter.limit(...)` for sensitive endpoints | 🚫 Blocker |
| 4.7 | No breaking changes to existing `/v1/` endpoints without version bump | 🚫 Blocker |
| 4.8 | Response schema uses `response_model=...` in router decorator | ⚠️ Warning |
| 4.9 | Correct HTTP status codes (201 for create, 200 for read, 204 for delete) | ⚠️ Warning |
| 4.10 | Previous API version preserved if new version introduced | ⚠️ Warning |

### Rate limit reference

| Endpoint | Limit | Window |
|---|---|---|
| `POST /auth/login` | 5 attempts | per minute per IP |
| `POST /checkins` | 10 requests | per minute per user |
| `POST /community/posts` | 20 posts | per hour per user |
| `GET /articles` | 100 requests | per minute per user |
| Admin endpoints | 200 requests | per minute per IP |

---

## 5. Testing

| # | Check | Severity |
|---|---|---|
| 5.1 | Tests pass locally (`scripts/run_tests.sh`) | 🚫 Blocker |
| 5.2 | New feature has unit tests in `tests/unit/` | 🚫 Blocker |
| 5.3 | New feature has integration tests in `tests/integration/` | ⚠️ Warning |
| 5.4 | Bug fix has a reproduction test that fails without the fix | 🚫 Blocker |
| 5.5 | No change-detector tests (no exact count assertions like `assert len(x) == 14`) | ⚠️ Warning |
| 5.6 | Tests use `patient_factory` or fixtures — never real patient data | 🚫 Blocker |
| 5.7 | Tests use `tmp_path` for file operations — never `~/.pequi/` | ⚠️ Warning |
| 5.8 | No real credentials (Anthropic, Twilio) in tests — mocks or fixtures only | 🚫 Blocker |
| 5.9 | Community tests verify `author_anonymous_id` never exposes real `user_id` | 🚫 Blocker |
| 5.10 | Tests run against real PostgreSQL (PostGIS), not SQLite | ⚠️ Warning |
| 5.11 | Each test runs in a rolled-back transaction (no test pollution) | ⚠️ Warning |
| 5.12 | Async tests use proper fixtures from `conftest.py` | ⚠️ Warning |

### What to look for

```python
# 🚫 WRONG — change-detector test
assert len(symptom_catalog) == 14

# ✅ CORRECT — behavioral test
assert len(symptom_catalog) >= 1
assert all(s.category in ("dermatological", "neurological", "systemic") for s in symptom_catalog)
```

```python
# 🚫 WRONG — real credentials in test
client = AnthropicClient(api_key="sk-ant-real-key-here")

# ✅ CORRECT — mocked
@pytest.fixture
def mock_ai_client(mocker):
    return mocker.patch("pequi.integrations.ai_client.AnthropicClient")
```

---

## 6. Code Quality & Style

| # | Check | Severity |
|---|---|---|
| 6.1 | `ruff check .` passes with no errors | 🚫 Blocker |
| 6.2 | `ruff format --check .` shows no differences | 🚫 Blocker |
| 6.3 | No `print()` statements — use `structlog` for debugging | 🚫 Blocker |
| 6.4 | No `TODO` comments without linked issue number (`# TODO(#123): ...`) | ⚠️ Warning |
| 6.5 | Functions and classes have docstrings | ⚠️ Warning |
| 6.6 | Variable/function names are descriptive and follow Python conventions | ⚠️ Warning |
| 6.7 | No duplicated code across services or repositories | ⚠️ Warning |
| 6.8 | Proper use of type hints (Python 3.10+ union syntax `X | None`) | ⚠️ Warning |
| 6.9 | Error handling is explicit — no bare `except:` | ⚠️ Warning |
| 6.10 | Async/await used consistently (no mixing sync/async in the same flow) | ⚠️ Warning |

---

## 7. Workers & Background Jobs (ARQ)

> Skip this section if the PR does not touch `workers/` or enqueue jobs.

| # | Check | Severity |
|---|---|---|
| 7.1 | Worker runs in separate process — not embedded in the API container | ⚠️ Warning |
| 7.2 | Job is idempotent (safe to retry without side effects) | 🚫 Blocker |
| 7.3 | Transaction committed before job is enqueued (no race condition) | 🚫 Blocker |
| 7.4 | Max retries and dead letter queue configured for failure handling | ⚠️ Warning |
| 7.5 | Worker has `depends_on: [db, redis]` in `docker-compose.yml` | ⚠️ Warning |
| 7.6 | No personal data in job payload — UUIDs only | 🚫 Blocker |

---

## 8. Integrations & External Services

> Skip this section if the PR does not touch `integrations/`.

| # | Check | Severity |
|---|---|---|
| 8.1 | External API calls have timeout and retry logic | ⚠️ Warning |
| 8.2 | External API failures handled gracefully (no unhandled exceptions crashing the request) | 🚫 Blocker |
| 8.3 | No synchronous external calls blocking async request flow | ⚠️ Warning |
| 8.4 | Environment variables used for external URLs, keys, and credentials | 🚫 Blocker |
| 8.5 | Images stored in MinIO/R2 — only `image_url` and `image_key` in database | 🚫 Blocker |
| 8.6 | WhatsApp/Twilio integration uses mock in tests | ⚠️ Warning |
| 8.7 | AI client (Anthropic) calls are non-blocking or offloaded to worker | ⚠️ Warning |

---

## 9. Docker & Infrastructure

> Skip this section if the PR does not touch Docker or infrastructure files.

| # | Check | Severity |
|---|---|---|
| 9.1 | No `.env` files with real secrets committed — only `.env.example` | 🚫 Blocker |
| 9.2 | Production image does not mount source code volumes | ⚠️ Warning |
| 9.3 | Using `postgis/postgis` image (not plain `postgres`) | ⚠️ Warning |
| 9.4 | Worker service is separate from API service in `docker-compose.yml` | ⚠️ Warning |
| 9.5 | Health checks configured for dependent services | ⚠️ Warning |

---

## 10. Conventional Commits & Documentation

| # | Check | Severity |
|---|---|---|
| 10.1 | PR title follows Conventional Commits format (`type(scope): description`) | 🚫 Blocker |
| 10.2 | All commits follow Conventional Commits format | ⚠️ Warning |
| 10.3 | PR description filled using the `pr-template.md` template | ⚠️ Warning |
| 10.4 | Bug fix PR includes Bug Investigation Report section | ⚠️ Warning |
| 10.5 | Issue number referenced in PR (`Closes #123` or `Refs #123`) | ⚠️ Warning |
| 10.6 | No personal data in commit messages or PR description | 🚫 Blocker |

---

## Review Severity Guide

| Icon | Meaning | Action |
|---|---|---|
| 🚫 Blocker | Must be fixed before merge — no exceptions | Request changes |
| ⚠️ Warning | Should be fixed, but can be deferred with justification | Comment with suggestion |

### Review Decision Matrix

| Blockers Found | Warnings Found | Decision |
|---|---|---|
| 0 | 0 | ✅ Approve |
| 0 | 1–5 | ✅ Approve with comments |
| 0 | 6+ | ⚠️ Request improvements (optional block) |
| 1+ | Any | 🚫 Request changes |

---

## Quick Scan Order

When reviewing a PR, scan in this order for maximum efficiency:

1. **Security & LGPD** (Section 2) — highest impact, catch first
2. **Database & Migrations** (Section 3) — hard to revert after merge
3. **Architecture** (Section 1) — structural issues compound over time
4. **API Contract** (Section 4) — affects mobile app and external consumers
5. **Testing** (Section 5) — ensures everything above is verified
6. **Code Quality** (Section 6) — polish and maintainability
7. **Workers / Integrations / Docker** (Sections 7–9) — only if applicable
8. **Documentation** (Section 10) — final pass

---

*Code Review Checklist — Pequi Project — version 1.0 — May 2026*
