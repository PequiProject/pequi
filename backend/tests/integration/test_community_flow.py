"""Testes de integração — fluxo da comunidade anônima (M6 / PEQ-106)."""

from uuid import uuid4

import pytest

from pequi.core.exceptions import ForbiddenError, NotFoundError
from pequi.repositories.community_repo import CommunityRepository
from pequi.repositories.patient_repo import PatientRepository
from pequi.schemas.community import CommentCreate, PostCreate
from pequi.use_cases.create_comment import CreateCommentUseCase
from pequi.use_cases.create_post import CreatePostUseCase
from pequi.use_cases.deanonymize import DeanonymizeUseCase
from pequi.use_cases.delete_post import DeletePostUseCase
from pequi.use_cases.get_post import GetPostUseCase
from pequi.use_cases.list_comments import ListCommentsUseCase
from pequi.use_cases.list_posts import ListPostsUseCase
from pequi.use_cases.moderate_post import ModeratePostUseCase
from pequi.use_cases.toggle_like import ToggleLikeUseCase
from tests.integration.test_dose_flow import (
    _create_health_unit,
    _create_patient,
    _create_user,
)


async def _create_admin_user(session, email: str = "admin@test.com"):
    from pequi.models.user import User

    user = User(
        id=uuid4(),
        email=email,
        hashed_password="hashed",
        full_name="Admin User",
        role="admin",
    )
    session.add(user)
    await session.flush()
    return user


@pytest.mark.asyncio
async def test_patient_creates_post_anonymously(create_tables, db_session):
    """Patient creates post — only anonymous_id appears in response."""
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="patient1@test.com", role="patient")
    await _create_patient(db_session, user=patient_user, health_unit=health_unit)

    data = PostCreate(
        title="Minha experiência com o tratamento",
        content="Estou compartilhando minha jornada...",
        category="experience",
    )

    community_repo = CommunityRepository(db_session)
    patient_repo = PatientRepository(db_session)
    use_case = CreatePostUseCase(community_repo, patient_repo)
    result = await use_case.execute(patient_user.id, data)

    # Verify response has anonymous_id, not user_id
    assert hasattr(result, "author_anonymous_id")
    assert result.author_anonymous_id is not None
    assert not hasattr(result, "user_id")

    # Verify the mapping was created
    mapping = await community_repo.deanonymize(result.author_anonymous_id)
    assert mapping is not None
    assert mapping.user_id == patient_user.id


@pytest.mark.asyncio
async def test_anonymous_id_is_stable_for_user(create_tables, db_session):
    """Anonymous ID remains the same across multiple posts from the same user."""
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="patient2@test.com", role="patient")
    await _create_patient(db_session, user=patient_user, health_unit=health_unit)

    community_repo = CommunityRepository(db_session)
    patient_repo = PatientRepository(db_session)
    use_case = CreatePostUseCase(community_repo, patient_repo)

    data1 = PostCreate(title="Post 1", content="Content 1", category="experience")
    post1 = await use_case.execute(patient_user.id, data1)

    data2 = PostCreate(title="Post 2", content="Content 2", category="question")
    post2 = await use_case.execute(patient_user.id, data2)

    # Same anonymous_id for both posts
    assert post1.author_anonymous_id == post2.author_anonymous_id


@pytest.mark.asyncio
async def test_different_users_have_different_anonymous_ids(create_tables, db_session):
    """Different users get different anonymous IDs."""
    health_unit = await _create_health_unit(db_session)
    user1 = await _create_user(db_session, email="user1@test.com", role="patient")
    user2 = await _create_user(db_session, email="user2@test.com", role="patient")
    await _create_patient(db_session, user=user1, health_unit=health_unit)
    await _create_patient(db_session, user=user2, health_unit=health_unit)

    community_repo = CommunityRepository(db_session)
    patient_repo = PatientRepository(db_session)
    use_case = CreatePostUseCase(community_repo, patient_repo)

    data = PostCreate(title="Test", content="Test", category="experience")
    post1 = await use_case.execute(user1.id, data)
    post2 = await use_case.execute(user2.id, data)

    # Different anonymous_ids
    assert post1.author_anonymous_id != post2.author_anonymous_id


@pytest.mark.asyncio
async def test_user_id_never_appears_in_post_response(create_tables, db_session):
    """Critical: user_id must never appear in any response field."""
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="patient3@test.com", role="patient")
    await _create_patient(db_session, user=patient_user, health_unit=health_unit)

    community_repo = CommunityRepository(db_session)
    patient_repo = PatientRepository(db_session)
    use_case = CreatePostUseCase(community_repo, patient_repo)

    data = PostCreate(title="Test", content="Test", category="experience")
    result = await use_case.execute(patient_user.id, data)

    # Convert to dict to check all fields
    response_dict = result.model_dump()
    assert "user_id" not in response_dict
    assert "author_anonymous_id" in response_dict


