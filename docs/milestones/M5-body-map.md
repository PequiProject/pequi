# M5 — Body Map

> **Status:** 🔜 Pendente
> **Depende de:** M4
> **Bloqueado por:** —

## Objetivo

Permitir que o paciente marque lesões/alterações sensitivas em um mapa corporal interativo. O histórico de marcações permite ao profissional acompanhar a progressão das lesões ao longo do tratamento.

## Modelo de dados

```
body_areas                         ← catálogo fixo de regiões corporais
├── id          UUID PK
├── code        TEXT UNIQUE NOT NULL  ← ex: "left_forearm", "right_cheek"
├── label       TEXT NOT NULL         ← ex: "Antebraço esquerdo"
├── side        ENUM('left','right','center','bilateral')
└── system_part ENUM('head','trunk','upper_limb','lower_limb')

body_map_entries                   ← marcação atual do paciente
├── id              UUID PK
├── patient_id      UUID FK → patient_profiles(id) ON DELETE RESTRICT
├── body_area_id    UUID FK → body_areas(id)
├── finding_type    ENUM('lesion','hypoesthesia','anesthesia','nodule','other')
├── intensity       SMALLINT NULL   ← 0..3 (ausente/leve/moderado/intenso)
├── image_url       TEXT NULL       ← MinIO/R2
├── image_key       TEXT NULL       ← chave do objeto no storage
├── notes           TEXT NULL
├── recorded_at     TIMESTAMPTZ DEFAULT now()
├── created_at      TIMESTAMPTZ
└── deleted_at      TIMESTAMPTZ NULL  ← soft delete ao "limpar" marcação

body_area_history                  ← snapshot imutável por check-in
├── id              UUID PK
├── patient_id      UUID FK → patient_profiles(id)
├── checkin_id      UUID FK → checkins(id) NULL  ← associado opcionalmente ao check-in
├── body_area_id    UUID FK → body_areas(id)
├── finding_type    TEXT
├── intensity       SMALLINT NULL
├── image_url       TEXT NULL
├── image_key       TEXT NULL
└── snapshot_at     TIMESTAMPTZ DEFAULT now()
```

## Arquivos criados

| Camada | Arquivo |
|--------|---------|
| Models | `models/body_map.py` |
| Schemas | `schemas/body_map.py` |
| Repositories | `repositories/body_map_repo.py` |
| Use Cases | `use_cases/update_body_map.py`, `use_cases/get_body_map_history.py` |
| Router | `routers/body_map.py` |
| Tests | `tests/unit/test_body_map_schema.py`, `tests/integration/test_body_map.py` |
| Bruno | `bruno/body_map/` |
| Migration | `alembic/versions/005_create_body_map.py` |

## Endpoints

| Método | Path | Rate Limit | Auth |
|--------|------|-----------|------|
| `GET` | `/v1/body-map` | 100/min | patient |
| `PUT` | `/v1/body-map` | 20/min | patient |
| `GET` | `/v1/body-map/history` | 100/min | patient/professional |
| `GET` | `/v1/body-areas` | 200/min | any authenticated |
| `POST` | `/v1/body-map/upload` | 5/min | patient |

## Regras de negócio

- Imagens **nunca** armazenadas no PostgreSQL — apenas URL e chave do object storage
- Upload gera URL pré-assinada via MinIO/R2 (integração M10)
- `body_area_history` é append-only — nunca sofre UPDATE ou DELETE
- Ao fazer um check-in (M4), um snapshot do mapa corporal atual é criado automaticamente

## Critérios de aceite

- [ ] Marcação de área retorna 404 se `body_area_id` inválido
- [ ] Histórico é imutável (sem endpoint de DELETE no histórico)
- [ ] Upload de imagem salva apenas URL/key, não bytes
- [ ] Profissional de outra unidade não acessa o mapa
