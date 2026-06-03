from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from pequi.core.dependencies import get_current_user, get_db
from pequi.core.rate_limit import limiter
from pequi.repositories.patient_repo import PatientRepository
from pequi.repositories.user_repo import UserRepository
from pequi.schemas.user import AuthResponse, LoginRequest, RefreshRequest, UserCreate, UserResponse
from pequi.use_cases.login_user import LoginUserUseCase
from pequi.use_cases.refresh_token import RefreshTokenUseCase
from pequi.use_cases.register_user import RegisterUserUseCase

router = APIRouter()


def get_register_use_case(session: AsyncSession = Depends(get_db)) -> RegisterUserUseCase:
    return RegisterUserUseCase(UserRepository(session), PatientRepository(session))


def get_login_use_case(session: AsyncSession = Depends(get_db)) -> LoginUserUseCase:
    return LoginUserUseCase(UserRepository(session))


def get_refresh_use_case(session: AsyncSession = Depends(get_db)) -> RefreshTokenUseCase:
    return RefreshTokenUseCase(UserRepository(session))


@router.post("/register", response_model=UserResponse, status_code=201)
@limiter.limit("10/hour")
async def register(
    request: Request,
    data: UserCreate,
    use_case: RegisterUserUseCase = Depends(get_register_use_case),
):
    return await use_case.execute(data)


@router.post("/login", response_model=AuthResponse, status_code=200)
@limiter.limit("5/minute")
async def login(
    request: Request,
    data: LoginRequest,
    use_case: LoginUserUseCase = Depends(get_login_use_case),
):
    return await use_case.execute(data)


@router.post("/refresh", response_model=AuthResponse, status_code=200)
@limiter.limit("20/hour")
async def refresh(
    request: Request,
    data: RefreshRequest,
    use_case: RefreshTokenUseCase = Depends(get_refresh_use_case),
):
    return await use_case.execute(data)


@router.post("/logout", status_code=204)
async def logout(_user_id: UUID = Depends(get_current_user)):
    # Stateful logout would require token denylist (Redis), for now we just return 204
    # The client must discard the token on their end.
    return
