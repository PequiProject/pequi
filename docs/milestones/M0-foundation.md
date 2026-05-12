# M0 — Foundation

> **Status:** ✅ Em progresso
> **Depende de:** —
> **Bloqueado por:** —

## Objetivo

Estabelecer toda a infraestrutura base do projeto: tooling, dependências, configuração, estrutura de diretórios, camadas core e scaffolding vazio para as demais camadas. Ao final desta milestone, o servidor FastAPI deve subir limpo, conectar ao PostgreSQL e ao Redis, e o `alembic upgrade head` deve rodar sem erro.

## Arquivos criados

### Raiz do projeto

| Arquivo | Descrição |
|---------|-----------|
| `pyproject.toml` | Manifesto UV + dependências de produção e dev |
| `docker-compose.yml` | Stack local: API, PostgreSQL/PostGIS, Redis, MinIO, worker |
| `Dockerfile` | Multi-stage build (builder + runtime) |
| `.env.example` | Template de variáveis de ambiente (sem segredos reais) |
| `alembic.ini` | Configuração do Alembic |
| `scripts/run_tests.sh` | Wrapper de testes (paridade com CI) |

### `alembic/`

| Arquivo | Descrição |
|---------|-----------|
| `alembic/env.py` | Configuração de migrações async com SQLAlchemy 2.0 |
| `alembic/versions/` | Diretório vazio — migrations geradas por milestone |

### `src/pequi/`

| Arquivo | Descrição |
|---------|-----------|
| `main.py` | FastAPI app factory, Sentry init, inclusão de routers |
| `config.py` | `Settings` via `pydantic-settings` com todas as variáveis |
| `database.py` | Engine async, `AsyncSession`, `Base` declarativa |

### `src/pequi/core/`

| Arquivo | Descrição |
|---------|-----------|
| `auth.py` | Hashing bcrypt, criação/verificação de JWT |
| `dependencies.py` | `get_db`, `get_current_user`, `get_current_patient`, `get_current_professional` |
| `exceptions.py` | Handlers HTTP: 400, 401, 403, 404, 422, 500 |
| `logging.py` | Configuração structlog (JSON em prod, console em dev) |
| `rate_limit.py` | `Limiter` slowapi + Redis; decorator `limiter` exportado |
| `security.py` | CORS, HTTPS redirect, trusted host middleware |

### Scaffolding vazio

Diretórios com `__init__.py` criados mas sem implementação:
`models/`, `schemas/`, `repositories/` (+ `base.py`), `services/`, `use_cases/`, `routers/`, `workers/`, `integrations/`

## Dependências adicionadas

### Produção

```toml
fastapi[standard]
uvicorn[standard]
sqlalchemy[asyncio]
asyncpg
alembic
pydantic-settings
pydantic[email]
python-jose[cryptography]
passlib[bcrypt]
slowapi
redis[hiredis]
structlog
sentry-sdk[fastapi]
arq
```

### Desenvolvimento / Testes

```toml
pytest
pytest-asyncio
pytest-xdist
pytest-mock
httpx
ruff
```

## Comandos para rodar

```bash
# Criar ambiente virtual e instalar dependências
uv sync

# Subir infraestrutura local
docker compose up -d

# Verificar que API sobe
uv run uvicorn pequi.main:app --reload

# Rodar testes (nenhum ainda — apenas smoke)
scripts/run_tests.sh
```

## Decisões de design

| Decisão | Motivo |
|---------|--------|
| `AsyncSession` com `expire_on_commit=False` | Evita lazy-load após commit em contextos async |
| `Base` com `type_annotation_map` para UUID | Garante `UUID` nativo no PostgreSQL via `asyncpg` |
| Structlog com `AsyncBoundLogger` | Compatível com contexto async do FastAPI |
| `Settings` com `model_config = SettingsConfigDict(env_file=".env")` | Carrega `.env` automaticamente em dev sem quebrar produção |
| CORS configurado via `Settings.ALLOWED_ORIGINS` | Origens controladas por variável de ambiente por ambiente |

## Critérios de aceite

- [ ] `uv sync` sem erros
- [ ] `docker compose up -d` sobe todos os serviços
- [ ] `uv run uvicorn pequi.main:app` inicia sem erros
- [ ] `GET /health` retorna `{"status": "ok"}`
- [ ] `alembic upgrade head` roda sem erro (zero migrations = ok)
- [ ] `scripts/run_tests.sh` passa (zero testes = ok)
- [ ] `uv run ruff check .` sem erros
