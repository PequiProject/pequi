"""Testes de integração do módulo M7 — Articles."""

import pytest

from pequi.core.exceptions import NotFoundError
from pequi.models.article import ArticleCategory
from pequi.repositories.article_repo import ArticleRepository
from pequi.schemas.article import ArticleCreate, ArticleUpdate
from pequi.tasks.article_tasks import increment_article_view_count
from pequi.use_cases.create_article import CreateArticleUseCase
from pequi.use_cases.delete_article import DeleteArticleUseCase
from pequi.use_cases.get_article import GetArticleUseCase
from pequi.use_cases.list_articles import ListArticlesUseCase
from pequi.use_cases.update_article import UpdateArticleUseCase


def _article_repo(session) -> ArticleRepository:
    return ArticleRepository(session)


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
    repo = _article_repo(db_session)
    result = await CreateArticleUseCase(repo).execute(_sample_create())

    assert result.slug == "tratamento-da-hanseniase"
    assert len(result.tags) == 2
    assert result.is_published is False
    assert result.reading_time_min >= 1


@pytest.mark.asyncio
async def test_duplicate_title_generates_unique_slug(create_tables, db_session):
    repo = _article_repo(db_session)
    create_uc = CreateArticleUseCase(repo)

    first = await create_uc.execute(_sample_create())
    second = await create_uc.execute(_sample_create(title="Tratamento da Hanseníase"))

    assert first.slug == "tratamento-da-hanseniase"
    assert second.slug == "tratamento-da-hanseniase-2"


@pytest.mark.asyncio
async def test_patient_only_sees_published_articles(create_tables, db_session):
    repo = _article_repo(db_session)
    create_uc = CreateArticleUseCase(repo)

    draft = await create_uc.execute(_sample_create(title="Rascunho", is_published=False))
    published = await create_uc.execute(
        _sample_create(
            title="Artigo Publicado",
            summary="Resumo publicado com tamanho mínimo ok.",
            is_published=True,
        )
    )

    list_patient = await ListArticlesUseCase(repo).execute(actor_role="patient")
    assert list_patient.total == 1
    assert list_patient.items[0].id == published.id

    with pytest.raises(NotFoundError):
        await GetArticleUseCase(repo).execute(draft.slug, actor_role="patient")


@pytest.mark.asyncio
async def test_admin_sees_drafts_in_list(create_tables, db_session):
    repo = _article_repo(db_session)
    await CreateArticleUseCase(repo).execute(_sample_create(is_published=False))
    await CreateArticleUseCase(repo).execute(
        _sample_create(
            title="Publicado Admin",
            summary="Resumo publicado com tamanho mínimo ok.",
            is_published=True,
        )
    )

    listed = await ListArticlesUseCase(repo).execute(actor_role="admin")
    assert listed.total == 2


@pytest.mark.asyncio
async def test_publish_and_filter_by_category_and_tag(create_tables, db_session):
    repo = _article_repo(db_session)
    created = await CreateArticleUseCase(repo).execute(
        _sample_create(is_published=True, tags=["prevencao"])
    )

    await UpdateArticleUseCase(repo).execute(
        created.id,
        ArticleUpdate(is_published=True),
    )

    by_category = await ListArticlesUseCase(repo).execute(
        actor_role="patient",
        category=ArticleCategory.education,
    )
    assert by_category.total >= 1

    by_tag = await ListArticlesUseCase(repo).execute(
        actor_role="patient",
        tag="prevencao",
    )
    assert by_tag.total == 1

    by_search = await ListArticlesUseCase(repo).execute(
        actor_role="patient",
        search="Hanseníase",
    )
    assert by_search.total == 1


@pytest.mark.asyncio
async def test_soft_delete_hides_from_list(create_tables, db_session):
    repo = _article_repo(db_session)
    created = await CreateArticleUseCase(repo).execute(
        _sample_create(is_published=True, title="Para deletar")
    )

    await DeleteArticleUseCase(repo).execute(created.id)

    listed = await ListArticlesUseCase(repo).execute(actor_role="admin")
    assert listed.total == 0

    with pytest.raises(NotFoundError):
        await GetArticleUseCase(repo).execute(created.slug, actor_role="admin")


@pytest.mark.asyncio
async def test_admin_can_get_unpublished_draft(create_tables, db_session):
    repo = _article_repo(db_session)
    created = await CreateArticleUseCase(repo).execute(_sample_create(is_published=False))

    result = await GetArticleUseCase(repo).execute(created.slug, actor_role="admin")
    assert result.id == created.id
    assert result.is_published is False


@pytest.mark.asyncio
async def test_increment_view_count_persists(create_tables, db_session):
    repo = _article_repo(db_session)
    created = await CreateArticleUseCase(repo).execute(
        _sample_create(is_published=True, title="Com views")
    )
    assert created.view_count == 0

    await increment_article_view_count(created.id)
    await increment_article_view_count(created.id)

    article = await repo.get_by_id(created.id)
    assert article is not None
    assert article.view_count == 2


@pytest.mark.asyncio
async def test_tags_created_on_the_fly(create_tables, db_session):
    repo = _article_repo(db_session)
    await CreateArticleUseCase(repo).execute(
        _sample_create(tags=["nova-tag-unica"], is_published=True)
    )

    tags = await repo.list_all_tags()
    names = [t.name for t in tags]
    assert "nova-tag-unica" in names
    assert names == sorted(names)


@pytest.mark.asyncio
async def test_non_admin_cannot_access_via_use_case_visibility_only(create_tables, db_session):
    """Garante que regra de publicação está no use case (não só no router)."""
    repo = _article_repo(db_session)
    created = await CreateArticleUseCase(repo).execute(
        _sample_create(is_published=True, title="Profissional lê")
    )

    result = await GetArticleUseCase(repo).execute(created.slug, actor_role="health_professional")
    assert result.id == created.id
