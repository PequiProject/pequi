import math

import pytest
from pydantic import ValidationError

from pequi.models.article import ArticleCategory
from pequi.schemas.article import ArticleCreate, ArticleUpdate
from pequi.services.article_service import ArticleService
from pequi.utils.slug import slug_base_from_title, slugify_title, unique_slug


def test_article_create_requires_title_and_content():
    with pytest.raises(ValidationError):
        ArticleCreate(
            title="",
            summary="Resumo válido com dez chars",
            content="conteúdo",
            category=ArticleCategory.education,
            author_name="Autor",
        )

    with pytest.raises(ValidationError):
        ArticleCreate(
            title="Título",
            summary="Resumo válido com dez chars",
            content="",
            category=ArticleCategory.education,
            author_name="Autor",
        )


def test_article_create_summary_min_length():
    with pytest.raises(ValidationError):
        ArticleCreate(
            title="Título",
            summary="curto",
            content="conteúdo com palavras",
            category=ArticleCategory.education,
            author_name="Autor",
        )


def test_article_create_valid_category():
    article = ArticleCreate(
        title="Título",
        summary="Resumo com tamanho adequado para preview",
        content="Conteúdo markdown do artigo.",
        category=ArticleCategory.guidelines,
        author_name="Dr. Silva",
        tags=["tratamento"],
    )
    assert article.category == ArticleCategory.guidelines


def test_article_update_allows_partial():
    update = ArticleUpdate(is_published=True)
    assert update.is_published is True
    assert update.title is None


def test_slugify_title_removes_accents_and_special_chars():
    assert slugify_title("Tratamento da Hanseníase") == "tratamento-da-hanseniase"
    assert slugify_title("  Olá Mundo!  ") == "ola-mundo"


def test_slug_base_from_title_uses_uuid_when_only_non_latin():
    base = slug_base_from_title("你好")
    assert base.startswith("artigo-")
    assert len(base) > len("artigo-")


def test_unique_slug_adds_numeric_suffix():
    existing = ["tratamento-da-hanseniase", "tratamento-da-hanseniase-2"]
    assert unique_slug("tratamento-da-hanseniase", existing) == "tratamento-da-hanseniase-3"


def test_reading_time_ceil_words_per_200():
    content = " ".join(["palavra"] * 201)
    assert ArticleService.calculate_reading_time_min(content) == math.ceil(201 / 200)

    assert ArticleService.calculate_reading_time_min("") == 0


def test_article_category_enum_values():
    assert set(ArticleCategory) == {
        ArticleCategory.education,
        ArticleCategory.news,
        ArticleCategory.guidelines,
        ArticleCategory.faq,
    }
