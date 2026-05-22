"""Cliente Anthropic — usado pelo worker de feedback de IA."""

from anthropic import AsyncAnthropic

from pequi.config import get_settings

settings = get_settings()


def get_anthropic_client() -> AsyncAnthropic | None:
    api_key = settings.ANTHROPIC_API_KEY.strip()
    if not api_key:
        return None
    return AsyncAnthropic(api_key=api_key)