@pytest.mark.asyncio
async def test_patient_can_comment_on_post(create_tables, db_session):
    """Patient can comment on a post anonymously."""
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="patient4@test.com", role="patient")
    await _create_patient(db_session, user=patient_user, health_unit=health_unit)

    community_repo = CommunityRepository(db_session)
    patient_repo = PatientRepository(db_session)

    # Create post
    post_data = PostCreate(title="Test", content="Test", category="experience")
    post_use_case = CreatePostUseCase(community_repo, patient_repo)
    post = await post_use_case.execute(patient_user.id, post_data)

    # Create comment
    comment_data = CommentCreate(content="Great post!")
    comment_use_case = CreateCommentUseCase(community_repo, patient_repo)
    comment = await comment_use_case.execute(patient_user.id, post.id, comment_data)

    # Verify comment has anonymous_id, not user_id
    assert comment.author_anonymous_id is not None
    assert not hasattr(comment, "user_id")

    # Verify post comment count incremented
    updated_post = await community_repo.get_post_by_id(post.id)
    assert updated_post.comment_count == 1


@pytest.mark.asyncio
async def test_duplicate_like_returns_409_conflict(create_tables, db_session):
    """Duplicate like returns 409 Conflict (PEQ-108)."""
    from pequi.core.exceptions import ConflictError

    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="patient12@test.com", role="patient")
    await _create_patient(db_session, user=patient_user, health_unit=health_unit)

    community_repo = CommunityRepository(db_session)
    patient_repo = PatientRepository(db_session)

    # Create post
    post_data = PostCreate(title="Test", content="Test", category="experience")
    post_use_case = CreatePostUseCase(community_repo, patient_repo)
    post = await post_use_case.execute(patient_user.id, post_data)

    # Like post (should succeed)
    like_use_case = ToggleLikeUseCase(community_repo, patient_repo)
    result1 = await like_use_case.execute(patient_user.id, post.id)
    assert result1["liked"] is True
    assert result1["like_count"] == 1

    # Try to like again (should return 409 Conflict)
    with pytest.raises(ConflictError):
        await like_use_case.execute(patient_user.id, post.id)


@pytest.mark.asyncio
async def test_list_posts_excludes_moderated_content(create_tables, db_session):
    """List posts should exclude moderated posts by default."""
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="patient6@test.com", role="patient")
    await _create_patient(db_session, user=patient_user, health_unit=health_unit)

    community_repo = CommunityRepository(db_session)
    patient_repo = PatientRepository(db_session)

    # Create two posts
    post_data = PostCreate(title="Test", content="Test", category="experience")
    post_use_case = CreatePostUseCase(community_repo, patient_repo)
    post1 = await post_use_case.execute(patient_user.id, post_data)
    post2 = await post_use_case.execute(patient_user.id, post_data)

    # Moderate one post
    await community_repo.update_post_moderation(post1.id, is_moderated=True)

    # List posts (should exclude moderated)
    list_use_case = ListPostsUseCase(community_repo)
    result = await list_use_case.execute()

    # Only non-moderated post should appear
    assert len(result.items) == 1
    assert result.items[0].id == post2.id


@pytest.mark.asyncio
async def test_user_can_delete_own_post(create_tables, db_session):
    """User can delete their own post (soft delete)."""
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="patient7@test.com", role="patient")
    await _create_patient(db_session, user=patient_user, health_unit=health_unit)

    community_repo = CommunityRepository(db_session)
    patient_repo = PatientRepository(db_session)

    # Create post
    post_data = PostCreate(title="Test", content="Test", category="experience")
    post_use_case = CreatePostUseCase(community_repo, patient_repo)
    post = await post_use_case.execute(patient_user.id, post_data)

    # Delete post
    delete_use_case = DeletePostUseCase(community_repo)
    deleted_post = await delete_use_case.execute(patient_user.id, post.id)

    # Verify soft delete (deleted_at is set)
    assert deleted_post.deleted_at is not None

    # Verify post no longer appears in list
    list_use_case = ListPostsUseCase(community_repo)
    result = await list_use_case.execute()
    assert len(result.items) == 0


@pytest.mark.asyncio
async def test_user_cannot_delete_others_post(create_tables, db_session):
    """User cannot delete another user's post."""
    health_unit = await _create_health_unit(db_session)
    user1 = await _create_user(db_session, email="user1@test.com", role="patient")
    user2 = await _create_user(db_session, email="user2@test.com", role="patient")
    await _create_patient(db_session, user=user1, health_unit=health_unit)
    await _create_patient(db_session, user=user2, health_unit=health_unit)

    community_repo = CommunityRepository(db_session)
    patient_repo = PatientRepository(db_session)

    # Create post as user1
    post_data = PostCreate(title="Test", content="Test", category="experience")
    post_use_case = CreatePostUseCase(community_repo, patient_repo)
    post = await post_use_case.execute(user1.id, post_data)

    # Try to delete as user2 (should fail)
    delete_use_case = DeletePostUseCase(community_repo)
    with pytest.raises(ForbiddenError):
        await delete_use_case.execute(user2.id, post.id)


