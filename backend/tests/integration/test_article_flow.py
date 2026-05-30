"""Testes de integração do módulo M7 — Articles."""

from uuid import uuid4

import pytest
from sqlalchemy import func, select

from pequi.core.exceptions import NotFoundError
from pequi.models.article import ArticleCategory
from pequi.models.audit_log import AuditLog
from pequi.repositories.article_repo import ArticleRepository
from pequi.repositories.audit_repo import AuditRepository
from pequi.schemas.article import ArticleCreate, ArticleUpdate
from pequi.use_cases.create_article import CreateArticleUseCase
from pequi.use_cases.delete_article import DeleteArticleUseCase
from pequi.use_cases.get_article import GetArticleUseCase
from pequi.use_cases.list_articles import ListArticlesUseCase
from pequi.use_cases.update_article import UpdateArticleUseCase

ADMIN_USER_ID = uuid4()


def _article_repos(session) -> tuple[ArticleRepository, AuditRepository]:
    return ArticleRepository(session), AuditRepository(session)


def _sample_create(**overrides) -> ArticleCreate:
    data = {
        "title": "Tratamento da Hanseníase",
        "summary": "Resumo educativo sobre o tratamento multidroga.",
        "content": "Conteúdo completo em markdown sobre o tratamento.",
        "category": ArticleCategory.education,
        "author_name": "Equipe Pequi",
        "tags": ["tratamento", "sintomas"],
        "is_published": False,
    }
    data.update(overrides)
    return ArticleCreate(**data)


@pytest.mark.asyncio
async def test_admin_can_create_article_with_tags_and_slug(create_tables, db_session):
    article_repo, audit_repo = _article_repos(db_session)
    result = await CreateArticleUseCase(article_repo, audit_repo).execute(
        ADMIN_USER_ID, _sample_create()
    )

    assert result.slug == "tratamento-da-hanseniase"
    assert len(result.tags) == 2
    assert result.is_published is False
    assert result.reading_time_min >= 1


@pytest.mark.asyncio
async def test_duplicate_title_generates_unique_slug(create_tables, db_session):
    article_repo, audit_repo = _article_repos(db_session)
    create_uc = CreateArticleUseCase(article_repo, audit_repo)

    first = await create_uc.execute(ADMIN_USER_ID, _sample_create())
    second = await create_uc.execute(
        ADMIN_USER_ID, _sample_create(title="Tratamento da Hanseníase")
    )

    assert first.slug == "tratamento-da-hanseniase"
    assert second.slug == "tratamento-da-hanseniase-2"


@pytest.mark.asyncio
async def test_patient_only_sees_published_articles(create_tables, db_session):
    article_repo, audit_repo = _article_repos(db_session)
    create_uc = CreateArticleUseCase(article_repo, audit_repo)

    draft = await create_uc.execute(
        ADMIN_USER_ID, _sample_create(title="Rascunho", is_published=False)
    )
    published = await create_uc.execute(
        ADMIN_USER_ID,
        _sample_create(
            title="Artigo Publicado",
            summary="Resumo publicado com tamanho mínimo ok.",
            is_published=True,
        ),
    )

    list_patient = await ListArticlesUseCase(article_repo).execute(actor_role="patient")
    assert list_patient.total == 1
    assert list_patient.items[0].id == published.id

    with pytest.raises(NotFoundError):
        await GetArticleUseCase(article_repo).execute(draft.slug, actor_role="patient")


@pytest.mark.asyncio
async def test_admin_sees_drafts_in_list(create_tables, db_session):
    article_repo, audit_repo = _article_repos(db_session)
    create_uc = CreateArticleUseCase(article_repo, audit_repo)
    await create_uc.execute(ADMIN_USER_ID, _sample_create(is_published=False))
    await create_uc.execute(
        ADMIN_USER_ID,
        _sample_create(
            title="Publicado Admin",
            summary="Resumo publicado com tamanho mínimo ok.",
            is_published=True,
        ),
    )

    listed = await ListArticlesUseCase(article_repo).execute(actor_role="admin")
    assert listed.total == 2


