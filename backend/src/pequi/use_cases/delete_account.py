from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.exceptions import ConflictError, NotFoundError
from pequi.core.token_blacklist import blacklist_token, revoke_user_tokens
from pequi.repositories.account_repo import AccountRepository
from pequi.repositories.audit_repo import AuditRepository
from pequi.services.anonymization_service import AnonymizationService, ObjectDeleter


class DeleteAccountUseCase:
    def __init__(
        self,
        session: AsyncSession,
        *,
        storage: ObjectDeleter,
        anonymization_service: AnonymizationService | None = None,
    ) -> None:
        self._session = session
        self._repo = AccountRepository(session)
        self._audit_repo = AuditRepository(session)
        self._storage = storage
        self._anonymization_service = anonymization_service or AnonymizationService()

    async def execute(
        self,
        *,
        user_id: UUID,
        token_jti: str | None,
        token_exp: int | None = None,
        ip_address: str | None = None,
    ) -> None:
        user = await self._repo.get_active_user(user_id)
        if user is None:
            raise NotFoundError("User", str(user_id))

        patient = await self._repo.get_patient_by_user_id(user_id)
        if patient is None:
            raise NotFoundError("PatientProfile", str(user_id))

        if await self._repo.has_active_treatment(patient.id):
            raise ConflictError(
                "Nao e possivel excluir a conta com tratamento ativo. "
                "Contate seu profissional de saude."
            )

        deletion_request = await self._repo.create_deletion_request(user_id)
        try:
            async with self._session.begin_nested():
                await self._anonymization_service.anonymize_account(
                    user=user,
                    patient=patient,
                    body_map_entries=await self._repo.list_body_map_entries(patient.id),
                    body_area_history=await self._repo.list_body_area_history(patient.id),
                    storage=self._storage,
                )
                await self._repo.unlink_anonymous_mapping(user_id)
                await blacklist_token(token_jti, token_exp)
                await revoke_user_tokens(user_id)
                await self._audit_repo.log_action(
                    actor_user_id=user_id,
                    actor_role="patient",
                    entity_type="account",
                    entity_id=str(user_id),
                    action="ACCOUNT_DELETION",
                    details=f"data_deletion_request_id={deletion_request.id}",
                    ip_address=ip_address,
                )
                await self._repo.complete_deletion_request(deletion_request)
        except Exception as exc:
            await self._repo.fail_deletion_request(
                deletion_request,
                notes=f"{type(exc).__name__}: account deletion failed",
            )
            raise
