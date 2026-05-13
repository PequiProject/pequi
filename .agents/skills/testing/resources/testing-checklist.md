# testing-checklist.md — Projeto Pequi

> Checklist obrigatório para desenvolvimento orientado a testes (TDD), revisão de PRs e validação de qualidade no Projeto Pequi.

---

# Objetivo

Garantir que toda mudança no Projeto Pequi:

* seja desenvolvida com TDD
* preserve segurança clínica
* respeite LGPD
* mantenha arquitetura limpa
* tenha cobertura adequada
* evite regressões
* preserve contratos da API

---

# Regra Principal

## TESTES VÊM ANTES DO CÓDIGO

Fluxo obrigatório:

1. escrever testes
2. validar RED
3. implementar mínimo necessário
4. validar GREEN
5. refatorar
6. validar cobertura

Nunca implementar feature antes dos testes.

---

# Workflow TDD Obrigatório

## 1. Definir Jornada

Antes de codar, documentar:

```text id="gbm8eu"
Como [tipo de usuário], quero [ação], para [benefício].
```

Exemplo:

```text id="1p4rte"
Como paciente, quero registrar meu check-in diário,
para que profissionais acompanhem piora de sintomas.
```

---

# 2. Criar Testes Antes da Implementação

Checklist:

* [ ] testes unitários criados
* [ ] testes de integração criados
* [ ] E2E criado se fluxo for crítico
* [ ] edge cases cobertos
* [ ] cenários de erro cobertos
* [ ] casos assíncronos cobertos

---

# 3. Validar RED

Antes de alterar código de produção:

* [ ] testes executados
* [ ] testes falhando pelo motivo correto
* [ ] falha relacionada à feature/bug
* [ ] ambiente íntegro
* [ ] sem erro de setup

Executar SEMPRE:

```bash id="5rx8uz"
scripts/run_tests.sh
```

Nunca:

```bash id="ev4qpk"
pytest
```

---

# 4. Checkpoint Git — RED

Após validar RED:

* [ ] commit de checkpoint criado
* [ ] commit está na branch atual
* [ ] mensagem descreve o cenário

Formato recomendado:

```text id="o3s8m7"
test: add reproducer for checkin alert generation
```

---

# 5. Implementar Código Mínimo

Checklist:

* [ ] implementação mínima
* [ ] sem overengineering
* [ ] sem abstrações prematuras
* [ ] sem violação arquitetural

Arquitetura obrigatória:

```text id="8prh0x"
routers/
  → use_cases/
     → services/
        → repositories/
```

---

# 6. Validar GREEN

Checklist:

* [ ] mesmos testes executados novamente
* [ ] todos passando
* [ ] sem flaky behavior
* [ ] sem sleeps arbitrários

Executar:

```bash id="4ch8dx"
scripts/run_tests.sh
```

---

# 7. Checkpoint Git — GREEN

Checklist:

* [ ] commit criado após GREEN
* [ ] commit na branch correta
* [ ] testes passaram antes do commit

Formato recomendado:

```text id="0e8d2f"
fix: implement symptom spike alert generation
```

---

# 8. Refatorar

Checklist:

* [ ] remover duplicação
* [ ] melhorar legibilidade
* [ ] melhorar nomes
* [ ] reduzir acoplamento
* [ ] manter testes verdes

---

# 9. Coverage

Cobertura mínima obrigatória:

* [ ] branches >= 80%
* [ ] functions >= 80%
* [ ] lines >= 80%
* [ ] statements >= 80%

Executar:

```bash id="79q3m5"
scripts/run_tests.sh --cov
```

---

# Checklist por Tipo de Teste

# Unitários (`tests/unit/`)

## Objetivo

Validar lógica isolada.

## Deve testar

* [ ] services
* [ ] schemas
* [ ] cálculos
* [ ] validações
* [ ] edge cases
* [ ] regras clínicas

## NÃO deve usar

* [ ] banco
* [ ] Redis
* [ ] HTTP
* [ ] filesystem real
* [ ] APIs externas

## Deve usar

* [ ] mocks
* [ ] pytest-mock
* [ ] fixtures isoladas

