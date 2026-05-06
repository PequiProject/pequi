# AGENTS.md — Projeto Pequi

> Guia de desenvolvimento para assistentes de IA e desenvolvedores trabalhando no codebase do Projeto Pequi.
> Aplicativo de saúde para acompanhamento de hanseníase.
> Stack: Python · UV · Pydantic · FastAPI · SQLAlchemy 2.0 · PostgreSQL · Redis

---

## Ambiente de desenvolvimento

```bash
# Ativar virtualenv (UV)
source .venv/bin/activate

# Instalar dependências
uv sync

# Aplicar migrações
alembic upgrade head

# Subir toda a stack local
docker compose up -d

# Rodar testes
scripts/run_tests.sh
```

---

## Estrutura do projeto

O arquivo de contagens muda constantemente — não trate a árvore abaixo como exaustiva. A fonte canônica é o próprio sistema de arquivos. As notas destacam os pontos de entrada principais.

```
pequi-backend/
├── pyproject.toml              # UV + dependências
├── docker-compose.yml          # PostgreSQL, Redis, MinIO, Sentry (local)
├── Dockerfile
├── .env.example
├── alembic/
│   ├── env.py
│   └── versions/
├── src/
│   └── pequi/
│       ├── main.py             # FastAPI app factory
│       ├── config.py           # Settings via Pydantic BaseSettings
│       ├── database.py         # Engine, AsyncSession, Base
│       │
│       ├── models/             # SQLAlchemy ORM models (grupos A–H)
│       │   ├── user.py
│       │   ├── patient.py
│       │   ├── treatment.py
│       │   ├── checkin.py
│       │   ├── body_map.py
│       │   ├── community.py
│       │   ├── article.py
│       │   └── ...
│       │
│       ├── schemas/            # Pydantic schemas (request/response/internal)
│       │   ├── user.py
│       │   ├── checkin.py
│       │   ├── treatment.py
│       │   └── ...
│       │
│       ├── repositories/       # Acesso ao banco (queries — sem lógica de negócio)
│       │   ├── base.py         # BaseRepository genérico
│       │   ├── patient_repo.py
│       │   ├── checkin_repo.py
│       │   └── ...
│       │
│       ├── services/           # Lógica de negócio (stateless, testável)
│       │   ├── adherence_service.py
│       │   ├── alert_service.py
│       │   ├── ai_feedback_service.py
│       │   └── notification_service.py
│       │
│       ├── use_cases/          # Orquestração de serviços por feature
│       │   ├── submit_checkin.py
│       │   ├── register_dose.py
│       │   └── get_patient_dashboard.py
│       │
│       ├── routers/            # FastAPI routers (HTTP apenas — sem lógica)
│       │   ├── auth.py
│       │   ├── patient.py
│       │   ├── checkin.py
│       │   ├── body_map.py
│       │   ├── community.py
│       │   └── professional.py
│       │
│       ├── workers/            # ARQ jobs assíncronos
│       │   ├── adherence_worker.py
│       │   ├── notification_worker.py
│       │   ├── summary_worker.py
│       │   └── settings.py
│       │
│       ├── integrations/       # Clientes externos
│       │   ├── whatsapp.py           # Twilio / Evolution API
│       │   ├── object_storage.py     # aiobotocore (MinIO / Cloudflare R2)
│       │   └── ai_client.py          # Anthropic API
│       │
│       └── core/
│           ├── auth.py               # JWT, hashing (python-jose + bcrypt)
│           ├── dependencies.py       # FastAPI Depends
│           ├── exceptions.py
│           ├── logging.py            # structlog
│           ├── rate_limit.py         # slowapi + Redis
│           └── security.py
│
├── tests/
│   ├── conftest.py
│   ├── unit/
│   │   ├── test_adherence_service.py
│   │   ├── test_alert_service.py
│   │   └── test_checkin_schema.py
│   ├── integration/
│   │   ├── test_checkin_flow.py
│   │   ├── test_dose_flow.py
│   │   └── test_community_anonymization.py
│   └── e2e/
│       └── test_patient_journey.py
│
├── bruno/                      # Coleções Bruno API (contratos de endpoints)
│   ├── auth/
│   ├── checkin/
│   ├── patient/
│   └── professional/
│
├── .github/
│   └── workflows/
│       ├── ci.yml              # lint + testes em todo PR
│       └── deploy.yml          # deploy após merge em main
│
└── scripts/
    └── run_tests.sh
```

---

