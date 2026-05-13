# EPICS.md — Projeto Pequi

> Épicos, histórias e tarefas alinhados ao backlog importável e aos marcos em [`docs/milestones/`](./milestones/README.md).

---

## Fontes canônicas

| Fonte | Papel |
|--------|--------|
| [`docs/milestones/README.md`](./milestones/README.md) | Ordem e **dependências** entre milestones |
| `docs/milestones/M*.md` | Modelos, endpoints, critérios de aceite e decisões por marco |

---

## Índice de épicos (M0–M11)

| Marco | Épico | Label Jira | Documento |
|--------|--------|------------|-------------|
| M0 | Foundation | `milestone-M0` | [M0-foundation.md](./milestones/M0-foundation.md) |
| M1 | Auth & Users | `milestone-M1` | [M1-auth-users.md](./milestones/M1-auth-users.md) |
| M2 | Patients | `milestone-M2` | [M2-patients.md](./milestones/M2-patients.md) |
| M3 | Treatments & Doses | `milestone-M3` | [M3-treatments-doses.md](./milestones/M3-treatments-doses.md) |
| M4 | Check-ins & Alerts | `milestone-M4` | [M4-checkins-alerts.md](./milestones/M4-checkins-alerts.md) |
| M5 | Body Map | `milestone-M5` | [M5-body-map.md](./milestones/M5-body-map.md) |
| M6 | Community | `milestone-M6` | [M6-community.md](./milestones/M6-community.md) |
| M7 | Articles | `milestone-M7` | [M7-articles.md](./milestones/M7-articles.md) |
| M8 | Professional Dashboard | `milestone-M8` | [M8-professional.md](./milestones/M8-professional.md) |
| M9 | ARQ Workers | `milestone-M9` | [M9-workers.md](./milestones/M9-workers.md) |
| M10 | Integrations | `milestone-M10` | [M10-integrations.md](./milestones/M10-integrations.md) |
| M11 | LGPD & Account | `milestone-M11` | [M11-lgpd.md](./milestones/M11-lgpd.md) |

---

## M0 — Foundation

**Épico:** infraestrutura base — UV, FastAPI, PostgreSQL/PostGIS, Redis, Alembic, structlog, Sentry, rate limit e scaffolding de camadas.

### Histórias e tarefas

**Story — Como time quero stack local Docker para desenvolver com paridade de produção** (IDs Jira: story `2`, tasks `3`–`5`)

- Task: Criar `pyproject.toml` com dependências prod e dev
- Task: Configurar `docker-compose` e `Dockerfile`
- Task: Adicionar `scripts/run_tests.sh` e alinhar com CI

**Story — Como time quero app FastAPI com health e configuração centralizada** (story `6`, tasks `7`–`9`)

- Task: Implementar `config.py` e `database.py` async
- Task: Expor `GET /health` e wiring Sentry
- Task: Criar `alembic` env async e `upgrade head` vazio

**Story — Como time quero núcleo core reutilizável para auth e HTTP** (story `10`, tasks `11`–`13`)

- Task: Implementar `core/auth.py` e `core/rate_limit.py` (Redis)
- Task: Implementar exceptions, handlers e security middleware
- Task: Criar scaffolding vazio (`models/`, `schemas/`, `repositories/`, `services/`, `use_cases/`, `routers/`, `workers/`, `integrations/`)

**Story — Como time quero critérios de aceite M0 verdes no CI** (story `14`, tasks `15`–`16`)

- Task: Garantir `ruff check` e `ruff format --check` sem erros
- Task: Documentar comandos `uv` e `alembic` no README interno (se já existir padrão no repo)

---

## M1 — Auth & Users

**Épico:** registro, login, refresh, logout, roles JWT, rotação de refresh, soft delete. Detalhe: [M1-auth-users.md](./milestones/M1-auth-users.md).

**Story — Como paciente quero me registrar com email e senha** (`18`, `19`–`21`)

- Task: Model, migration e repository `User`
- Task: Use case `register_user` e `POST /v1/auth/register` (rate limit, Bruno)
- Task: Testes unitários (hash, JWT) e integração register → login

**Story — Como usuário quero login e tokens com refresh seguro** (`22`, `23`–`24`)

- Task: Use cases `login_user`, `refresh_token` e router `auth`
- Task: Bruno login/refresh e schemas `TokenResponse`

**Story — Como sistema quero roles patient, health_professional, admin** (`25`, `26`)

