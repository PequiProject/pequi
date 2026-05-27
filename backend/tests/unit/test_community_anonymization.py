import pytest
from pydantic import ValidationError

from pequi.schemas.community import CommentCreate, PostCreate


def test_post_create_title_min_length():
    """Post title must be at least 3 characters."""
    with pytest.raises(ValidationError):
        PostCreate(title="ab", content="Valid content", category="experience")


def test_post_create_title_max_length():
    """Post title must be at most 200 characters."""
    with pytest.raises(ValidationError):
        PostCreate(title="a" * 201, content="Valid content", category="experience")


def test_post_create_content_min_length():
    """Post content must be at least 10 characters."""
    with pytest.raises(ValidationError):
        PostCreate(title="Valid title", content="short", category="experience")


def test_post_create_content_max_length():
    """Post content must be at most 5000 characters."""
    with pytest.raises(ValidationError):
        PostCreate(title="Valid title", content="a" * 5001, category="experience")


def test_post_create_category_must_be_valid():
    """Post category must be one of: experience, question, support, news."""
    with pytest.raises(ValidationError):
        PostCreate(title="Valid title", content="Valid content", category="invalid")

    # Valid categories should pass
    for category in ["experience", "question", "support", "news"]:
        PostCreate(title="Valid title", content="Valid content", category=category)


def test_comment_create_content_min_length():
    """Comment content must be at least 3 characters."""
    with pytest.raises(ValidationError):
        CommentCreate(content="ab")


def test_comment_create_content_max_length():
    """Comment content must be at most 2000 characters."""
    with pytest.raises(ValidationError):
        CommentCreate(content="a" * 2001)


def test_post_response_never_exposes_user_id():
    """PostResponse must never have user_id field — only author_anonymous_id."""
    from uuid import uuid4

    from pequi.schemas.community import PostResponse

    # Verify that user_id is not in the response model fields
    response_fields = PostResponse.model_fields
    assert "user_id" not in response_fields
    assert "author_anonymous_id" in response_fields

    # Verify that a valid response can be created with anonymous_id
    post_data = {
        "id": uuid4(),
        "author_anonymous_id": uuid4(),
        "title": "Test Post",
        "content": "Test content",
        "category": "experience",
        "is_pinned": False,
        "is_moderated": False,
        "like_count": 0,
        "comment_count": 0,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
    }
    response = PostResponse(**post_data)
    assert response.author_anonymous_id is not None


def test_comment_response_never_exposes_user_id():
    """CommentResponse must never have user_id field — only author_anonymous_id."""
    from uuid import uuid4

    from pequi.schemas.community import CommentResponse

    # Verify that user_id is not in the response model fields
    response_fields = CommentResponse.model_fields
    assert "user_id" not in response_fields
    assert "author_anonymous_id" in response_fields

    # Verify that a valid response can be created with anonymous_id
    comment_data = {
        "id": uuid4(),
        "post_id": uuid4(),
        "author_anonymous_id": uuid4(),
        "content": "Test comment",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
    }
    response = CommentResponse(**comment_data)
    assert response.author_anonymous_id is not None
