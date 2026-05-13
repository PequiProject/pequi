# IMPLEMENTATION_PLAN.md — Projeto Pequi

> Plano de implementação do **backend** alinhado a, [`docs/EPICS.md`](./EPICS.md), [`docs/ROADMAP.md`](./ROADMAP.md) e [`docs/milestones/`](./milestones/README.md).  
> Stack de referência: Python · UV · FastAPI · SQLAlchemy 2.0 async · PostgreSQL/PostGIS · Redis · ARQ · Alembic · Pydantic · JWT · Sentry · structlog

---

## 1. Fontes canônicas e estado

| Fonte | Uso |
|--------|-----|
| [`docs/milestones/M*.md`](./milestones/README.md) | Modelos, endpoints, critérios de aceite, nomes de arquivos e migrações **por marco** |
| | Hierarquia Jira **Epic → Story → Task** e labels `milestone-M*` |
| [`AGENTS.md`](../AGENTS.md) (raiz do backend, se aplicável) | Cadeia de camadas, CI, testes, Bruno, LGPD em código |

O estado exato do código no repositório evolui — antes de implementar, confira o que já existe em `src/` e testes. Este plano **não substitui** os arquivos `M*.md` para detalhe técnico.

---

## 2. Objetivos

### Produto

1. Acompanhamento de hanseníase: tratamento, doses, check-ins, mapa corporal e alertas.
2. Visão do profissional por unidade, com auditoria e leitura de **snapshots** (adesão e resumos).
3. Comunidade **anonimizada** e artigos educativos.
4. Conformidade LGPD no MVP: exportação, exclusão de conta, consentimentos e rastreabilidade (M11).

### Engenharia

1. Camadas: `routers → use_cases → services → repositories → database` (sem atalhos).
2. API versionada sob `/v1/`.
3. Processamento assíncrono (ARQ) para adesão, resumos, notificações e feedback de IA.
4. Testes (`scripts/run_tests.sh` no backend) e contratos Bruno por endpoint novo.

---

## 3. Decisões arquiteturais (resumo)

### 3.1 Cadeia de dependências entre camadas (inviolável)

```
routers → use_cases → services → repositories → database (AsyncSession)
```

**Proibido:** SQL em service; regra de negócio em model ORM; acesso direto ao banco no router.

### 3.2 Dados e integridade

- PostgreSQL com imagem **PostGIS**; uso geoespacial é opcional no MVP — ver marcos.
- **Sem `CASCADE DELETE`** em entidades clínicas; preferir `ON DELETE RESTRICT`.
- Soft delete: padrão `deleted_at TIMESTAMPTZ NULL` (não introduzir `is_deleted` paralelo).

### 3.3 Métricas e painel

- Adesão e resumos para painel: ler **`adherence_snapshots`** e **`weekly_symptom_summaries`** (calculados por workers), não agregar transacionalmente em request de dashboard.

### 3.4 Comunidade

- APIs expõem apenas **`author_anonymous_id`**; mapeamento interno em `community_anonymous_map` com acesso restrito e auditado (ver M6).

### 3.5 Mídia

- Imagens: **object storage** (MinIO/R2); no banco apenas `image_url` / `image_key` — nunca `bytea` de foto.

### 3.6 IA e notificações

- Feedback de IA: **assíncrono** (enfileirado a partir do fluxo de check-in quando aplicável — ver M4/M9/M10).
- Notificações MVP: canal WhatsApp via integração configurável (M10), consumida pelos workers (M9).

---

## 4. Sequência de marcos (incremental)

Cada marco entrega código testado e documentado nos próprios `M*.md` (Bruno + critérios).

```
M0 → M1 → M2 → M3 → M4 → ramificações:
       M4 → M5, M9, M10
       M2 → M6, M7
       M4 → M8
M11 após M1..M10
```

Árvore equivalente à de [`docs/milestones/README.md`](./milestones/README.md).

---

## 5. Marcos em uma página (com backlog CSV)

Para cada marco: descrição alinhada ao **épico** no CSV; histórias são as linhas **Story** com label `milestone-M*` no `export-hira.csv`. Tarefas: linhas **Task** filhas no CSV (detalhadas em [`docs/EPICS.md`](./EPICS.md)).