## Cadeia de dependências

```
routers/ (HTTP)
  → use_cases/ (orquestração)
     → services/ (lógica de negócio)
        → repositories/ (queries SQLAlchemy)
           → database.py (AsyncSession)
```

Nunca acesse o banco direto no router. Nunca coloque lógica de negócio no model ORM. Nunca coloque queries SQL no service.

---

## Padrão de camadas — exemplo completo (submissão de check-in)

```python
# routers/checkin.py
@router.post("/v1/checkins", response_model=CheckinResponse, status_code=201)
async def submit_checkin(
    body: CheckinCreate,
    patient: PatientProfile = Depends(get_current_patient),
    use_case: SubmitCheckinUseCase = Depends(),
):
    return await use_case.execute(patient_id=patient.id, data=body)


# use_cases/submit_checkin.py
class SubmitCheckinUseCase:
    def __init__(
        self,
        checkin_repo: CheckinRepository,
        alert_service: AlertService,
        ai_service: AIFeedbackService,
        notification_service: NotificationService,
    ): ...

    async def execute(self, patient_id: UUID, data: CheckinCreate) -> CheckinResponse:
        checkin = await self.checkin_repo.create(patient_id, data)
        await self.alert_service.evaluate_after_checkin(checkin)
        if data.symptom_intensity >= 7:
            feedback = await self.ai_service.generate_feedback(checkin)
            await self.checkin_repo.update_ai_feedback(checkin.id, feedback)
            await self.notification_service.send_feedback(patient_id, feedback)
        return CheckinResponse.model_validate(checkin)
```

---

## Versionamento de API

Toda rota pública deve incluir o prefixo de versão: `/v1/`, `/v2/`, etc.

```python
# main.py
from fastapi import FastAPI
from pequi.routers import checkin, patient, auth

app = FastAPI(title="Pequi API")

app.include_router(auth.router,    prefix="/v1/auth",    tags=["auth"])
app.include_router(patient.router, prefix="/v1/patients", tags=["patients"])
app.include_router(checkin.router, prefix="/v1/checkins", tags=["checkins"])
```

Regras de versionamento:
- Breaking changes (remoção de campo, mudança de tipo) exigem incremento de versão principal (`v1` → `v2`).
- Additive changes (novos campos opcionais, novos endpoints) não precisam de nova versão.
- Manter a versão anterior ativa por no mínimo 2 sprints após lançar a nova.
- Nunca remova `/v1` enquanto o app mobile em produção ainda depender dele — coordenar com time de front.

---

## Rate limiting

Implementado via `slowapi` + Redis. Configurado em `core/rate_limit.py`.

```python
# core/rate_limit.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, storage_uri=settings.REDIS_URL)

# Aplicar no router
@router.post("/v1/checkins")
@limiter.limit("10/minute")
async def submit_checkin(request: Request, ...):
    ...
```

Limites padrão por endpoint:

| Endpoint | Limite | Janela |
|---|---|---|
| `POST /auth/login` | 5 tentativas | por minuto por IP |
| `POST /checkins` | 10 requisições | por minuto por usuário |
| `POST /community/posts` | 20 posts | por hora por usuário |
| `GET /articles` | 100 requisições | por minuto por usuário |
| endpoints de admin | 200 requisições | por minuto por IP |

Ao adicionar um novo endpoint sensível (autenticação, escrita em prontuário, upload de imagem), sempre definir o limite explicitamente. Não confiar no limite global.

---

## Docker e docker-compose

Toda a stack de desenvolvimento roda via `docker compose up -d`. O `Dockerfile` de produção usa multi-stage build.

```yaml
# docker-compose.yml (desenvolvimento)
services:
  api:
    build: .
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql+asyncpg://pequi:pequi@db:5432/pequi
      REDIS_URL: redis://redis:6379/0
      STORAGE_ENDPOINT: http://minio:9000
    depends_on: [db, redis, minio]
    volumes:
      - ./src:/app/src   # hot reload em dev

  db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_USER: pequi
      POSTGRES_PASSWORD: pequi
      POSTGRES_DB: pequi
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports: ["9000:9000", "9001:9001"]
    volumes:
      - miniodata:/data

  worker:
    build: .
    command: python -m arq pequi.workers.settings.WorkerSettings
    environment:
      REDIS_URL: redis://redis:6379/0
    depends_on: [redis, db]

volumes:
  pgdata:
  redisdata:
  miniodata:
```

