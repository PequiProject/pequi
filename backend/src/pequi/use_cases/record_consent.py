from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.exceptions import ValidationFailedError
from pequi.models.consent import Consent
from pequi.repositories.account_repo import AccountRepository
from pequi.schemas.account import ConsentCreate


class RecordConsentUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = AccountRepository(session)

    async def execute(
        self,
        *,
        user_id: UUID,
        data: ConsentCreate,
        ip_address: str | None,
        user_agent: str | None,
    ) -> Consent:
        if not data.accepted:
            raise ValidationFailedError("Consentimento deve ser aceito explicitamente.")
        return await self._repo.add_consent(
            user_id=user_id,
            term_version=data.term_version,
            ip_address=ip_address,
            user_agent=user_agent,
        )


class ListConsentsUseCase:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = AccountRepository(session)

    async def execute(self, user_id: UUID) -> list[Consent]:
        return await self._repo.list_consents(user_id)
