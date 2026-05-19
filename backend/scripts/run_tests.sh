#!/usr/bin/env bash
# Wrapper de testes — mantém paridade com CI.
# Uso:
#   scripts/run_tests.sh                    # suite completa
#   scripts/run_tests.sh tests/unit/        # apenas unitários
#   scripts/run_tests.sh tests/integration/test_checkin_flow.py
#   scripts/run_tests.sh -v --tb=long       # flags passadas ao pytest

set -euo pipefail

export TZ=UTC
export LANG=C.UTF-8
export PYTHONPATH="${PYTHONPATH:-}:$(pwd)/src"

# Remover credenciais reais que podem estar no .env local
unset ANTHROPIC_API_KEY
unset TWILIO_AUTH_TOKEN
unset TWILIO_ACCOUNT_SID
unset EVOLUTION_API_KEY
unset SENTRY_DSN

# Garantir que SENTRY_DSN está vazio em testes
export SENTRY_DSN=""

exec uv run pytest "$@" -n 4 --tb=short -q
