# Pequi API — Rotas e coleção Bruno

Contrato HTTP da API v1. Fonte: `docs/milestones/M*.md`.

**Base:** `{{baseUrl}}` (ex.: `http://localhost:8000`)  
**Auth:** Bearer JWT, exceto auth e `/health`.

---

## Status da coleção

| Pasta / arquivo `.bru` | Rotas | Status |
|------------------------|-------|--------|
| `patient/get_profile.bru` | `GET /v1/patients/me` | ✅ |
| `patient/update_profile.bru` | `PATCH /v1/patients/me` | ✅ |
| `auth/*` | M1 | 🔜 |
| `patient/*` (demais) | M2 | 🔜 |
| `treatment/`, `dose/` | M3 | 🔜 |
| `checkin/` | M4 | ✅ |
| `body_map/` | M5 | 🔜 |
| `community/` | M6 | 🔜 |
| `articles/` | M7 | 🔜 |
| `professional/` | M8 | 🔜 |
| `account/` | M11 | 🔜 |

---

## Infra

| Método | Rota | Auth | Bruno |
|--------|------|------|-------|
| `GET` | `/health` | — | — |

---

## Auth (M1)

| Método | Rota | Rate limit | Auth | Bruno |
|--------|------|------------|------|-------|
| `POST` | `/v1/auth/register` | 10/h IP | — | `auth/register.bru` |
| `POST` | `/v1/auth/login` | 5/min IP | — | `auth/login.bru` |
| `POST` | `/v1/auth/refresh` | 20/h usuário | refresh | `auth/refresh.bru` |
| `POST` | `/v1/auth/logout` | — | access | `auth/logout.bru` |

---

## Pacientes (M2)

| Método | Rota | Rate limit | Papel | Bruno |
|--------|------|------------|-------|-------|
| `GET` | `/v1/patients/me` | 100/min | patient | `patient/get_profile.bru` ✅ |
| `PATCH` | `/v1/patients/me` | 20/min | patient | `patient/update_profile.bru` ✅ |
| `GET` | `/v1/patients` | 100/min | professional, admin | `patient/list_patients.bru` |
| `GET` | `/v1/patients/{id}` | 100/min | professional, admin | `patient/get_patient.bru` |
| `GET` | `/v1/patients/me/journey` | 100/min | patient | `patient/get_journey.bru` |

---

## Tratamentos e doses (M3)

| Método | Rota | Rate limit | Papel | Bruno |
|--------|------|------------|-------|-------|
| `POST` | `/v1/treatments` | 10/min | professional | `treatment/create_treatment.bru` |
| `GET` | `/v1/treatments/{id}` | 100/min | patient, professional | `treatment/get_treatment.bru` |
| `POST` | `/v1/treatments/{id}/doses` | 20/min | patient, professional | `dose/register_dose.bru` |
| `GET` | `/v1/treatments/{id}/adherence` | 100/min | patient, professional | `treatment/get_adherence.bru` |
| `GET` | `/v1/symptoms` | 200/min | autenticado | `treatment/list_symptoms.bru` |

---

## Check-ins e alertas (M4)

| Método | Rota | Rate limit | Papel | Bruno |
|--------|------|------------|-------|-------|
| `POST` | `/v1/checkins` | 10/min | patient | `checkin/submit_checkin.bru` |
| `GET` | `/v1/checkins` | 100/min | patient | `checkin/get_history.bru` |
| `GET` | `/v1/checkins/{id}` | 100/min | patient, professional | `checkin/get_checkin.bru` |
| `GET` | `/v1/alerts` | 100/min | patient, professional | `checkin/list_alerts.bru` |
| `PATCH` | `/v1/alerts/{id}/resolve` | 20/min | professional | `checkin/resolve_alert.bru` |

---

## Mapa corporal (M5)

| Método | Rota | Rate limit | Papel | Bruno |
|--------|------|------------|-------|-------|
| `GET` | `/v1/body-map` | 100/min | patient | `body_map/get_body_map.bru` |
| `PUT` | `/v1/body-map` | 20/min | patient | `body_map/update_body_map.bru` |
| `GET` | `/v1/body-map/history` | 100/min | patient, professional | `body_map/get_history.bru` |
| `GET` | `/v1/body-areas` | 200/min | autenticado | `body_map/list_body_areas.bru` |
| `POST` | `/v1/body-map/upload` | 5/min | patient | `body_map/upload_image.bru` |

