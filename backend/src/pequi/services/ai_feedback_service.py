"""Gera feedback de IA para check-ins críticos — sem PII na saída."""

import re

from pequi.config import get_settings
from pequi.core.logging import get_logger
from pequi.integrations.ai_client import get_anthropic_client
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
    async def generate_feedback(self, checkin: Checkin) -> str:
        """Gera texto de apoio clínico sem dados pessoais identificáveis."""
        client = get_anthropic_client()
        if client is None:
            logger.info("ai_feedback.skipped", reason="no_api_key")
            return _FALLBACK_FEEDBACK

        symptom_names = [s.name for s in checkin.symptoms] if checkin.symptoms else []
        prompt = (
            "Você é um assistente de saúde para pacientes com hanseníase. "
            "Gere um parágrafo curto (máx. 3 frases) de orientação empática em português. "
            "NÃO inclua nome, CPF, e-mail, endereço ou qualquer dado pessoal. "
            "Use apenas: humor, intensidade de sintomas (0-10) e nomes genéricos de sintomas.\n\n"
            f"Humor: {checkin.mood.value}\n"
            f"Intensidade: {checkin.symptom_intensity}/10\n"
            f"Sintomas relatados: {', '.join(symptom_names) or 'nenhum específico'}\n"
        )

        try:
            response = await client.messages.create(
                model=settings.ANTHROPIC_MODEL,
                max_tokens=256,
                messages=[{"role": "user", "content": prompt}],
            )
            text = response.content[0].text.strip()  # type: ignore[union-attr]
        except Exception:
            logger.warning("ai_feedback.api_error", checkin_id=str(checkin.id))
            return _FALLBACK_FEEDBACK

        return self._sanitize(text)

    def _sanitize(self, text: str) -> str:
        for pattern in _PII_PATTERNS:
            text = pattern.sub("[redacted]", text)
        return text