| Marco | Foco principal | Documento técnico |
|--------|----------------|-------------------|
| **M0** | UV, Docker, FastAPI, health, Alembic async, core (auth/rate/exceptions/logging/security), scaffolding | [M0-foundation.md](./milestones/M0-foundation.md) |
| **M1** | Users, JWT, refresh, logout, roles, repos e rotas `/v1/auth/*` | [M1-auth-users.md](./milestones/M1-auth-users.md) |
| **M2** | `health_units`, `patient_profiles`, `consents`; `/v1/patients/me`; leitura profissional + audit | [M2-patients.md](./milestones/M2-patients.md) |
| **M3** | Tratamentos, doses, sintomas catálogo, `AdherenceService`, snapshots persistidos para leitura | [M3-treatments-doses.md](./milestones/M3-treatments-doses.md) |
| **M4** | Check-ins, alertas, `weekly_symptom_summaries` (tabela), enqueue IA | [M4-checkins-alerts.md](./milestones/M4-checkins-alerts.md) |
| **M5** | Body map, histórico imutável, upload (com M10) | [M5-body-map.md](./milestones/M5-body-map.md) |
| **M6** | Comunidade anônima, likes, moderação admin | [M6-community.md](./milestones/M6-community.md) |
| **M7** | Artigos, tags, slug, publicação | [M7-articles.md](./milestones/M7-articles.md) |
| **M8** | Profissionais, vínculos, dashboard agregado, `audit_logs` append-only | [M8-professional.md](./milestones/M8-professional.md) |
| **M9** | `WorkerSettings`, crons e jobs: adesão, notificação, resumo semanal, IA | [M9-workers.md](./milestones/M9-workers.md) |
| **M10** | `WhatsAppClient`, `ObjectStorageClient`, `AIClient` + testes com mocks | [M10-integrations.md](./milestones/M10-integrations.md) |
| **M11** | Conta: delete/export/consent; Redis blacklist; `data_deletion_requests`; anonimização | [M11-lgpd.md](./milestones/M11-lgpd.md) |

**Implementação:** seguir a ordem de dependências; usar o CSV como checklist de sprint; usar `M*.md` para nomes de tabelas, endpoints e testes.

---

## 6. Dependências entre marcos (diagrama)

```
M0
 └── M1
       └── M2
             ├── M3
             │     └── M4
             │           ├── M5
             │           ├── M9
             │           └── M10
             ├── M6
             ├── M7
             └── M8
M11 — depende de M1..M10
```

Paralelismo possível após M2/M4 conforme capacidade (M6 vs M7; M10 quando a fila e os clientes forem necessários).

---

## 7. Critérios globais (resumo)

- Prefixo `/v1/` em rotas públicas.
- Rate limit explícito em endpoints sensíveis (auth, escrita clínica, comunidade, export).
- Migrações Alembic com `upgrade` e `downgrade`.
- Bruno atualizado junto com endpoints novos.
- Sentry: `send_default_pii=False`; logs sem PII.
- Comunidade: respostas sem vazamento de `user_id`.
- Painel profissional: leitura de snapshots onde definido nos marcos.

---

## 8. Riscos (matriz curta)

| Risco | Mitigação |
|--------|-----------|
| Divergência entre PRD antigo e milestones | Tratar `docs/milestones/` + CSV como fonte de verdade |
| Cálculo pesado em request | Reforçar uso de snapshots e workers (M3/M8/M9) |
| Falha de provedor externo (IA/WhatsApp) | Retry, backoff, não derrubar fluxo síncrono do paciente (ver M9/M10) |
| LGPD vs retenção clínica | Fluxo M11 + anonimização descrita no M11 |

---

## 9. Fora de escopo do MVP (exemplos)

- Integração profunda com sistemas SUS/RNDS.
- Telemedicina nativa.
- i18n além de PT-BR.
- Múltiplos provedores de IA concorrentes.

(Ajustar conforme decisão de produto.)

---

## 10. Regras obrigatórias (checklist)

1. Nunca `CASCADE DELETE` em dados clínicos.
2. Nunca armazenar fotos de lesão como `bytea` no PostgreSQL.
3. Nunca calcular dashboard médico em cima só de tabelas transacionais pesadas — usar snapshots.
4. Nunca expor `user_id` nas APIs públicas da comunidade.
5. Nunca misturar `audit_logs` com logs de aplicação.
6. Sempre auditar acessos sensíveis conforme M2/M6/M8/M11.

---

## 11. Histórico deste documento

Versões anteriores deste plano continham modelos e endpoints **genéricos** que podiam divergir dos marcos. A partir de maio/2026 o plano foi **refatorado** para obedecer estritamente a **`export-hira.csv`**, **`docs/milestones/`** e **`docs/EPICS.md`**.
