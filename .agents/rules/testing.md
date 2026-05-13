# Política de Testes — Projeto Pequi

Regra canônica para assistentes de IA e desenvolvedores. A regra Cursor resumida está em `.cursor/rules/testing.mdc`.

## Papel do agente

Garantir que toda alteração mantenha **confiabilidade**, **segurança clínica**, **compatibilidade arquitetural** e **cobertura de testes adequada**. Não basta gerar testes: é preciso **evitar padrões incorretos** e **sinalizar violações** da arquitetura.

## Contexto

Plataforma de saúde (hanseníase). Stack: Python, FastAPI, SQLAlchemy 2.0 async, PostgreSQL, Redis, Pydantic, UV, Pytest, Docker Compose.

### Arquitetura em camadas

```text
routers/ → use_cases/ → services/ → repositories/ → database.py
```

**Obrigatório:** router não acessa banco; service sem SQL; repository sem regra de negócio; ORM sem lógica de negócio. **Testes devem respeitar essa separação.**

## Objetivos

1. Testes apropriados para feature nova ou alteração relevante  
2. Validar **comportamento**, não implementação interna  
3. Evitar regressões clínicas e de segurança  
4. Preservar LGPD  
5. Manter compatibilidade arquitetural  

## Estrutura oficial

```text
tests/
├── unit/
├── integration/
└── e2e/
```

## Wrapper oficial

**Nunca** sugerir `pytest` cru para validar o projeto. **Sempre** `scripts/run_tests.sh` (paridade com CI).

```bash
scripts/run_tests.sh
scripts/run_tests.sh tests/unit/
scripts/run_tests.sh tests/integration/test_checkin_flow.py
scripts/run_tests.sh -v --tb=long
```

## Tipos de teste

### 1. Unitários — `tests/unit/`

- **Objetivo:** services, schemas, funções puras, regras isoladas.  
- **Proibido:** banco, Redis, HTTP, filesystem real, APIs externas.  
- **Usar:** mocks / fakes / `pytest-mock`.

### 2. Integração — `tests/integration/`

- **Objetivo:** use_cases + repositories + PostgreSQL real do ambiente de testes; persistência, transações, async.  
- **Proibido:** HTTP (chamar use cases diretamente).  
- **Permitido:** fixtures, factories, `AsyncSession` real.

### 3. E2E — `tests/e2e/`

- **Objetivo:** jornadas críticas; contrato HTTP; auth; serialização; app FastAPI completa.  
- **Usar:** `httpx.AsyncClient`, endpoints reais, `status_code` e payloads.  
- **Reservado** para fluxos críticos (não substituir unitário por E2E “por preguiça”).

## Critérios de cobertura (comportamental)

Metas são por **tipo de mudança** e **camada**, não por número mágico de linhas até o projeto adotar `pytest-cov` no CI.

| Mudança | Mínimo esperado |
|----------|------------------|
| Novo ou alterado **service** (regra clínica, cálculo, decisão) | Testes **unitários** cobrindo fluxo feliz + **edge cases** relevantes (limites, None, estados inválidos) e erros de domínio esperados. |
| Novo ou alterado **repository** (filtro, join, soft delete, constraint) | Testes de **integração** que persistem e leem o banco; asserts em **dados observáveis**, não no SQL gerado. |
| Novo ou alterado **use case** (orquestração, alertas, notificações) | **Integração**: pelo menos um fluxo completo do use case + efeito verificável (DB, repo, ou mock de **integração externa** apenas na borda). |
| Novo **endpoint** ou mudança de contrato HTTP | **E2E** ou teste HTTP existente no projeto + arquivo **Bruno** em `bruno/<domínio>/`. |
| Auth, permissões, rate limit, LGPD | Casos explícitos (ex.: 401/403/429; anonimização; ausência de PII em logs). |

**Gates gerais**

- Não **remover** testes que protejam fluxo clínico ou LGPD sem substituição equivalente ou decisão explícita de produto.  
- Não aceitar **só** snapshot ou assert frágil como “cobertura” de regra de negócio.  
- Priorizar **invariantes** e **efeitos observáveis** (persistência, resposta, alertas) em vez de contagem exata de elementos de catálogo ou ordem irrelevante.

## Anti-patterns

### Change-detector

```python
# ERRADO
assert len(symptom_catalog) == 14

# CERTO
assert len(symptom_catalog) >= 1
```

### Acoplamento à implementação

Evitar: contagem rígida de chamadas internas, detalhes privados, ordem irrelevante, SQL gerado, detalhes internos do ORM. Preferir: comportamento observável, dados persistidos, regras clínicas, side effects relevantes.

### Nome de teste

Preferir `test_checkin_gera_alerta_quando_intensidade_alta`. Evitar `test_checkin_1`.

## Segurança e LGPD nos testes

- Nenhum dado sensível em log; fixtures sem CPF/nome real.  
- Comunidade: `author_anonymous_id` nunca expõe `user_id`.  
- Sentry sem PII; exclusão de conta / anonimização testados quando o fluxo existir.  
- Auditoria: quando o produto exigir, verificar geração de `audit_logs` em fluxos sensíveis.

## Fixtures e ambiente

- Preferir `tmp_path`; nunca `~/.pequi/`; nunca credenciais ou tokens reais; nunca APIs reais (Anthropic, Twilio, WhatsApp, MinIO/R2 prod).

## Mocks

**Mockar:** Anthropic, Twilio, WhatsApp, object storage externo, Sentry.  
**Não mockar:** regra de negócio central; use case “inteiro” em nome de teste unitário; **repository** em teste de **integração** (session/repo reais).

## Async

`await` correto; evitar race e `asyncio.sleep` arbitrário; preferir `asyncio.Event` ou condições determinísticas.

## Banco

Isolamento por teste; rollback/transação conforme `conftest`; sem dados compartilhados entre testes; sem depender de ordem de execução. **Nunca** `CASCADE DELETE` em entidades clínicas (regra de produto — testes não devem assumir o contrário).

## Rate limit

Endpoints sensíveis (login, checkins, uploads, admin) devem ter cobertura que inclua **429** quando o rate limit estiver ativo nos testes.

## Bruno

Todo endpoint novo: `bruno/<domínio>/<endpoint>.bru`. E2E alinhados a payloads e status do contrato Bruno quando existir.

## Quando sugerir testes

Novo endpoint, service, regra de negócio, migration, fluxo clínico, auth, permissões, serialização, LGPD, rate limit.

## Quando alertar / bloquear mentalmente o merge

- Violação arquitetural (router → DB, SQL no service, negócio no repo).  
- Testes frágeis (snapshot instável, asserts excessivamente específicos, ordem, sleeps).  
- LGPD violada em fixtures ou logs.  
- Lentidão desnecessária (E2E para lógica trivial; banco no unitário).

## Prioridade

1. Segurança clínica  
2. LGPD  
3. Confiabilidade  
4. Determinismo  
5. Clareza  
6. Arquitetura limpa  
7. Cobertura comportamental  

Nunca aceitar testes frágeis, acoplados à implementação ou que exponham dados sensíveis.

## Revisão de PR

Verificar: tipo correto de teste; anti-patterns; arquitetura; LGPD; Bruno; fixtures; async isolado; `scripts/run_tests.sh` verde antes de considerar PR pronto (alinhado ao CI).
