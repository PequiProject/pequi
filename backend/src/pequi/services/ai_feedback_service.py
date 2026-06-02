"""Gera feedback de IA para check-ins críticos — sem PII na saída."""

import re

from pequi.config import get_settings
from pequi.core.logging import get_logger
from pequi.integrations.ai_client import AIClient, get_anthropic_client
from pequi.models.checkin import Checkin

logger = get_logger(__name__)
settings = get_settings()

# Padrões que não devem aparecer no feedback retornado ao paciente
_PII_PATTERNS = [
    re.compile(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b"),  # CPF
    re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"),  # email
]

_FALLBACK_FEEDBACK = (
    "Registramos que seus sintomas estão em nível elevado hoje. "
    "Continue o tratamento conforme orientado e entre em contato com sua unidade "
    "de saúde se sentir piora. Estamos acompanhando você."
)


class AIFeedbackService:
    def __init__(self, ai_client: AIClient | None = None) -> None:
        self.ai_client = ai_client or get_anthropic_client()

    async def generate_feedback(self, checkin: Checkin) -> str:
        """Gera texto de apoio clínico sem dados pessoais identificáveis."""
        if self.ai_client is None:
            logger.info("ai_feedback.skipped", reason="no_api_key")
            return _FALLBACK_FEEDBACK

        symptom_names = [s.name for s in checkin.symptoms] if checkin.symptoms else []

        try:
            feedback = await self.ai_client.generate_checkin_feedback(
                symptoms=symptom_names,
                intensity=checkin.symptom_intensity,
                mood=checkin.mood.value,
                history_summary="",
            )
            if not feedback:
                return _FALLBACK_FEEDBACK
            return self._sanitize(feedback)
        except Exception:
            logger.warning("ai_feedback.api_error", checkin_id=str(checkin.id))
            return _FALLBACK_FEEDBACK

    def _sanitize(self, text: str) -> str:
        for pattern in _PII_PATTERNS:
            text = pattern.sub("[redacted]", text)
        return text
