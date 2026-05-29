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
    # Em dev/test o Sentry fica off por política do projeto (AGENTS.md / LGPD).
    # `.strip()` evita que comentários inline ou espaços em `.env` virem DSN.
    dsn = settings.SENTRY_DSN.strip()
    if not dsn or settings.is_development:
        return
    sentry_sdk.init(
        dsn=dsn,
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

    from pequi.routers import article as article_router
    from pequi.routers import auth as auth_router
    from pequi.routers import body_map as body_map_router
    from pequi.routers import checkin as checkin_router
    from pequi.routers import community as community_router
    from pequi.routers import patient as patient_router
    from pequi.routers import treatment as treatment_router

    app.include_router(patient_router.router, prefix="/v1/patients", tags=["patients"])
    app.include_router(auth_router.router, prefix="/v1/auth", tags=["auth"])
    app.include_router(treatment_router.router, prefix="/v1/treatments", tags=["treatments"])
    app.include_router(treatment_router.symptoms_router, prefix="/v1/symptoms", tags=["symptoms"])
    app.include_router(checkin_router.router, prefix="/v1/checkins", tags=["checkins"])
    app.include_router(checkin_router.alerts_router, prefix="/v1/alerts", tags=["alerts"])
    app.include_router(body_map_router.router, prefix="/v1/body-map", tags=["body-map"])
    app.include_router(body_map_router.areas_router, prefix="/v1/body-areas", tags=["body-map"])
    app.include_router(article_router.router, prefix="/v1/articles", tags=["articles"])
    app.include_router(community_router.router, prefix="/v1/community", tags=["community"])
    app.include_router(
        community_router.admin_router,
        prefix="/v1/admin/community",
        tags=["admin-community"],
    )


app = create_app()
