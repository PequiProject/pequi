# ROADMAP.md — Projeto Pequi

> Roadmap de produto alinhado aos marcos em [`docs/milestones/`](./milestones/README.md) e ao backlog importável em .  
> Atualizado em: maio de 2026

---

## Visão

Tornar o acompanhamento de hanseníase acessível, contínuo e humanizado — conectando paciente e profissional em um fluxo clínico digital que melhora adesão ao tratamento e reduz incapacidades, com **LGPD** e **anonimato na comunidade** como requisitos de arquitetura.

---

## Princípios do roadmap

- **Clínico primeiro:** cada marco entrega código testado e valor verificável (critérios em `docs/milestones/M*.md`).
- **Compliance by design:** consentimento, minimização de dados, auditoria e M11 (conta e LGPD) fecham o ciclo.
- **Incremental e deployável:** cada milestone = entrega independente confirmável antes do próximo ([README milestones](./milestones/README.md)).
- **Backlog rastreável:** épicos, histórias e tarefas espelham o CSV — labels `milestone-M0` … `milestone-M11`.

---

## Visão geral dos marcos (alinhada ao `export-hira.csv`)

| Marco | Nome (épico CSV) | Entrega principal | Doc |
|--------|------------------|-------------------|-----|
| M0 | Foundation | Stack local, FastAPI, health, Alembic, core, CI | [M0](./milestones/M0-foundation.md) |
| M1 | Auth & Users | JWT, refresh, roles, rate limit auth | [M1](./milestones/M1-auth-users.md) |
| M2 | Patients | Perfil paciente, unidade, consentimento, leitura profissional auditada | [M2](./milestones/M2-patients.md) |
| M3 | Treatments & Doses | MDT PB/MB, doses, adesão via snapshots (não tempo real na API) | [M3](./milestones/M3-treatments-doses.md) |
| M4 | Check-ins & Alerts | Check-in diário, alertas, enqueue IA | [M4](./milestones/M4-checkins-alerts.md) |
| M5 | Body Map | Mapa corporal, histórico imutável, upload URL/key | [M5](./milestones/M5-body-map.md) |
| M6 | Community | Comunidade anônima, moderação admin auditada | [M6](./milestones/M6-community.md) |
| M7 | Articles | Artigos educativos, tags, admin | [M7](./milestones/M7-articles.md) |
| M8 | Professional Dashboard | Profissional, vínculos, dashboard snapshots, `audit_logs` | [M8](./milestones/M8-professional.md) |
| M9 | ARQ Workers | Cron e jobs: adesão, notificações, resumo semanal, IA | [M9](./milestones/M9-workers.md) |
| M10 | Integrations | WhatsApp, object storage, Anthropic | [M10](./milestones/M10-integrations.md) |
| M11 | LGPD & Account | Exclusão conta, exportação JSON, consentimentos, rastreabilidade | [M11](./milestones/M11-lgpd.md) |

**Duração total estimada:** ordem de **16–22 semanas** (4–5 meses) com squad de 2–3 engenheiros — ajustar por velocidade real. O detalhamento de tarefas está no CSV e em [`docs/EPICS.md`](./EPICS.md).

---

## Cadeia de dependências (canônica)

Igual ao diagrama em [`docs/milestones/README.md`](./milestones/README.md):

```
M0 (Foundation)
 └── M1 (Auth & Users)
       └── M2 (Patients)
             ├── M3 (Treatments & Doses)
             │     └── M4 (Check-ins & Alerts)
             │           ├── M5 (Body Map)
             │           ├── M9 (ARQ Workers)
             │           └── M10 (Integrations)
             ├── M6 (Community)
             ├── M7 (Articles)
             └── M8 (Professional Dashboard)
M11 (LGPD) — depende de M1..M10 (fecha o ciclo)
```

- **M10** na prática alimenta workers (M9), body map upload (M5) e exclusão de mídias (M11); o marco M10 está na ramificação a partir de M4 no README para refletir a ordem de entrega planejada no backlog.
- **M8** depende de M4 (e do que M4/M3 acumulam sobre dados clínicos); profissionais e `audit_logs` estão no escopo M8 conforme milestone.

---

## M0 — Foundation

**Objetivo:** Tooling, Docker, FastAPI com `GET /health`, PostgreSQL/PostGIS, Redis, Alembic async, structlog, Sentry, rate limit, scaffolding de camadas.

**Dependências:** nenhuma.

**Backlog:** label `milestone-M0` no CSV; histórias sobre Docker, app/config/DB, core HTTP, CI.

---

## M1 — Auth & Users

