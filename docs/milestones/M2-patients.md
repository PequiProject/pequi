# M2 — Patients

> **Status:** 🔜 Pendente
> **Depende de:** M1
> **Bloqueado por:** —

## Objetivo

Modelar o perfil clínico do paciente, a unidade de saúde à qual está vinculado e o fluxo de consentimento LGPD. Ao final, um paciente autenticado pode visualizar e atualizar seu perfil; um profissional pode acessar o perfil de seus pacientes vinculados.

## Modelo de dados

```
health_units
├── id          UUID PK
├── name        TEXT NOT NULL
├── city        TEXT NOT NULL
├── state       CHAR(2) NOT NULL
├── cnes        TEXT UNIQUE          ← código CNES do DATASUS
├── created_at  TIMESTAMPTZ
└── deleted_at  TIMESTAMPTZ NULL

patient_profiles
├── id                  UUID PK
├── user_id             UUID FK → users(id) ON DELETE RESTRICT
├── health_unit_id      UUID FK → health_units(id) ON DELETE RESTRICT
├── date_of_birth       DATE NOT NULL
├── sex                 ENUM('M','F','other')
├── neighborhood        TEXT          ← sem endereço completo (LGPD minimização)
├── city                TEXT
├── state               CHAR(2)
├── disability_grade    SMALLINT DEFAULT 0  ← 0/1/2 OMS
├── diagnosis_date      DATE
├── classification      ENUM('PB','MB')     ← paucibacilar / multibacilar
├── created_at          TIMESTAMPTZ
├── updated_at          TIMESTAMPTZ
└── deleted_at          TIMESTAMPTZ NULL

consents
├── id              UUID PK
├── user_id         UUID FK → users(id)
├── term_version    TEXT NOT NULL     ← ex: "v1.2"
├── accepted_at     TIMESTAMPTZ NOT NULL
├── ip_address      INET
└── user_agent      TEXT
```

## Arquivos criados

| Camada | Arquivo |
|--------|---------|
| Models | `models/patient.py`, `models/health_unit.py`, `models/consent.py` |
| Schemas | `schemas/patient.py`, `schemas/health_unit.py` |
| Repositories | `repositories/patient_repo.py`, `repositories/health_unit_repo.py` |
| Use Cases | `use_cases/get_patient_profile.py`, `use_cases/update_patient_profile.py` |
| Router | `routers/patient.py` |
| Tests | `tests/unit/test_patient_schema.py`, `tests/integration/test_patient_profile.py` |
| Bruno | `bruno/patient/get_profile.bru`, `bruno/patient/update_profile.bru` |
| Migration | `alembic/versions/002_create_patients.py` |

## Endpoints

| Método | Path | Rate Limit | Auth |
|--------|------|-----------|------|
| `GET` | `/v1/patients/me` | 100/min | patient |
| `PATCH` | `/v1/patients/me` | 20/min | patient |
| `GET` | `/v1/patients/{id}` | 100/min | professional/admin |
| `GET` | `/v1/patients` | 100/min | professional/admin |

## Critérios de aceite

- [ ] Paciente só acessa o próprio perfil
- [ ] Profissional só acessa pacientes vinculados à sua unidade
- [ ] Endereço completo nunca retorna (apenas bairro/cidade/estado)
- [ ] Acesso ao perfil por profissional gera entrada em `audit_logs`
- [ ] Consentimento registrado no cadastro
