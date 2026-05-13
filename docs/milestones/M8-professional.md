# M8 — Professional Dashboard

> **Status:** 🔜 Pendente
> **Depende de:** M4
> **Bloqueado por:** —

## Objetivo

Implementar o painel do profissional de saúde: listagem de pacientes vinculados, dashboard de adesão, alertas ativos, histórico de check-ins e logs de auditoria. Todo acesso a dados de paciente é registrado.

## Modelo de dados

```
health_professionals
├── id                  UUID PK
├── user_id             UUID UNIQUE FK → users(id) ON DELETE RESTRICT
├── health_unit_id      UUID FK → health_units(id) ON DELETE RESTRICT
├── cns                 TEXT UNIQUE    ← Cartão Nacional de Saúde do profissional
├── specialty           TEXT           ← ex: "Dermatologia", "Clínica Geral"
├── is_active           BOOLEAN DEFAULT true
├── created_at          TIMESTAMPTZ
├── updated_at          TIMESTAMPTZ
└── deleted_at          TIMESTAMPTZ NULL

patient_professional_links         ← vínculo paciente ↔ profissional
├── id                  UUID PK
├── patient_id          UUID FK → patient_profiles(id) ON DELETE RESTRICT
├── professional_id     UUID FK → health_professionals(id) ON DELETE RESTRICT
├── linked_at           TIMESTAMPTZ DEFAULT now()
├── unlinked_at         TIMESTAMPTZ NULL
└── UNIQUE (patient_id, professional_id) WHERE unlinked_at IS NULL

audit_logs                         ← append-only, sem DELETE/UPDATE
├── id              UUID PK
├── actor_id        UUID NOT NULL   ← user_id de quem fez a ação
├── actor_role      TEXT NOT NULL
├── entity_type     TEXT NOT NULL   ← ex: 'patient_profile', 'checkin'
├── entity_id       UUID NOT NULL
├── action          TEXT NOT NULL   ← ex: 'READ', 'UPDATE', 'DELETE'
├── ip_address      INET NULL
├── user_agent      TEXT NULL
└── created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
```

## Arquivos criados

| Camada | Arquivo |
|--------|---------|
| Models | `models/health_professional.py`, `models/audit_log.py` |
| Schemas | `schemas/professional.py`, `schemas/audit_log.py` |
| Repositories | `repositories/professional_repo.py`, `repositories/audit_log_repo.py` |
| Use Cases | `use_cases/get_patient_dashboard.py`, `use_cases/link_patient.py` |
| Router | `routers/professional.py` |
| Tests | `tests/unit/test_audit_log.py`, `tests/integration/test_professional_dashboard.py` |
| Bruno | `bruno/professional/get_dashboard.bru` |
| Migration | `alembic/versions/008_create_professionals.py` |

## Endpoints

| Método | Path | Rate Limit | Auth |
|--------|------|-----------|------|
| `GET` | `/v1/professionals/me` | 100/min | professional |
| `GET` | `/v1/professionals/me/patients` | 100/min | professional |
| `GET` | `/v1/professionals/me/patients/{id}/dashboard` | 100/min | professional |
| `POST` | `/v1/professionals/me/patients/{id}/link` | 20/min | professional |
| `DELETE` | `/v1/professionals/me/patients/{id}/link` | 20/min | professional |
| `GET` | `/v1/professionals/me/alerts` | 100/min | professional |

## Painel do paciente (`GET /v1/professionals/me/patients/{id}/dashboard`)

Resposta consolidada (lida de snapshots, não calculada em tempo real):

```json
{
  "patient": { "...perfil básico sem PII..." },
  "current_treatment": { "regimen": "MB", "adherence_pct": 87.5, "days_remaining": 45 },
  "last_checkin": { "mood": "ok", "intensity": 4, "checked_in_at": "..." },
  "active_alerts": [ { "type": "missed_doses", "severity": "high" } ],
  "weekly_summary": { "avg_intensity": 3.8, "checkin_count": 6 }
}
```

## Regras de auditoria

- Todo `GET` a dados de paciente por profissional → `audit_logs` com `action=READ`
- `audit_logs` é **append-only** — proibido UPDATE e DELETE na tabela
- `actor_id` nunca é nulo — endpoints de admin também auditam

## Critérios de aceite

- [ ] Profissional só acessa pacientes da própria unidade
- [ ] Dashboard lê de snapshots (sem queries transacionais pesadas)
- [ ] Todo acesso gera entrada em `audit_logs`
- [ ] `audit_logs` não aceita UPDATE nem DELETE (constraint via policy ou trigger)
- [ ] Testes verificam isolamento entre unidades de saúde
