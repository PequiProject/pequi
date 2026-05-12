# M6 — Community

> **Status:** 🔜 Pendente
> **Depende de:** M2
> **Bloqueado por:** —

## Objetivo

Implementar o espaço comunitário anônimo onde pacientes compartilham experiências, dúvidas e suporte mútuo. A anonimização é mandatória — o `user_id` real **nunca** aparece em posts ou comentários.

## Modelo de dados

```
community_anonymous_map            ← acesso restrito a role admin
├── id                  UUID PK
├── user_id             UUID UNIQUE FK → users(id) ON DELETE RESTRICT
├── anonymous_id        UUID UNIQUE DEFAULT gen_random_uuid()
└── created_at          TIMESTAMPTZ

community_posts
├── id                  UUID PK
├── author_anonymous_id UUID FK → community_anonymous_map(anonymous_id)
├── title               TEXT NOT NULL
├── content             TEXT NOT NULL
├── category            ENUM('experience','question','support','news')
├── is_pinned           BOOLEAN DEFAULT false   ← admin only
├── is_moderated        BOOLEAN DEFAULT false   ← admin pode remover conteúdo
├── like_count          INT DEFAULT 0
├── comment_count       INT DEFAULT 0
├── created_at          TIMESTAMPTZ
├── updated_at          TIMESTAMPTZ
└── deleted_at          TIMESTAMPTZ NULL

community_comments
├── id                  UUID PK
├── post_id             UUID FK → community_posts(id) ON DELETE RESTRICT
├── author_anonymous_id UUID FK → community_anonymous_map(anonymous_id)
├── content             TEXT NOT NULL
├── created_at          TIMESTAMPTZ
├── updated_at          TIMESTAMPTZ
└── deleted_at          TIMESTAMPTZ NULL

community_likes
├── anonymous_id    UUID FK → community_anonymous_map(anonymous_id)
├── post_id         UUID FK → community_posts(id)
└── PRIMARY KEY (anonymous_id, post_id)
```

## Arquivos criados

| Camada | Arquivo |
|--------|---------|
| Models | `models/community.py` |
| Schemas | `schemas/community.py` |
| Repositories | `repositories/community_repo.py` |
| Use Cases | `use_cases/create_post.py`, `use_cases/create_comment.py`, `use_cases/toggle_like.py` |
| Router | `routers/community.py` |
| Tests | `tests/unit/test_community_anonymization.py`, `tests/integration/test_community_flow.py` |
| Bruno | `bruno/community/` |
| Migration | `alembic/versions/006_create_community.py` |

## Endpoints

| Método | Path | Rate Limit | Auth |
|--------|------|-----------|------|
| `GET` | `/v1/community/posts` | 100/min | any authenticated |
| `POST` | `/v1/community/posts` | 20/hora | patient |
| `GET` | `/v1/community/posts/{id}` | 100/min | any authenticated |
| `POST` | `/v1/community/posts/{id}/comments` | 30/hora | patient |
| `POST` | `/v1/community/posts/{id}/like` | 60/hora | patient |
| `DELETE` | `/v1/community/posts/{id}` | 10/hora | own post / admin |
| `PATCH` | `/v1/community/posts/{id}/moderate` | 20/hora | admin |

## Regras de segurança — anonimização

```python
# NUNCA retornar user_id — apenas anonymous_id
# NUNCA expor a tabela community_anonymous_map via API
# O mapeamento só é acessível internamente (service layer) e por admin com auditoria
```

- Ao criar o primeiro post/comentário, o mapeamento é criado automaticamente
- `anonymous_id` é estável por usuário (o mesmo em todos os posts)
- Admin pode ver o `user_id` real apenas via endpoint auditado `/v1/admin/community/deanonymize/{anonymous_id}`
- Toda consulta à `community_anonymous_map` gera entrada em `audit_logs`

## Critérios de aceite

- [ ] `author_anonymous_id` nunca expõe `user_id`
- [ ] Usuário não pode ver posts de usuários deletados (soft delete)
- [ ] Moderação (is_moderated=true) oculta o conteúdo do post
- [ ] Teste verifica que `user_id` não aparece em nenhum campo da resposta
- [ ] Like duplicado retorna 409
