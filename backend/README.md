# Pequi — Backend (API)

Documentação técnica e operacional do backend da aplicação Pequi.

Visão geral, convenções de desenvolvimento, execução local, testes, migrações e melhores práticas para arquitetos e desenvolvedores backend.

Consulte também o guia de desenvolvimento principal em [AGENTS.md](AGENTS.md).

--

## Status

- Linguagem: Python
- Framework: FastAPI
- ORM: SQLAlchemy 2.0 (Async)
- Migrations: Alembic
- Task queue: ARQ (Redis)

## Conteúdo rápido

- **Instalação & setup** — Dependências, ambiente virtual e variáveis de ambiente
- **Execução** — execução local (dev / docker) e workers
- **Arquitetura** — organização em camadas e responsabilidades
- **API** — convenções de versionamento e rate limiting
- **Banco de dados & migrações** — Alembic, recomendações e boas práticas
- **Testes & CI** — como executar a suíte localmente e no CI
- **Segurança & LGPD** — requisitos mandatórios e padrões
- **Observabilidade** — logs, Sentry e métricas

## Pré-requisitos

- Python 3.11+ (recomendado)
- [UV](https://uv.dev/) (tooling de desenvolvimento usado no projeto)
- Docker & docker-compose (para ambiente completo: PostGIS, Redis, MinIO)

## Instalação local (desenvolvimento)

1. Ative o ambiente virtual (UV):

```bash
source .venv/bin/activate
uv sync
```

2. Copie variáveis de ambiente e ajuste conforme necessário. Não commitar segredos.

```bash
cp .env.example .env
# editar .env conforme ambiente local
```

3. Aplicar migrações locais (quando necessário):

```bash
alembic upgrade head
```

4. Subir serviços dependentes em desenvolvimento (opcional):

```bash
docker compose up -d
```

5. Executar a aplicação (modo desenvolvimento):

```bash
# roda uvicorn via entrypoint do projeto (hot-reload em dev)
uv run dev
```

Obs: o repositório fornece `scripts/run_tests.sh` que padroniza execução de testes localmente e no CI.

## Estrutura do projeto

Arquitetura em camadas (exemplo simplificado):

- `routers/` — FastAPI routers (HTTP apenas; sem lógica de negócio)
- `use_cases/` — orquestração de serviços por feature (application/service layer)
- `services/` — lógica de negócio testável (stateless)
- `repositories/` — queries e acesso ao banco (SQLAlchemy)
- `models/` — modelos ORM SQLAlchemy
- `schemas/` — Pydantic schemas (request/response/internal)
- `integrations/` — clientes externos (WhatsApp, object storage, AI)
- `workers/` — jobs ARQ assíncronos
- `core/` — autenticação, dependências FastAPI, logging, rate limit, segurança

Veja o ponto de entrada da app em [src/pequi/main.py](src/pequi/main.py).

## Convenções de API

- Todas as rotas públicas devem conter o prefixo de versão: `/v1/`, `/v2/`, etc.
- Rota exemplo: `POST /v1/checkins` (recebe `CheckinCreate`, devolve `CheckinResponse`).
- Breaking changes exigem incremento de versão principal.
- Use as coleções de contrato em `bruno/` para documentar requests/response de endpoints.

### Rate limiting

Implementado com `slowapi` + Redis (`core/rate_limit.py`). Exemplos de limites:

- `POST /auth/login` — 5 tentativas/min por IP
- `POST /checkins` — 10 req/min por usuário
- Ajustar explicitamente limites em endpoints sensíveis (autenticação, escrita clínica, uploads).

## Banco de dados e migrações

- Engine async e `AsyncSession` (ver [src/pequi/database.py](src/pequi/database.py)).
- Usar `postgis/postgis` no Docker Compose para garantir extensão PostGIS.
- Gerar migração automático quando alterar modelos:

```bash
alembic revision --autogenerate -m "descrição"
alembic upgrade head
```

Recomendações:
- Não usar `CASCADE DELETE` em entidades clínicas — usar `ON DELETE RESTRICT`.
- Soft delete com `deleted_at TIMESTAMPTZ NULL` quando necessário.
- Sempre revisar SQL gerado antes de aplicar em staging/produção.

## Observabilidade

- Logging estruturado: `structlog` (configurado em `core/logging.py`).
- Erros & performance: Sentry (ver `src/pequi/main.py`).
- Sempre manter `send_default_pii=False` para evitar vazamento de dados sensíveis.

## Segurança e LGPD

Regras mandatórias:

- Direito ao esquecimento: implementar `DELETE /v1/account` para anonimização e remoção de recursos de armazenamento de objetos.
- Consentimento: gravar versões do termo em tabela `consents` com timestamp e IP.
- Minimização: só coletar dados necessários.
- Logs: não enviar PII para Sentry; usar somente UUIDs para correlação.

Recomendações de desenvolvimento:
- Nunca commitar `.env` com segredos; use `.env.example` como template.
- Mocks em testes para serviços externos (Anthropic, Twilio, MinIO).

## Testes

- Rodar a suíte completa via wrapper:

```bash
scripts/run_tests.sh
```

- Exemplos:

```bash
scripts/run_tests.sh tests/unit/                # unitários
scripts/run_tests.sh tests/integration/         # integração
scripts/run_tests.sh -k some_test -q            # filtro pytest
```

Testes locais usam transações que são revertidas ao final (conftest.py).

## CI / CD

- GitHub Actions: `ci.yml` (lint + testes em PRs) e `deploy.yml` (deploy em `main`).
- Nenhum PR deve ser mesclado com testes ou lint falhando.
- Segredos de produção apenas em GitHub Secrets.

## Docker / Ambiente completo

Use `docker compose up -d` na raiz para subir serviços dependentes: banco (PostGIS), Redis, MinIO e worker.

```bash
docker compose up -d
```

A imagem de produção é multi-stage e não deve montar o código via volume.

## Como adicionar um endpoint (prática recomendada)

1. Criar schema Pydantic em `schemas/`.
2. Criar/atualizar `repositories/` para queries.
3. Implementar regras em `services/` (testáveis, sem I/O direto).
4. Criar `use_cases/` para orquestração.
5. Adicionar rota em `routers/` com prefixo `/v1/`.
6. Adicionar rate limit quando necessário.
7. Escrever testes unitários e de integração.
8. Adicionar contrato em `bruno/`.

## Migrações e rollout

- Sempre revisar `alembic` autogerado.
- Em produção: executar migrações antes de atualizar containers.

## Troubleshooting rápido

- Erros de dependência: execute `uv sync` para alinhar ambiente.
- Banco não disponível: verifique `docker compose ps` e logs do `postgis`.
- Testes falhando isolados: inspecionar fixtures em `tests/conftest.py`.

## Referências e arquivos úteis

- Guia de desenvolvimento: [AGENTS.md](AGENTS.md)
- Ponto de entrada: [src/pequi/main.py](src/pequi/main.py)
- Banco / engine: [src/pequi/database.py](src/pequi/database.py)
- Rate limit: [src/pequi/core/rate_limit.py](src/pequi/core/rate_limit.py)
- Scripts de apoio: `scripts/run_tests.sh`, `scripts/lint.sh`

--