- Task: Schemas `UserCreate`/`UserResponse` e dependências `get_current_user` (gates por role)

---

## M2 — Patients

**Épico:** perfis, unidades de saúde, consentimentos, auditoria, minimização LGPD. Detalhe: [M2-patients.md](./milestones/M2-patients.md).

**Story — Como paciente quero ver e atualizar meu perfil clínico** (`28`, `29`–`31`)

- Task: Models `health_units`, `patient_profiles`, `consents` e migration `002`
- Task: Repositories e use cases get/update profile
- Task: Router `patient`, rate limits, Bruno

**Story — Como profissional quero listar e ler pacientes da minha unidade** (`32`, `33`–`34`)

- Task: Regras de acesso por unidade e `audit_logs` em leitura de perfil
- Task: Testes de integração e schema (isolamento por unidade)

**Story — Como produto quero consentimento registrado no cadastro** (`35`, `36`)

- Task: Fluxo de registro grava `consents` (integração com M1 se aplicável)

---

## M3 — Treatments & Doses

**Épico:** MDT PB/MB, `dose_logs`, `adherence_snapshots`, catálogo `symptoms`. Detalhe: [M3-treatments-doses.md](./milestones/M3-treatments-doses.md).

**Story — Como profissional quero prescrever tratamento com regime e datas** (`38`, `39`–`41`)

- Task: Models e migration `003` (sem CASCADE clínico)
- Task: `AdherenceService` e use cases `register_dose`, `get_adherence`
- Task: Router treatment, Bruno, testes unit e integração `dose_flow`

**Story — Como paciente quero registrar doses diárias do meu tratamento ativo** (`42`, `43`)

- Task: Validações `registered_by`, `supervised`, `frequency` (regras M3)

**Story — Como app quero catálogo `GET /v1/symptoms`** (`44`, `45`)

- Task: Seed ou migration de dados `symptoms` (leitura autenticada)

---

## M4 — Check-ins & Alerts

**Épico:** check-in diário, alertas, enqueue IA, resumos semanais. Detalhe: [M4-checkins-alerts.md](./milestones/M4-checkins-alerts.md).

**Story — Como paciente quero registrar check-in diário com humor e sintomas** (`47`, `48`–`50`)

- Task: Models e migration `004`
- Task: `SubmitCheckinUseCase`, `alert_service`, enqueue ARQ se `intensity >= 7`
- Task: Router checkin, rate limits, Bruno

**Story — Como sistema quero alertas automáticos após check-in** (`51`, `52`–`53`)

- Task: `AlertService.evaluate_after_checkin` e testes unitários
- Task: Endpoints GET alerts / PATCH resolve (profissional), isolamento por unidade

**Story — Como paciente quero histórico de check-ins** (`54`, `55`)

- Task: Use case `get_checkin_history` e testes de integração (fluxo com alertas)

---

## M5 — Body Map

**Épico:** `body_areas`, entradas, histórico imutável, upload (URL/key apenas). Detalhe: [M5-body-map.md](./milestones/M5-body-map.md).

**Story — Como paciente quero atualizar mapa corporal com achados** (`57`, `58`–`59`)

- Task: Model, migration `005`, repositories, use cases
- Task: Router body-map e catálogo `body-areas`

**Story — Como paciente quero histórico imutável ligado a check-ins** (`60`, `61`–`62`)

- Task: Integração com submit check-in (snapshot do mapa atual)
- Task: `GET` history (paciente e profissional mesma unidade)

**Story — Como paciente quero enviar foto de lesão sem armazenar bytes no PG** (`63`, `64`)

- Task: Endpoint upload (rate limit), `image_url`/`image_key` — object storage quando M10 estiver pronto

---

## M6 — Community

**Épico:** posts, comentários, likes, `author_anonymous_id` sem expor `user_id`. Detalhe: [M6-community.md](./milestones/M6-community.md).

**Story — Como paciente quero publicar e comentar de forma anônima** (`66`, `67`–`68`)

- Task: Models, migration `006`, repositórios, use cases (API nunca expõe `user_id`)
- Task: Router community, Bruno, testes de anonimização

**Story — Como admin quero moderar posts e fluxo deanonymize auditado** (`69`, `70`)

- Task: Regras `is_moderated`, `is_pinned`, admin only; auditoria em `community_anonymous_map`

**Story — Como paciente quero curtir posts** (`71`, `72`)