Regras de Docker:
- Nunca commitar arquivos `.env` com segredos reais. Usar `.env.example` como template.
- A imagem de produção não deve conter o código-fonte em volume — apenas o build final.
- Usar `postgis/postgis` (não `postgres` plain) para garantir a extensão PostGIS disponível.
- O serviço `worker` roda os jobs ARQ em processo separado — não embutir no mesmo container da API.

---

## CI/CD

Dois workflows GitHub Actions: `ci.yml` (roda em todo PR) e `deploy.yml` (roda após merge em `main`).

### ci.yml

```yaml
# .github/workflows/ci.yml
name: CI
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env:
          POSTGRES_USER: pequi
          POSTGRES_PASSWORD: pequi
          POSTGRES_DB: pequi_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
      redis:
        image: redis:7-alpine
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: uv sync
      - run: uv run ruff check .
      - run: uv run ruff format --check .
      - run: scripts/run_tests.sh
```

### deploy.yml

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build e push imagem Docker
        run: |
          docker build -t $IMAGE_TAG .
          docker push $IMAGE_TAG
      - name: Aplicar migrações
        run: alembic upgrade head
      - name: Deploy (Fly.io / Railway / VPS — configurar aqui)
        run: echo "configurar deploy target"
```

Regras de CI:
- Nenhum PR pode ser mergeado com testes falhando ou lint quebrando.
- O `deploy.yml` só é disparado em `main` — nunca em branches de feature.
- Secrets (API keys, DATABASE_URL de produção) ficam apenas no GitHub Secrets, nunca no código.
- Migrações Alembic sempre rodam antes do novo container subir em produção.

---

## Sentry

Monitoramento de erros e performance em produção. Configurado em `main.py` e `config.py`.

```python
# main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    integrations=[FastApiIntegration(), SqlalchemyIntegration()],
    traces_sample_rate=0.2,   # 20% das requisições em produção
    profiles_sample_rate=0.1,
    environment=settings.ENV,  # "development" | "staging" | "production"
    send_default_pii=False,    # nunca enviar dados pessoais ao Sentry (LGPD)
)
```

Regras de Sentry:
- `send_default_pii=False` é mandatório — dados de pacientes não podem sair do ambiente controlado.
- Nunca logar como `extra` campos como `patient_id` real, CPF, nome ou qualquer dado sensível. Usar apenas IDs internos (UUIDs).
- Em desenvolvimento e testes, `SENTRY_DSN` deve ser vazio ou apontar para projeto sandbox separado.
- O `traces_sample_rate` em produção deve ser calibrado para não aumentar latência perceptível.
- Configurar alertas de Sentry para erros `500` em endpoints críticos (`/checkins`, `/auth/login`, `/doses`).

---

## Testes

**Sempre usar `scripts/run_tests.sh`** — não chamar `pytest` diretamente. O script garante paridade com CI (variáveis de credencial removidas, TZ=UTC, LANG=C.UTF-8, 4 workers xdist).

```bash
scripts/run_tests.sh                                   # suite completa
scripts/run_tests.sh tests/unit/                       # apenas unitários
scripts/run_tests.sh tests/integration/test_checkin_flow.py  # arquivo específico
scripts/run_tests.sh -v --tb=long                      # flags passadas ao pytest
```

### Três camadas de teste

**Unitários (`tests/unit/`)**: testam um único service ou schema em isolamento total. Sem banco, sem Redis, sem HTTP. Usar `pytest-mock` para dependências externas.

```python
# tests/unit/test_adherence_service.py
async def test_calcula_adesao_corretamente():
    doses = [
        DoseLog(expected_at=..., taken_at=..., skipped=False),   # tomada
        DoseLog(expected_at=..., taken_at=None, skipped=True),   # pulada
        DoseLog(expected_at=..., taken_at=None, skipped=False),  # perdida
    ]
    result = AdherenceService.calculate_pct(doses)
    assert result == Decimal("33.33")
```

**Integração (`tests/integration/`)**: testam um fluxo completo via banco de dados real (PostgreSQL em container, via `conftest.py`). Sem HTTP — chamar use cases diretamente.

```python
# tests/integration/test_checkin_flow.py
async def test_checkin_gera_alerta_quando_intensidade_alta(db_session, patient_factory):
    patient = await patient_factory.create()
    use_case = SubmitCheckinUseCase(...)
    result = await use_case.execute(patient_id=patient.id, data=CheckinCreate(
        mood="terrible", symptom_intensity=9, symptom_ids=[...]
    ))
    alerts = await AlertRepository(db_session).list_active(patient.id)
    assert any(a.type == "symptom_spike" for a in alerts)
