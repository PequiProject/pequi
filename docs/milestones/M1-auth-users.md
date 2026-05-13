# M1 — Auth & Users

> **Status:** 🔜 Pendente
> **Depende de:** M0
> **Bloqueado por:** —

## Objetivo

Implementar autenticação completa (registro, login, refresh de token, logout) com controle de roles (`patient`, `health_professional`, `admin`). Ao final, um usuário pode se registrar, autenticar e obter tokens JWT válidos.

## Modelo de dados

```
users
├── id              UUID PK
├── email           TEXT UNIQUE NOT NULL
├── hashed_password TEXT NOT NULL
├── full_name       TEXT NOT NULL
├── role            ENUM('patient','health_professional','admin') NOT NULL
├── is_active       BOOLEAN DEFAULT true
├── is_verified     BOOLEAN DEFAULT false
├── created_at      TIMESTAMPTZ DEFAULT now()
├── updated_at      TIMESTAMPTZ DEFAULT now()
└── deleted_at      TIMESTAMPTZ NULL  ← soft delete
```

## Arquivos criados

| Camada | Arquivo | Descrição |
|--------|---------|-----------|
| Model | `models/user.py` | ORM `User` |
| Schema | `schemas/user.py` | `UserCreate`, `UserResponse`, `TokenResponse`, `LoginRequest` |
| Repository | `repositories/user_repo.py` | `get_by_email`, `get_by_id`, `create`, `update` |
| Use Case | `use_cases/register_user.py` | Orquestra criação + hashing de senha |
| Use Case | `use_cases/login_user.py` | Valida credenciais, emite JWT access + refresh |
| Use Case | `use_cases/refresh_token.py` | Valida refresh token, emite novo par |
| Router | `routers/auth.py` | `POST /v1/auth/register`, `POST /v1/auth/login`, `POST /v1/auth/refresh`, `POST /v1/auth/logout` |
| Tests | `tests/unit/test_auth_service.py` | Hash, verify, JWT encode/decode |
| Tests | `tests/integration/test_auth_flow.py` | Register → Login → Refresh |
| Bruno | `bruno/auth/register.bru` | |
| Bruno | `bruno/auth/login.bru` | |
| Bruno | `bruno/auth/refresh.bru` | |
| Migration | `alembic/versions/001_create_users.py` | |

## Endpoints

| Método | Path | Rate Limit | Auth |
|--------|------|-----------|------|
| `POST` | `/v1/auth/register` | 10/hora por IP | — |
| `POST` | `/v1/auth/login` | 5/min por IP | — |
| `POST` | `/v1/auth/refresh` | 20/hora por usuário | refresh token |
| `POST` | `/v1/auth/logout` | — | access token |

## Critérios de aceite

- [ ] Registro com email duplicado retorna 409
- [ ] Login com senha errada retorna 401
- [ ] JWT expira após tempo configurado
- [ ] Refresh token rotaciona (invalida o anterior)
- [ ] Soft delete não autentica (`is_active=false`)
- [ ] Senha nunca retorna em nenhuma resposta
- [ ] Testes unitários e de integração passando