- Task: Use case `toggle_like` e validações (409 em like duplicado)

---

## M7 — Articles

**Épico:** biblioteca educativa, slug, Markdown, tags, publicação admin. Detalhe: [M7-articles.md](./milestones/M7-articles.md).

**Story — Como usuário autenticado quero listar e ler artigos publicados** (`74`, `75`–`76`)

- Task: Models, migration `007`, repositórios list/get
- Task: Router público, Bruno (não-admin só `is_published`)

**Story — Como admin quero CRUD de artigos e publicação** (`77`, `78`–`79`)

- Task: Use cases create/update, soft delete, capa via storage M10
- Task: Testes schema, slug, `view_count` não bloqueante

---

## M8 — Professional Dashboard

**Épico:** profissionais, vínculos, dashboard por snapshots, `audit_logs` append-only. Detalhe: [M8-professional.md](./milestones/M8-professional.md).

**Story — Como profissional quero meu cadastro CNS e unidade** (`81`, `82`–`83`)

- Task: Models e migration `008` (`health_professionals`, links, `audit_logs`)
- Task: Repositories e use cases link/unlink

**Story — Como profissional quero dashboard do paciente com snapshots** (`84`, `85`–`87`)

- Task: Use case `get_patient_dashboard` (contrato JSON M8)
- Task: Auditoria READ em todo GET de dados de paciente
- Task: Endpoints lista pacientes, alerts, Bruno, testes de isolamento

---

## M9 — ARQ Workers

**Épico:** jobs de adesão, notificação, resumo semanal, feedback IA; cron ARQ + Redis. Detalhe: [M9-workers.md](./milestones/M9-workers.md).

**Story — Como sistema quero job diário de adesão e alertas de baixa adesão** (`89`, `90`–`91`)

- Task: `workers/settings.py`, cron `adherence_job` / `notification_job`
- Task: `adherence_worker` e testes com mock de DB (idempotência upsert)

**Story — Como sistema quero resumo semanal de sintomas** (`92`, `93`)

- Task: `summary_worker` agregando check-ins (pacientes ativos)

**Story — Como sistema quero worker de notificações WhatsApp resilientes** (`94`, `95`)

- Task: `notification_worker` integrando cliente M10 (tipos de notificação M9)

**Story — Como sistema quero `ai_feedback_worker` assíncrono** (`96`, `97`)

- Task: Worker + enfileiramento M4; logs sem PII, Sentry

---

## M10 — Integrations

**Épico:** WhatsApp (Twilio/Evolution), object storage S3-compatible, Anthropic. Detalhe: [M10-integrations.md](./milestones/M10-integrations.md).

**Story — Como sistema quero cliente WhatsApp com providers configuráveis** (`99`, `100`)

- Task: `integrations/whatsapp.py` e testes com `pytest-mock` (sem API real no CI)

**Story — Como sistema quero object storage S3-compatible** (`101`, `102`)

- Task: `integrations/object_storage.py` (`aiobotocore`, variáveis `STORAGE_`)

**Story — Como sistema quero cliente IA para feedback de check-in** (`103`, `104`)

- Task: `integrations/ai_client.py` e testes mock Anthropic (prompt PT, sem diagnóstico)

---

## M11 — LGPD & Account

**Épico:** exclusão de conta, exportação JSON, consentimentos, blacklist Redis, `data_deletion_requests`. Detalhe: [M11-lgpd.md](./milestones/M11-lgpd.md).

**Story — Como paciente quero excluir minha conta com anonimização e remoção de mídias** (`106`, `107`–`109`)

- Task: Use cases `delete_account`, `anonymization_service`, router `account`
- Task: Migration `011` e fluxo `data_deletion_requests` append-only
- Task: Testes de integração (tokens, imagens, audit)

**Story — Como paciente quero exportar todos os meus dados em JSON** (`110`, `111`)

- Task: `export_account_data` (100% dos dados pessoais, rate limit)

**Story — Como usuário quero registrar e listar consentimentos de termos** (`112`, `113`)

- Task: Endpoints consent/consents e reforço de logs sem PII

---

## Notas de rastreabilidade

- Os **números entre parênteses** nas histórias correspondem à coluna **Work item ID** após importação no Jira (ou mapeamento manual no planejamento).
- Antigo modelo **EP-01 … EP-13** foi **substituído** por esta estrutura **M0–M11** para evitar divergência entre documentação, milestones.