@pytest.mark.asyncio
async def test_publish_and_filter_by_category_and_tag(create_tables, db_session):
    article_repo, audit_repo = _article_repos(db_session)
    created = await CreateArticleUseCase(article_repo, audit_repo).execute(
        ADMIN_USER_ID,
        _sample_create(is_published=True, tags=["prevencao"]),
    )

    await UpdateArticleUseCase(article_repo, audit_repo).execute(
        ADMIN_USER_ID,
        created.id,
        ArticleUpdate(is_published=True),
    )

    by_category = await ListArticlesUseCase(article_repo).execute(
        actor_role="patient",
        category=ArticleCategory.education,
    )
    assert by_category.total >= 1

    by_tag = await ListArticlesUseCase(article_repo).execute(
        actor_role="patient",
        tag="prevencao",
    )
    assert by_tag.total == 1

    by_search = await ListArticlesUseCase(article_repo).execute(
        actor_role="patient",
        search="Hanseníase",
    )
    assert by_search.total == 1


@pytest.mark.asyncio
async def test_soft_delete_hides_from_list(create_tables, db_session):
    article_repo, audit_repo = _article_repos(db_session)
    created = await CreateArticleUseCase(article_repo, audit_repo).execute(
        ADMIN_USER_ID,
        _sample_create(is_published=True, title="Para deletar"),
    )

    await DeleteArticleUseCase(article_repo, audit_repo).execute(ADMIN_USER_ID, created.id)

    listed = await ListArticlesUseCase(article_repo).execute(actor_role="admin")
    assert listed.total == 0

    with pytest.raises(NotFoundError):
        await GetArticleUseCase(article_repo).execute(created.slug, actor_role="admin")


@pytest.mark.asyncio
async def test_admin_can_get_unpublished_draft(create_tables, db_session):
    article_repo, audit_repo = _article_repos(db_session)
    created = await CreateArticleUseCase(article_repo, audit_repo).execute(
        ADMIN_USER_ID, _sample_create(is_published=False)
    )

    result = await GetArticleUseCase(article_repo).execute(created.slug, actor_role="admin")
    assert result.id == created.id
    assert result.is_published is False


@pytest.mark.asyncio
async def test_increment_view_count_persists(create_tables, db_session):
    """Incremento atômico no repositório.

    A task em background (``increment_article_view_count``) abre sessão própria e
    faz commit — invisível a esta transação de teste (rollback). O router usa essa
    task após responder; a persistência do UPDATE é validada aqui na mesma sessão.
    """
    article_repo, audit_repo = _article_repos(db_session)
    created = await CreateArticleUseCase(article_repo, audit_repo).execute(
        ADMIN_USER_ID,
        _sample_create(is_published=True, title="Com views"),
    )
    assert created.view_count == 0

    await article_repo.increment_view_count(created.id)
    await article_repo.increment_view_count(created.id)
    await db_session.flush()

    article = await article_repo.get_by_id(created.id)
    assert article is not None
    assert article.view_count == 2


@pytest.mark.asyncio
async def test_tags_created_on_the_fly(create_tables, db_session):
    article_repo, audit_repo = _article_repos(db_session)
    await CreateArticleUseCase(article_repo, audit_repo).execute(
        ADMIN_USER_ID,
        _sample_create(tags=["nova-tag-unica"], is_published=True),
    )

    tags = await article_repo.list_all_tags()
    names = [t.name for t in tags]
    assert "nova-tag-unica" in names
    assert names == sorted(names)


@pytest.mark.asyncio
async def test_non_admin_cannot_access_via_use_case_visibility_only(create_tables, db_session):
    """Garante que regra de publicação está no use case (não só no router)."""
    article_repo, audit_repo = _article_repos(db_session)
    created = await CreateArticleUseCase(article_repo, audit_repo).execute(
        ADMIN_USER_ID,
        _sample_create(is_published=True, title="Profissional lê"),
    )

    result = await GetArticleUseCase(article_repo).execute(
        created.slug, actor_role="health_professional"
    )
    assert result.id == created.id


@pytest.mark.asyncio
async def test_admin_crud_writes_audit_log(create_tables, db_session):
    article_repo, audit_repo = _article_repos(db_session)

    created = await CreateArticleUseCase(article_repo, audit_repo).execute(
        ADMIN_USER_ID, _sample_create(is_published=True, title="Auditado")
    )
    await UpdateArticleUseCase(article_repo, audit_repo).execute(
        ADMIN_USER_ID,
        created.id,
        ArticleUpdate(summary="Resumo atualizado com tamanho mínimo adequado."),
    )
    await DeleteArticleUseCase(article_repo, audit_repo).execute(ADMIN_USER_ID, created.id)

    count_stmt = (
        select(func.count())
        .select_from(AuditLog)
        .where(
            AuditLog.entity_type == "article",
            AuditLog.entity_id == str(created.id),
        )
    )
    total = (await db_session.execute(count_stmt)).scalar_one()
    assert total == 3
