from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from pequi.config import get_settings
from pequi.core.exceptions import register_exception_handlers
from pequi.core.logging import configure_logging
from pequi.core.security import register_middlewares

settings = get_settings()


def _init_sentry() -> None:
    if not settings.SENTRY_DSN:
        return
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[FastApiIntegration(), SqlalchemyIntegration()],
        traces_sample_rate=0.2,
        profiles_sample_rate=0.1,
        environment=settings.ENV,
        send_default_pii=False,  # mandatório — dados de pacientes não saem do ambiente
    )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    _init_sentry()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Pequi API",
        description="Backend do Projeto Pequi — acompanhamento de hanseníase",
        version="0.1.0",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        lifespan=lifespan,
    )

    register_middlewares(app)
    register_exception_handlers(app)
    _register_routers(app)

    return app


def _register_routers(app: FastAPI) -> None:
    from fastapi import APIRouter
    from fastapi.responses import JSONResponse

    health_router = APIRouter(tags=["health"])

    @health_router.get("/health")
    async def health_check() -> JSONResponse:
        return JSONResponse({"status": "ok", "version": "0.1.0"})

    app.include_router(health_router)

    # Routers de domínio — adicionados progressivamente a cada milestone:
    # M1: auth.router  → prefix="/v1/auth"
    # M2: patient.router → prefix="/v1/patients"
    # M4: checkin.router → prefix="/v1/checkins"
    # ...


app = create_app()
