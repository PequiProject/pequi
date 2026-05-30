"""Anthropic AI client - used by the feedback worker."""

import logging

from anthropic import AsyncAnthropic

from pequi.config import Settings, get_settings

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = (
    "Você é um assistente de saúde empático que fornece feedback sobre "
    "check-ins de pacientes.\n"
    "Sua resposta deve ser:\n"
    "- Em português brasileiro\n"
    "- Empática e acolhedora\n"
    "- Focada em apoio emocional e orientações gerais\n"
    "- SEM fazer diagnósticos clínicos ou recomendar tratamentos específicos\n"
    "- Encorajando o paciente a continuar o acompanhamento com profissionais de saúde\n\n"
    "Responda de forma concisa (máximo 500 caracteres)."
)


class AIClient:
    """Anthropic Claude AI client for generating check-in feedback."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        settings: Settings | None = None,
        client: AsyncAnthropic | None = None,
    ) -> None:
        """Initialize AI client.

        Args:
            api_key: Anthropic API key. Defaults to settings.ANTHROPIC_API_KEY.
            model: Model name. Defaults to settings.ANTHROPIC_MODEL.
            settings: Optional settings for testing.
            client: Optional Anthropic client for testing.
        """
        self.settings = settings or get_settings()
        self.api_key = (api_key or self.settings.ANTHROPIC_API_KEY).strip()
        self.model = model or self.settings.ANTHROPIC_MODEL

        if client:
            self.client = client
        elif not self.api_key:
            logger.warning("Anthropic API key not configured")
            self.client = None
        else:
            self.client = AsyncAnthropic(api_key=self.api_key)

    async def generate_checkin_feedback(
        self,
        symptoms: list[str],
        intensity: int,
        mood: str,
        history_summary: str = "",
    ) -> str:
        """Generate empathetic feedback for a check-in.

        Args:
            symptoms: List of symptoms reported
            intensity: Symptom intensity (1-10)
            mood: Patient's mood description
            history_summary: Optional summary of patient history

        Returns:
            Generated feedback text (truncated to 500 characters)

        Note:
            If the API call fails, returns an empty string and logs an error.
            The failure does not raise an exception to avoid disrupting the worker flow.
        """
        if not self.client:
            logger.warning("Anthropic client not initialized")
            return ""

        try:
            symptoms_text = ", ".join(symptoms) if symptoms else "nenhum sintoma relatado"

            user_message = f"""Sintomas: {symptoms_text}
Intensidade: {intensity}/10
Humor: {mood}
Histórico: {history_summary if history_summary else "Não disponível"}

Forneça um feedback empático e acolhedor para este paciente."""

            response = await self.client.messages.create(
                model=self.model,
                max_tokens=500,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
                timeout=30.0,
            )

            feedback = response.content[0].text.strip()

            if len(feedback) > 500:
                feedback = feedback[:497] + "..."

            return feedback

        except Exception as e:
            logger.error(
                "Failed to generate AI feedback: %s",
                str(e),
                extra={
                    "symptoms": symptoms,
                    "intensity": intensity,
                    "mood": mood,
                },
            )
            return ""


def get_anthropic_client() -> AIClient | None:
    """Factory function to get an AI client instance.

    Returns:
        AIClient instance or None if API key is not configured
    """
    settings = get_settings()
    api_key = settings.ANTHROPIC_API_KEY.strip()
    if not api_key:
        return None
    return AIClient(api_key=api_key, model=settings.ANTHROPIC_MODEL)