```

**E2E (`tests/e2e/`)**: testam via HTTP real usando `httpx.AsyncClient` contra a app FastAPI. Reservado para jornadas críticas (cadastro → check-in → alerta → notificação).

```python
# tests/e2e/test_patient_journey.py
async def test_jornada_basica_paciente(async_client, auth_headers):
    r = await async_client.post("/v1/checkins", json={...}, headers=auth_headers)
    assert r.status_code == 201
```

### Fixtures obrigatórias em `conftest.py`

```python
# tests/conftest.py
@pytest.fixture(autouse=True)
async def db_session():
    """Cada teste roda em uma transação que é revertida ao final."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        async with AsyncSession(conn) as session:
            yield session
            await session.rollback()

@pytest.fixture
def patient_factory(db_session):
    return PatientFactory(db_session)
```

### Regras de teste

- **Não escreva testes change-detector.** Um teste falha quando dados que se espera mudar são atualizados — catálogos de sintomas, contagem de entidades, versão de config. Esses testes não têm cobertura comportamental, apenas travam atualizações de rotina.

  ```python
  # ERRADO — quebra quando um sintoma é adicionado ao catálogo
  assert len(symptom_catalog) == 14

  # CERTO — garante que o catálogo tem o mínimo para o produto funcionar
  assert len(symptom_catalog) >= 1
  assert all(s.category in ("dermatological", "neurological", "systemic") for s in symptom_catalog)
  ```

- Nunca escrever para `~/.pequi/` nos testes. Usar `tmp_path` do pytest e monkeypatch em variáveis de ambiente.
- Nunca usar credenciais reais (API Anthropic, Twilio) nos testes — apenas mocks ou fixtures.
- Testes de comunidade devem verificar que `author_anonymous_id` nunca expõe o `user_id` real.

---

## Bruno API

As coleções Bruno em `bruno/` são o contrato oficial dos endpoints. Todo endpoint novo deve ter sua requisição documentada em Bruno antes (ou junto) da implementação.

```
bruno/
├── auth/
│   ├── login.bru
│   └── refresh.bru
├── checkin/
│   ├── submit_checkin.bru
│   └── get_checkin_history.bru
├── patient/
│   ├── get_profile.bru
│   └── update_profile.bru
└── professional/
    └── get_dashboard.bru
```

Exemplo de arquivo `.bru`:

```
meta {
  name: Submit Checkin
  type: http
  seq: 1
}

post {
  url: {{baseUrl}}/v1/checkins
  body: json
  auth: bearer
}

headers {
  Content-Type: application/json
}

body:json {
  {
    "mood": "ok",
    "symptom_intensity": 5,
    "symptom_ids": ["{{symptom_id}}"],
    "general_notes": "Dor leve nas mãos"
  }
}

assert {
  res.status: eq 201
  res.body.id: isDefined
  res.body.checked_in_at: isDefined
}
```

Regras de Bruno:
- Todo endpoint com autenticação deve usar a variável `{{token}}` — nunca hardcodar tokens nos arquivos `.bru`.
- Usar environments (`dev`, `staging`) para `baseUrl` — nunca URLs de produção no repositório.
- Manter as assertions `assert {}` atualizadas com o schema real da resposta.
- Arquivos Bruno são revisados junto com o código no PR — um endpoint sem `.bru` correspondente não está "pronto".

---

## Adicionando um novo endpoint

1. Criar o schema Pydantic em `schemas/`.
2. Criar ou atualizar o repository em `repositories/`.
3. Implementar lógica de negócio em `services/` (se necessário).
4. Criar o use case em `use_cases/`.
5. Adicionar a rota em `routers/` com prefixo `/v1/`.
6. Adicionar rate limit com `@limiter.limit(...)` se o endpoint for sensível.
7. Escrever testes unitários + integração.
8. Adicionar arquivo `.bru` em `bruno/`.
9. Registrar no `audit_logs` se o endpoint acessa dados de paciente.

---

## Adicionando uma migração

```bash
# Gerar a partir do modelo ORM (detecta mudanças automaticamente)
alembic revision --autogenerate -m "add_body_area_history"

# Revisar o arquivo gerado em alembic/versions/ antes de aplicar
alembic upgrade head

# Reverter última migração (desenvolvimento)
alembic downgrade -1
```

Regras de migração:
- Nunca usar `CASCADE DELETE` em entidades clínicas. Um médico removido não pode deletar prontuários.
- Soft delete via `deleted_at` ou `is_deleted` — escolher um padrão e aplicar consistentemente.
- Toda migração deve ter `upgrade()` e `downgrade()` implementados.
- Antes de aplicar em staging/produção, revisar o SQL gerado com `alembic upgrade head --sql`.

---

## Armadilhas conhecidas — não fazer

**Não use `CASCADE DELETE` em entidades clínicas.** Um `health_professional` deletado não pode apagar todos os `checkins` e `prescriptions` dos pacientes vinculados. Use `ON DELETE RESTRICT`.

**Não armazene imagens no PostgreSQL.** Nenhum campo `bytea` para fotos de lesões. Use MinIO/R2 e armazene apenas `image_url` e `image_key` no banco.

**Não calcule adesão e métricas em tempo real.** O painel do médico lê `weekly_symptom_summaries` e `adherence_snapshots`, não as tabelas transacionais. Calcular ao vivo com dezenas de pacientes ativos trava o banco.

**Não use o `user_id` diretamente em tabelas da comunidade.** O `author_anonymous_id` é o único identificador que deve aparecer em `community_posts` e `community_comments`. O mapeamento real fica em `community_anonymous_map` com acesso restrito a `admin`.

**Não faça soft delete sem política clara.** O padrão do projeto é `deleted_at TIMESTAMPTZ NULL`. Não criar campos `is_deleted boolean` em paralelo — inconsistência entre tabelas é fonte de bugs difíceis de rastrear.

**Não misture logs de auditoria com logs de aplicação.** `audit_logs` é dado clínico — append-only, sem DELETE ou UPDATE. Logs de infraestrutura (structlog, Sentry) são separados e não têm restrição de imutabilidade.

**Não adie a modelagem de LGPD.** O endpoint de exclusão de conta (direito ao esquecimento) deve estar no MVP. Implementar depois é exponencialmente mais caro.

**Não hardcode URLs de produção em testes ou arquivos Bruno.** Usar variáveis de ambiente e environments do Bruno.

**Não commite `.env` com valores reais.** Apenas `.env.example` vai para o repositório. Segredos ficam no GitHub Secrets e no gerenciador de segredos do ambiente de produção.

**Não registre dados pessoais no Sentry.** Campos como nome, CPF, data de nascimento e coordenadas geográficas não podem ser enviados como `extra` ou `tags` no Sentry. Usar apenas UUIDs internos para correlação.

---

## Segurança e LGPD

**Requisitos mandatórios:**

- Direito ao esquecimento: endpoint `DELETE /v1/account` que apaga dados pessoais, anonimiza registros clínicos que precisam ser mantidos por obrigação legal, e remove imagens do object storage (setar `is_deleted = true` + deletar do MinIO/R2).
- Consentimento explícito: tabela `consents` com versão do termo, data e IP.
- Minimização de dados: não coletar o que não é necessário. Endereço completo só se necessário para PostGIS — caso contrário, apenas bairro.
- Acesso aos próprios dados: endpoint de exportação em JSON para o paciente.
- Logs de acesso: toda consulta a dados de paciente por médico deve ser registrada em `audit_logs` com `entity_type = 'patient_profile'`.
- `community_anonymous_map` tem acesso restrito a role `admin`. Toda consulta a ela deve ser auditada.

---

## Observabilidade

Stack gratuita: `structlog` (logs estruturados) + Sentry (erros e performance) + Prometheus/Loki (métricas, quando necessário).

```python
# core/logging.py
import structlog

logger = structlog.get_logger()

# Uso nos services
logger.info("checkin.created", patient_id=str(patient_id), intensity=data.symptom_intensity)
logger.warning("alert.generated", type="symptom_spike", patient_id=str(patient_id))
```

Nunca logar dados sensíveis (nome, CPF, data de nascimento, coordenadas). Usar apenas UUIDs para correlação em logs.

---

## Testes — rodar sem o wrapper (apenas se necessário)

Se não for possível usar `scripts/run_tests.sh` (ex.: Windows sem WSL), ativar o venv manualmente e passar `-n 4`:

```bash
source .venv/bin/activate
python -m pytest tests/ -q -n 4
```

Mais de 4 workers xdist pode surfaçar flakes de ordenação que o CI nunca vê.

---

*AGENTS.md — Projeto Pequi — versão 1.0 — Maio de 2026*