---

# Integração (`tests/integration/`)

## Objetivo

Validar persistência e orquestração.

## Deve testar

* [ ] use_cases
* [ ] repositories
* [ ] transações
* [ ] integração entre camadas
* [ ] side effects relevantes

## Deve usar

* [ ] PostgreSQL real
* [ ] AsyncSession real
* [ ] rollback por teste

## NÃO deve usar

* [ ] HTTP
* [ ] mocks excessivos

---

# E2E (`tests/e2e/`)

## Objetivo

Validar jornadas críticas.

## Deve testar

* [ ] autenticação
* [ ] serialização
* [ ] contratos HTTP
* [ ] fluxos completos
* [ ] status codes
* [ ] integração FastAPI real

## Deve usar

* [ ] httpx.AsyncClient

## Reservado para

* [ ] jornadas críticas
* [ ] fluxos clínicos importantes
* [ ] autenticação
* [ ] permissões
* [ ] LGPD

---

# Checklist de Arquitetura

## Routers

* [ ] sem acesso direto ao banco
* [ ] sem regra de negócio
* [ ] usam `response_model`
* [ ] usam `/v1/`

---

## Services

* [ ] sem SQL
* [ ] lógica isolada
* [ ] stateless
* [ ] facilmente testáveis

---

## Repositories

* [ ] apenas queries
* [ ] sem regra clínica
* [ ] sem side effects escondidos

---

## Use Cases

* [ ] orquestram fluxo
* [ ] coordenam services
* [ ] coordenam repositories
* [ ] sem lógica HTTP

---

# Checklist LGPD

Verificar:

* [ ] nenhum CPF em logs
* [ ] nenhum nome real em fixtures
* [ ] nenhum dado sensível no Sentry
* [ ] anonimização preservada
* [ ] audit_logs gerados
* [ ] exclusão de conta preserva compliance
* [ ] `author_anonymous_id` não expõe `user_id`

---

# Checklist de Segurança

* [ ] autenticação validada
* [ ] autorização validada
* [ ] rate limits testados
* [ ] payloads inválidos testados
* [ ] permissões negativas testadas
* [ ] dados sensíveis protegidos

---

# Checklist de Banco

* [ ] migrations revisadas
* [ ] downgrade implementado
* [ ] sem CASCADE DELETE clínico
* [ ] soft delete consistente
* [ ] constraints testadas

---

# Checklist de Bruno

Endpoints alterados devem possuir:

* [ ] `.bru` atualizado
* [ ] assertions atualizadas
* [ ] `{{token}}`
* [ ] environments corretos

---

# Anti-patterns Proibidos

## Nunca fazer

* [ ] testes change-detector
* [ ] asserts frágeis
* [ ] sleeps arbitrários
* [ ] snapshots instáveis
* [ ] dependência entre testes
* [ ] ordem de execução implícita
* [ ] uso de credenciais reais
* [ ] PII em fixtures

---

# Exemplos ERRADOS

```python id="2v7m2j"
assert len(symptom_catalog) == 14
```

```python id="z0m4s1"
await asyncio.sleep(2)
```

```python id="jh0i8v"
expect(component.state.count).toBe(5)
```

---

# Exemplos CORRETOS

```python id="lzq0hf"
assert len(symptom_catalog) >= 1
```

```python id="rmv4x7"
await event.wait()
```

```python id="f4q6x0"
assert response.status_code == 201
```

---

# Performance dos Testes

Objetivos:

* [ ] unitários rápidos
* [ ] sem IO desnecessário
* [ ] sem dependência externa
* [ ] execução paralela segura
* [ ] determinísticos

---

# Pull Requests

Antes de abrir PR:

* [ ] seguir `.github/pr-template.md`
* [ ] incluir evidência de testes
* [ ] listar cobertura
* [ ] listar endpoints alterados
* [ ] listar migrations
* [ ] atualizar Bruno

---

# Regra Final

Nenhuma feature está completa sem:

* testes adequados
* cobertura mínima
* validação arquitetural
* validação LGPD
* Bruno atualizado
* PR documentado
* GREEN confirmado