---

## Comunidade (M6)

| Método | Rota | Rate limit | Papel | Bruno |
|--------|------|------------|-------|-------|
| `GET` | `/v1/community/posts` | 100/min | autenticado | `community/list_posts.bru` |
| `POST` | `/v1/community/posts` | 20/h | patient | `community/create_post.bru` |
| `GET` | `/v1/community/posts/{id}` | 100/min | autenticado | `community/get_post.bru` |
| `POST` | `/v1/community/posts/{id}/comments` | 30/h | patient | `community/create_comment.bru` |
| `POST` | `/v1/community/posts/{id}/like` | 60/h | patient | `community/like_post.bru` |
| `DELETE` | `/v1/community/posts/{id}` | 10/h | autor, admin | `community/delete_post.bru` |
| `PATCH` | `/v1/community/posts/{id}/moderate` | 20/h | admin | `community/moderate_post.bru` |
| `GET` | `/v1/admin/community/deanonymize/{anonymous_id}` | — | admin (auditado) | `community/admin_deanonymize.bru` |

---

## Artigos (M7)

| Método | Rota | Rate limit | Papel | Bruno |
|--------|------|------------|-------|-------|
| `GET` | `/v1/articles` | 100/min | autenticado | `articles/list_articles.bru` |
| `GET` | `/v1/articles/{slug}` | 100/min | autenticado | `articles/get_article.bru` |
| `GET` | `/v1/articles/tags` | 200/min | autenticado | `articles/list_tags.bru` |
| `POST` | `/v1/articles` | 10/h | admin | `articles/create_article.bru` |
| `PATCH` | `/v1/articles/{id}` | 10/h | admin | `articles/update_article.bru` |
| `DELETE` | `/v1/articles/{id}` | 10/h | admin | `articles/delete_article.bru` |

---

## Profissional (M8)

| Método | Rota | Rate limit | Papel | Bruno |
|--------|------|------------|-------|-------|
| `GET` | `/v1/professionals/me` | 100/min | professional | `professional/get_profile.bru` |
| `GET` | `/v1/professionals/me/patients` | 100/min | professional | `professional/list_patients.bru` |
| `GET` | `/v1/professionals/me/patients/{id}/dashboard` | 100/min | professional | `professional/get_dashboard.bru` |
| `POST` | `/v1/professionals/me/patients/{id}/link` | 20/min | professional | `professional/link_patient.bru` |
| `DELETE` | `/v1/professionals/me/patients/{id}/link` | 20/min | professional | `professional/unlink_patient.bru` |
| `GET` | `/v1/professionals/me/alerts` | 100/min | professional | `professional/list_alerts.bru` |

---

## Conta e LGPD (M11)

| Método | Rota | Rate limit | Papel | Bruno |
|--------|------|------------|-------|-------|
| `DELETE` | `/v1/account` | 1/h | patient | `account/delete_account.bru` |
| `GET` | `/v1/account/export` | 1/h | patient | `account/export_data.bru` |
| `POST` | `/v1/account/consent` | 5/h | autenticado | `account/post_consent.bru` |
| `GET` | `/v1/account/consents` | 20/min | autenticado | `account/list_consents.bru` |

---

## Fora do escopo HTTP (sem `.bru`)

- **M9** — workers ARQ (adesão, notificações, resumos).
- **M10** — integrações (WhatsApp, storage, IA); consumidas internamente.

---

## Convenções Bruno

1. Um `.bru` por rota (ou por fluxo documentado no milestone).
2. `auth: bearer` + variável `{{token}}` nas rotas protegidas.
3. `assert {}` com status e campos obrigatórios da resposta.
4. Ambientes em `environments/` — selecionar **dev** (local) ou **staging** no Bruno; preencher `token` após login.

Detalhes de payload e critérios de aceite: `docs/milestones/`.
