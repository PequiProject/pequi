from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.dependencies import (
    get_actor_from_token,
    get_current_patient,
    get_db,
    get_object_storage_client,
    get_token_payload,
)
from pequi.core.rate_limit import user_limiter
from pequi.integrations.object_storage import ObjectStorageClient
from pequi.schemas.account import ConsentCreate, ConsentResponse
from pequi.use_cases.delete_account import DeleteAccountUseCase
from pequi.use_cases.export_account_data import ExportAccountDataUseCase
from pequi.use_cases.record_consent import ListConsentsUseCase, RecordConsentUseCase

router = APIRouter()


def _client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", maxsplit=1)[0].strip()
    return request.client.host if request.client else None


def get_delete_account_use_case(
    session: Annotated[AsyncSession, Depends(get_db)],
    storage: Annotated[ObjectStorageClient, Depends(get_object_storage_client)],
) -> DeleteAccountUseCase:
    return DeleteAccountUseCase(session, storage=storage)


def get_export_account_data_use_case(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ExportAccountDataUseCase:
    return ExportAccountDataUseCase(session)


def get_record_consent_use_case(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> RecordConsentUseCase:
    return RecordConsentUseCase(session)


def get_list_consents_use_case(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ListConsentsUseCase:
    return ListConsentsUseCase(session)


@router.delete("", status_code=204)
@user_limiter.limit("1/hour")
async def delete_account(
    request: Request,
    response: Response,
    user_id: Annotated[UUID, Depends(get_current_patient)],
    payload: Annotated[dict, Depends(get_token_payload)],
    use_case: Annotated[DeleteAccountUseCase, Depends(get_delete_account_use_case)],
) -> Response:
    await use_case.execute(
        user_id=user_id,
        token_jti=payload.get("jti"),
        token_exp=payload.get("exp"),
        ip_address=_client_ip(request),
    )
    return response


@router.get("/export")
@user_limiter.limit("1/hour")
async def export_account_data(
    request: Request,
    user_id: Annotated[UUID, Depends(get_current_patient)],
    use_case: Annotated[ExportAccountDataUseCase, Depends(get_export_account_data_use_case)],
) -> dict:
    return await use_case.execute(user_id)


@router.post("/consent", response_model=ConsentResponse, status_code=201)
@user_limiter.limit("5/hour")
async def record_consent(
    request: Request,
    body: ConsentCreate,
    actor: Annotated[tuple[UUID, str], Depends(get_actor_from_token)],
    use_case: Annotated[RecordConsentUseCase, Depends(get_record_consent_use_case)],
) -> ConsentResponse:
    user_id, _role = actor
    consent = await use_case.execute(
        user_id=user_id,
        data=body,
        ip_address=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return ConsentResponse.model_validate(consent)


@router.get("/consents", response_model=list[ConsentResponse])
@user_limiter.limit("20/minute")
async def list_consents(
    request: Request,
    actor: Annotated[tuple[UUID, str], Depends(get_actor_from_token)],
    use_case: Annotated[ListConsentsUseCase, Depends(get_list_consents_use_case)],
) -> list[ConsentResponse]:
    user_id, _role = actor
    return [ConsentResponse.model_validate(row) for row in await use_case.execute(user_id)]
