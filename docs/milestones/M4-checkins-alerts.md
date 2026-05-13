# M4 — Check-ins & Alerts

> **Status:** 🔜 Pendente
> **Depende de:** M3
> **Bloqueado por:** —

## Objetivo

Implementar o fluxo central do aplicativo: o paciente submete um check-in diário com humor, intensidade de sintomas e sintomas observados. O sistema avalia alertas automaticamente e, quando a intensidade é crítica (≥ 7), dispara feedback de IA via worker assíncrono.

## Modelo de dados

```
checkins
├── id                  UUID PK
├── patient_id          UUID FK → patient_profiles(id) ON DELETE RESTRICT
├── mood                ENUM('terrible','bad','ok','good','great')
├── symptom_intensity   SMALLINT NOT NULL  ← 0..10
├── general_notes       TEXT NULL
├── ai_feedback         TEXT NULL          ← preenchido pelo worker
├── ai_feedback_at      TIMESTAMPTZ NULL
├── checked_in_at       TIMESTAMPTZ NOT NULL DEFAULT now()
└── created_at          TIMESTAMPTZ

checkin_symptoms                   ← N:M checkins ↔ symptoms
├── checkin_id  UUID FK → checkins(id)
├── symptom_id  UUID FK → symptoms(id)
└── PRIMARY KEY (checkin_id, symptom_id)

alerts
├── id              UUID PK
├── patient_id      UUID FK → patient_profiles(id) ON DELETE RESTRICT
├── checkin_id      UUID FK → checkins(id) ON DELETE RESTRICT
├── type            ENUM('symptom_spike','missed_doses','mood_decline','new_lesion')
├── severity        ENUM('low','medium','high','critical')
├── resolved        BOOLEAN DEFAULT false
├── resolved_at     TIMESTAMPTZ NULL
├── resolved_by     UUID NULL FK → users(id)
├── notes           TEXT NULL
├── created_at      TIMESTAMPTZ
└── updated_at      TIMESTAMPTZ

weekly_symptom_summaries           ← calculado por worker
├── id              UUID PK
├── patient_id      UUID FK → patient_profiles(id)
├── week_start      DATE
├── week_end        DATE
├── avg_intensity   NUMERIC(4,2)
├── dominant_mood   TEXT
├── checkin_count   SMALLINT
├── alert_count     SMALLINT
└── calculated_at   TIMESTAMPTZ
```

## Arquivos criados

| Camada | Arquivo |
|--------|---------|
| Models | `models/checkin.py`, `models/alert.py` |
| Schemas | `schemas/checkin.py`, `schemas/alert.py` |
| Repositories | `repositories/checkin_repo.py`, `repositories/alert_repo.py` |
| Services | `services/alert_service.py`, `services/ai_feedback_service.py`, `services/notification_service.py` |
| Use Cases | `use_cases/submit_checkin.py`, `use_cases/resolve_alert.py`, `use_cases/get_checkin_history.py` |
| Router | `routers/checkin.py` |
| Tests | `tests/unit/test_alert_service.py`, `tests/integration/test_checkin_flow.py` |
| Bruno | `bruno/checkin/submit_checkin.bru`, `bruno/checkin/get_history.bru` |
| Migration | `alembic/versions/004_create_checkins.py` |

## Endpoints

| Método | Path | Rate Limit | Auth |
|--------|------|-----------|------|
| `POST` | `/v1/checkins` | 10/min | patient |
| `GET` | `/v1/checkins` | 100/min | patient |
| `GET` | `/v1/checkins/{id}` | 100/min | patient/professional |
| `GET` | `/v1/alerts` | 100/min | patient/professional |
| `PATCH` | `/v1/alerts/{id}/resolve` | 20/min | professional |

## Fluxo de negócio (submit_checkin)

```
POST /v1/checkins
  → SubmitCheckinUseCase.execute()
    → checkin_repo.create()
    → alert_service.evaluate_after_checkin()   ← gera alertas se necessário
    → if symptom_intensity >= 7:
        → ARQ: enqueue ai_feedback_job(checkin_id)
    → return CheckinResponse
```

## Regras de alertas

| Condição | Tipo | Severidade |
|----------|------|-----------|
| `symptom_intensity >= 8` | `symptom_spike` | `critical` |
| `symptom_intensity >= 6` | `symptom_spike` | `high` |
| `mood in ['terrible'] por 3 dias consecutivos` | `mood_decline` | `medium` |
| `> 3 doses perdidas na semana` | `missed_doses` | `high` |

## Critérios de aceite

- [ ] Um check-in por dia por paciente (retorna 409 se já existe)
- [ ] `symptom_spike critical` gerado quando intensidade ≥ 8
- [ ] Worker de AI feedback enfileirado (não síncrono)
- [ ] Profissional de outra unidade não acessa alertas
- [ ] `ai_feedback` nunca retorna PII
- [ ] Testes de integração cobrem o fluxo completo