**Objetivo:** Registro, login, refresh com rotação, logout, roles, rate limits documentados nos milestones.

**Dependências:** M0.

**Backlog:** `milestone-M1`.

---

## M2 — Patients

**Objetivo:** `health_units`, `patient_profiles`, `consents`; paciente `me`; profissional lista/lê com auditoria; sem endereço completo na API.

**Dependências:** M1.

**Backlog:** `milestone-M2`.

---

## M3 — Treatments & Doses

**Objetivo:** Tratamento PB/MB, doses, `adherence_snapshots` (leitura de adesão **via snapshot**, não cálculo pesado em tempo real no painel).

**Dependências:** M2.

**Backlog:** `milestone-M3`.

---

## M4 — Check-ins & Alerts

**Objetivo:** Check-in diário (409 se duplicado), alertas pós-check-in, enqueue de feedback IA quando intensidade alta.

**Dependências:** M3.

**Backlog:** `milestone-M4`.

---

## M5 — Body Map

**Objetivo:** Catálogo de áreas, entradas atuais, histórico append-only, snapshot opcional com check-in; imagens só via storage (M10).

**Dependências:** M4 (e M10 para upload integrado).

**Backlog:** `milestone-M5`.

---

## M6 — Community

**Objetivo:** Posts, comentários, likes; anonimização técnica; moderação e auditoria admin.

**Dependências:** M2.

**Backlog:** `milestone-M6`.

---

## M7 — Articles

**Objetivo:** Biblioteca educativa com publicação, tags e leitura para autenticados.

**Dependências:** M2.

**Backlog:** `milestone-M7`.

---

## M8 — Professional Dashboard

**Objetivo:** Cadastro profissional, vínculos, dashboard consolidado por **snapshots**, `audit_logs` append-only em leituras de paciente.

**Dependências:** M4 (fluxo de dados clínico e alertas).

**Backlog:** `milestone-M8`.

---

## M9 — ARQ Workers

**Objetivo:** Jobs e crons (adesão diária, resumo semanal, notificações, IA assíncrona) conforme [M9-workers.md](./milestones/M9-workers.md).

**Dependências:** M4; integrações reais em M10.

**Backlog:** `milestone-M9`.

---

## M10 — Integrations

**Objetivo:** Clientes WhatsApp, S3-compatible storage, Anthropic — mockáveis em testes.

**Dependências:** encadeamento no README a partir de M4; uso pleno por M5, M9 e M11.

**Backlog:** `milestone-M10`.

---

## M11 — LGPD & Account

**Objetivo:** `DELETE /v1/account`, `GET /v1/account/export`, consentimentos; bloqueio com tratamento ativo; Redis blacklist de tokens; `data_deletion_requests`.

**Dependências:** M1–M10.

**Backlog:** `milestone-M11`.

---

## Linha do tempo (indicativa)

Marcos **M6** e **M7** podem avançar em paralelo entre si após **M2**; **M10** pode ser puxado quando M4 abrir caminho para workers e uploads, conforme capacidade do time. **M11** fecha após integrações e fluxos de dados estarem presentes.

```
Semanas →     1    2    3    4    5    6    7    8    9   10   11   12   13   14   15   16   17   18   19   20   21   22
              ├────┤    ├────┤    ├────┤    ├────┤    ├────┤    ├────┤    ├────┤    ├────┤    ├────┤    ├────┤    ├────┤

M0            ████
M1                 ████
M2                      ████████
M3                               ████████
M4                                        ████████
M10                              …───────────────────────────────oooo  (paralelo quando viável)
M5                                                     ████████
M6                                                          ████████
M7                                                     ████
M8                                                                 ████████
M9                                                                          ████████
M11                                                                                 ████████████
```

---

## Métricas de sucesso do produto

| Métrica | Meta MVP | Meta 6 meses |
|---------|-----------|----------------|
| Adesão (pacientes com alta taxa de doses registradas) | baseline | +15% vs baseline |
| Resposta a alerta crítico (profissional) | < 24 h | < 4 h |
| Dias com check-in (paciente ativo) | > 50% | > 70% |
| Satisfação (CSAT) | — | > 4,0 / 5 |
| Tempo até feedback IA após enqueue | < 5 min | < 2 min |
| Incidentes de vazamento de dados | 0 | 0 |

---

## Onde está o detalhe de implementação

- **Histórias e tarefas por marco:**  e [`docs/EPICS.md`](./EPICS.md).
- **Contratos HTTP, modelos e critérios de aceite:** `docs/milestones/M*.md` e coleções Bruno no backend (`bruno/`, conforme `AGENTS.md`).
