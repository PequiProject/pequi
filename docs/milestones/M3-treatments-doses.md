# M3 — Treatments & Doses

> **Status:** 🔜 Pendente
> **Depende de:** M2
> **Bloqueado por:** —

## Objetivo

Modelar o tratamento poliquimioterápico (MDT) do paciente com hanseníase — esquemas PB (6 meses) e MB (12 meses) —, o registro diário de doses e o cálculo de adesão. Ao final, é possível registrar doses tomadas/puladas e consultar o percentual de adesão.

## Modelo de dados

```
symptoms                          ← catálogo seed-only
├── id          UUID PK
├── name        TEXT NOT NULL
├── category    ENUM('dermatological','neurological','systemic')
└── description TEXT

treatments
├── id              UUID PK
├── patient_id      UUID FK → patient_profiles(id) ON DELETE RESTRICT
├── prescribed_by   UUID FK → health_professionals(id) ON DELETE RESTRICT
├── regimen         ENUM('PB','MB') NOT NULL
├── start_date      DATE NOT NULL
├── expected_end    DATE NOT NULL     ← calculado: PB+6m / MB+12m
├── status          ENUM('active','completed','abandoned','suspended')
├── notes           TEXT
├── created_at      TIMESTAMPTZ
├── updated_at      TIMESTAMPTZ
└── deleted_at      TIMESTAMPTZ NULL

dose_schedules                    ← um registro por fármaco por mês
├── id              UUID PK
├── treatment_id    UUID FK → treatments(id) ON DELETE RESTRICT
├── drug_name       TEXT NOT NULL   ← ex: "Rifampicina", "Dapsona", "Clofazimina"
├── frequency       ENUM('daily','monthly_supervised')
├── dose_mg         NUMERIC(6,2)
└── month_number    SMALLINT        ← 1..12

dose_logs
├── id              UUID PK
├── treatment_id    UUID FK → treatments(id) ON DELETE RESTRICT
├── drug_name       TEXT NOT NULL
├── expected_at     TIMESTAMPTZ NOT NULL
├── taken_at        TIMESTAMPTZ NULL
├── skipped         BOOLEAN DEFAULT false
├── skip_reason     TEXT NULL
├── supervised      BOOLEAN DEFAULT false   ← dose supervisionada (mensal)
├── registered_by   UUID NULL FK → users(id) ← profissional ou null (autoregistro)
└── created_at      TIMESTAMPTZ

adherence_snapshots               ← calculado por worker, nunca em tempo real
├── id              UUID PK
├── patient_id      UUID FK → patient_profiles(id)
├── treatment_id    UUID FK → treatments(id)
├── period_start    DATE
├── period_end      DATE
├── total_doses     INT
├── taken_doses     INT
├── adherence_pct   NUMERIC(5,2)
└── calculated_at   TIMESTAMPTZ
```

## Arquivos criados

| Camada | Arquivo |
|--------|---------|
| Models | `models/treatment.py`, `models/dose_log.py`, `models/symptom.py` |
| Schemas | `schemas/treatment.py`, `schemas/dose_log.py` |
| Repositories | `repositories/treatment_repo.py`, `repositories/dose_repo.py` |
| Services | `services/adherence_service.py` |
| Use Cases | `use_cases/register_dose.py`, `use_cases/get_adherence.py` |
| Router | `routers/treatment.py` |
| Tests | `tests/unit/test_adherence_service.py`, `tests/integration/test_dose_flow.py` |
| Bruno | `bruno/treatment/`, `bruno/dose/` |
| Migration | `alembic/versions/003_create_treatments.py` |

## Endpoints

| Método | Path | Rate Limit | Auth |
|--------|------|-----------|------|
| `POST` | `/v1/treatments` | 10/min | professional |
| `GET` | `/v1/treatments/{id}` | 100/min | patient/professional |
| `POST` | `/v1/treatments/{id}/doses` | 20/min | patient/professional |
| `GET` | `/v1/treatments/{id}/adherence` | 100/min | patient/professional |
| `GET` | `/v1/symptoms` | 200/min | any authenticated |

## Regras de negócio

- Adesão **nunca** calculada em tempo real — lida de `adherence_snapshots`
- `CASCADE DELETE` proibido em `dose_logs` e `treatments`
- Dose supervisionada mensal deve ser registrada por profissional (campo `registered_by` não nulo)
- Paciente só pode autoregistrar doses diárias do próprio tratamento ativo

## Critérios de aceite

- [ ] `AdherenceService.calculate_pct` cobre casos: 0%, 33.33%, 100%
- [ ] Registro de dose duplicada (mesma `expected_at` + `drug_name`) retorna 409
- [ ] Profissional de outra unidade não acessa o tratamento
- [ ] Testes unitários e de integração passando
