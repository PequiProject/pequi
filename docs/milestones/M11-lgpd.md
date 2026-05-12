# M11 — LGPD & Account

> **Status:** 🔜 Pendente
> **Depende de:** M1..M10
> **Bloqueado por:** —

## Objetivo

Implementar todos os requisitos da LGPD mandatórios para o MVP: direito ao esquecimento (exclusão de conta), direito de acesso (exportação de dados), consentimento explícito e documentado, e anonimização de registros clínicos que precisam ser retidos por obrigação legal.

## Fluxos implementados

### 1. Exclusão de conta — `DELETE /v1/account`

```
1. Autenticar paciente
2. Verificar ausência de tratamento ativo em andamento
   → Se ativo: retornar 409 com instrução para contatar profissional
3. Anonimizar dados pessoais:
   - users: email → hash, full_name → "Usuário Removido"
   - patient_profiles: neighborhood/city/state → NULL, date_of_birth → NULL
   - community posts/comments: manter conteúdo (interesse público), autor já é anonymous_id
4. Marcar deleted_at em users, patient_profiles
5. Deletar imagens do object storage (body_map, avatar)
6. Invalidar todos os tokens JWT ativos (Redis blacklist)
7. Registrar em audit_logs: action='ACCOUNT_DELETION'
8. Retornar 204
```

### 2. Exportação de dados — `GET /v1/account/export`

```
Retorna JSON com todos os dados pessoais do paciente:
{
  "profile": { ...dados do perfil... },
  "checkins": [ ...histórico completo... ],
  "treatments": [ ...tratamentos... ],
  "dose_logs": [ ...doses... ],
  "alerts": [ ...alertas... ],
  "community_posts": [ ...posts (sem anonymous_id exposto)... ],
  "consents": [ ...histórico de consentimentos... ],
  "exported_at": "..."
}
```

Rate limit severo: 1 exportação por hora por usuário.

### 3. Consentimento — `POST /v1/account/consent`

Registra aceitação de nova versão dos termos:
```json
{
  "term_version": "v1.2",
  "accepted": true
}
```

Grava em `consents` com IP e user-agent.

## Modelo de dados

```
token_blacklist                    ← Redis, não PostgreSQL
key:  "blacklist:{jti}"
ttl:  = tempo restante do token

data_deletion_requests             ← rastreabilidade regulatória
├── id              UUID PK
├── user_id         UUID NOT NULL   ← referência mesmo após deleção
├── requested_at    TIMESTAMPTZ NOT NULL
├── completed_at    TIMESTAMPTZ NULL
├── status          ENUM('pending','processing','completed','failed')
└── notes           TEXT NULL
```

## Arquivos criados

| Camada | Arquivo |
|--------|---------|
| Use Cases | `use_cases/delete_account.py`, `use_cases/export_account_data.py`, `use_cases/record_consent.py` |
| Services | `services/anonymization_service.py` |
| Router | `routers/account.py` |
| Tests | `tests/integration/test_account_deletion.py`, `tests/integration/test_data_export.py` |
| Bruno | `bruno/account/delete_account.bru`, `bruno/account/export_data.bru` |
| Migration | `alembic/versions/011_create_lgpd_tables.py` |

## Endpoints

| Método | Path | Rate Limit | Auth |
|--------|------|-----------|------|
| `DELETE` | `/v1/account` | 1/hora | patient |
| `GET` | `/v1/account/export` | 1/hora | patient |
| `POST` | `/v1/account/consent` | 5/hora | any authenticated |
| `GET` | `/v1/account/consents` | 20/min | any authenticated |

## Regras LGPD

- `send_default_pii=False` no Sentry (já em M0)
- Nenhum campo de PII em logs structlog
- Exportação inclui **todos** os dados — nada pode ser omitido
- Anonimização é irreversível — sem "desfazer"
- `data_deletion_requests` é append-only e nunca deletado (rastreabilidade)
- Tratamento ativo bloqueia deleção (dados clínicos têm retenção legal)

## Critérios de aceite

- [ ] Conta deletada não autentica após exclusão
- [ ] Imagens removidas do object storage
- [ ] Tokens invalidados no Redis após exclusão
- [ ] Exportação inclui 100% dos dados pessoais
- [ ] `audit_logs` registra a exclusão
- [ ] Tratamento ativo bloqueia exclusão com 409 explicativo
- [ ] Testes de integração cobrem o fluxo completo de exclusão