@pytest.mark.asyncio
async def test_admin_can_moderate_post(create_tables, db_session):
    """Admin can moderate posts (audit logged in audit_logs table)."""
    from sqlalchemy import select

    from pequi.models.audit_log import AuditLog
    from pequi.repositories.audit_repo import AuditRepository

    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="patient8@test.com", role="patient")
    await _create_patient(db_session, user=patient_user, health_unit=health_unit)
    admin_user = await _create_admin_user(db_session)

    community_repo = CommunityRepository(db_session)
    patient_repo = PatientRepository(db_session)
    audit_repo = AuditRepository(db_session)

    # Create post
    post_data = PostCreate(title="Test", content="Test", category="experience")
    post_use_case = CreatePostUseCase(community_repo, patient_repo)
    post = await post_use_case.execute(patient_user.id, post_data)

    # Moderate post as admin
    from pequi.schemas.community import PostModerate

    moderate_use_case = ModeratePostUseCase(community_repo, audit_repo)
    moderated_post = await moderate_use_case.execute(
        post.id, PostModerate(is_moderated=True), admin_user.id
    )

    assert moderated_post.is_moderated is True

    # Verify audit log was persisted
    stmt = select(AuditLog).where(
        AuditLog.entity_type == "community_post",
        AuditLog.action == "moderate",
    )
    result = await db_session.execute(stmt)
    audit_log = result.scalar_one_or_none()
    assert audit_log is not None
    assert audit_log.actor_user_id == admin_user.id
    assert audit_log.actor_role == "admin"
    assert audit_log.entity_id == str(post.id)


@pytest.mark.asyncio
async def test_admin_can_deanonymize_with_audit(create_tables, db_session):
    """Admin can deanonymize (audit logged in audit_logs table)."""
    from pequi.repositories.audit_repo import AuditRepository

    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="patient9@test.com", role="patient")
    await _create_patient(db_session, user=patient_user, health_unit=health_unit)
    admin_user = await _create_admin_user(db_session)

    community_repo = CommunityRepository(db_session)
    patient_repo = PatientRepository(db_session)
    audit_repo = AuditRepository(db_session)

    # Create post
    post_data = PostCreate(title="Test", content="Test", category="experience")
    post_use_case = CreatePostUseCase(community_repo, patient_repo)
    post = await post_use_case.execute(patient_user.id, post_data)

    # Deanonymize as admin
    deanonymize_use_case = DeanonymizeUseCase(community_repo, audit_repo)
    mapping = await deanonymize_use_case.execute(post.author_anonymous_id, admin_user.id)

    # Verify mapping exposes real user_id
    assert mapping.user_id == patient_user.id
    assert mapping.anonymous_id == post.author_anonymous_id

    # Verify audit log was persisted
    from sqlalchemy import select

    from pequi.models.audit_log import AuditLog

    stmt = select(AuditLog).where(
        AuditLog.entity_type == "community_anonymous_map",
        AuditLog.action == "deanonymize",
    )
    result = await db_session.execute(stmt)
    audit_log = result.scalar_one_or_none()
    assert audit_log is not None
    assert audit_log.actor_user_id == admin_user.id
    assert audit_log.actor_role == "admin"
    assert audit_log.entity_id == str(post.author_anonymous_id)


@pytest.mark.asyncio
async def test_soft_deleted_posts_not_visible(create_tables, db_session):
    """Soft deleted posts should not be visible in lists or get by ID."""
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="patient10@test.com", role="patient")
    await _create_patient(db_session, user=patient_user, health_unit=health_unit)

    community_repo = CommunityRepository(db_session)
    patient_repo = PatientRepository(db_session)

    # Create and delete post
    post_data = PostCreate(title="Test", content="Test", category="experience")
    post_use_case = CreatePostUseCase(community_repo, patient_repo)
    post = await post_use_case.execute(patient_user.id, post_data)

    await community_repo.soft_delete_post(post.id)

    # Should not appear in list
    list_use_case = ListPostsUseCase(community_repo)
    result = await list_use_case.execute()
    assert len(result.items) == 0

    # Should not be accessible by ID
    get_use_case = GetPostUseCase(community_repo)
    with pytest.raises(NotFoundError):
        await get_use_case.execute(post.id)


@pytest.mark.asyncio
async def test_list_comments_for_post(create_tables, db_session):
    """List comments for a specific post."""
    health_unit = await _create_health_unit(db_session)
    patient_user = await _create_user(db_session, email="patient11@test.com", role="patient")
    await _create_patient(db_session, user=patient_user, health_unit=health_unit)

    community_repo = CommunityRepository(db_session)
    patient_repo = PatientRepository(db_session)

    # Create post
    post_data = PostCreate(title="Test", content="Test", category="experience")
    post_use_case = CreatePostUseCase(community_repo, patient_repo)
    post = await post_use_case.execute(patient_user.id, post_data)

    # Create comments
    comment_use_case = CreateCommentUseCase(community_repo, patient_repo)
    await comment_use_case.execute(patient_user.id, post.id, CommentCreate(content="Comment 1"))
    await comment_use_case.execute(patient_user.id, post.id, CommentCreate(content="Comment 2"))

    # List comments
    list_comments_use_case = ListCommentsUseCase(community_repo)
    result = await list_comments_use_case.execute(post.id)

    assert len(result.items) == 2
    assert result.total == 2
