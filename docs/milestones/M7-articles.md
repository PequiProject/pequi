# M7 — Articles

> **Status:** ✅ Implementado
> **Depende de:** M2
> **Bloqueado por:** —

## Objetivo

Implementar a biblioteca de artigos educativos sobre hanseníase, acessível a pacientes e profissionais. Admins gerenciam o conteúdo. Suporte a tags e categorias para filtragem.

## Modelo de dados

```
article_tags
├── id      UUID PK
└── name    TEXT UNIQUE NOT NULL   ← ex: "tratamento", "sintomas", "prevenção"

articles
├── id              UUID PK
├── title           TEXT NOT NULL
├── slug            TEXT UNIQUE NOT NULL
├── summary         TEXT NOT NULL        ← 1-2 frases (preview)
├── content         TEXT NOT NULL        ← Markdown
├── category        ENUM('education','news','guidelines','faq')
├── author_name     TEXT NOT NULL        ← nome do autor (sem FK — pode ser externo)
├── cover_image_url TEXT NULL
├── cover_image_key TEXT NULL
├── is_published    BOOLEAN DEFAULT false
├── published_at    TIMESTAMPTZ NULL
├── reading_time_min SMALLINT NULL       ← calculado no service
├── view_count      INT DEFAULT 0
├── created_at      TIMESTAMPTZ
├── updated_at      TIMESTAMPTZ
└── deleted_at      TIMESTAMPTZ NULL

article_tag_associations           ← N:M
├── article_id  UUID FK → articles(id)
├── tag_id      UUID FK → article_tags(id)
└── PRIMARY KEY (article_id, tag_id)
```

## Arquivos criados

| Camada | Arquivo |
|--------|---------|
| Models | `models/article.py` |
| Schemas | `schemas/article.py` |
| Repositories | `repositories/article_repo.py` |
| Use Cases | `use_cases/get_article.py`, `use_cases/list_articles.py`, `use_cases/create_article.py` |
| Router | `routers/article.py` |
| Tests | `tests/unit/test_article_schema.py`, `tests/integration/test_article_flow.py` |
| Bruno | `bruno/articles/` |
| Migration | `alembic/versions/007_create_articles.py` |

## Endpoints

| Método | Path | Rate Limit | Auth |
|--------|------|-----------|------|
| `GET` | `/v1/articles` | 100/min | any authenticated |
| `GET` | `/v1/articles/{slug}` | 100/min | any authenticated |
| `GET` | `/v1/articles/tags` | 200/min | any authenticated |
| `POST` | `/v1/articles` | 10/hora | admin |
| `PATCH` | `/v1/articles/{id}` | 10/hora | admin |
| `DELETE` | `/v1/articles/{id}` | 10/hora | admin |

## Regras de negócio

- Apenas artigos com `is_published=true` são visíveis para não-admins
- `reading_time_min` calculado como `ceil(word_count / 200)` (200 palavras/min)
- Slug gerado automaticamente a partir do título (normalizado, sem caracteres especiais)
- `view_count` incrementado via UPDATE assíncrono (não bloqueia a resposta)
- Imagens de capa via MinIO/R2 (integração M10)

## Critérios de aceite

- [ ] Paciente não vê artigos `is_published=false`
- [ ] Slug único — título duplicado gera slug com sufixo numérico
- [ ] `view_count` incrementa sem bloquear a resposta do GET
- [ ] Soft delete oculta o artigo da listagem
