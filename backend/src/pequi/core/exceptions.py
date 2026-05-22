from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError

# Starlette ≥0.40: HTTP_422_UNPROCESSABLE_CONTENT substitui HTTP_422_UNPROCESSABLE_ENTITY
HTTP_422_UNPROCESSABLE = getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422)


class PequiException(Exception):
    """Base para exceções de domínio do Pequi."""

    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(PequiException):
    def __init__(self, resource: str, identifier: str | None = None) -> None:
        detail = f"{resource} not found"
        if identifier:
            detail = f"{resource} '{identifier}' not found"
        super().__init__(detail, status.HTTP_404_NOT_FOUND)


class ConflictError(PequiException):
    def __init__(self, message: str) -> None:
        super().__init__(message, status.HTTP_409_CONFLICT)


class ForbiddenError(PequiException):
    def __init__(self, message: str = "Access denied") -> None:
        super().__init__(message, status.HTTP_403_FORBIDDEN)


class UnauthorizedError(PequiException):
    def __init__(self, message: str = "Not authenticated") -> None:
        super().__init__(message, status.HTTP_401_UNAUTHORIZED)


class ValidationFailedError(PequiException):
    def __init__(self, message: str) -> None:
        super().__init__(message, HTTP_422_UNPROCESSABLE)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(PequiException)
    async def pequi_exception_handler(request: Request, exc: PequiException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message},
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(ValidationError)
    async def validation_exception_handler(request: Request, exc: ValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=HTTP_422_UNPROCESSABLE,
            content={"detail": exc.errors()},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        from pequi.core.logging import get_logger

        logger = get_logger(__name__)
        logger.error(
            "unhandled_exception",
            path=request.url.path,
            method=request.method,
            exc_type=type(exc).__name__,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"},
        )
