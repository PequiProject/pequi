# syntax=docker/dockerfile:1

# ── Builder ───────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

RUN pip install uv

COPY pyproject.toml .
COPY src/ ./src/

RUN uv sync --no-dev --compile-bytecode

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

RUN groupadd --gid 1001 pequi \
    && useradd --uid 1001 --gid pequi --shell /bin/bash --create-home pequi

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/src /app/src

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH="/app/src" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

USER pequi

EXPOSE 8000

CMD ["uvicorn", "pequi.main:app", "--host", "0.0.0.0", "--port", "8000"]
