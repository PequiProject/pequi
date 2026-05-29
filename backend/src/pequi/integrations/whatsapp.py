"""WhatsApp client — supports Twilio and Evolution API."""

import asyncio
import hashlib
import logging
import re
from typing import Literal

import httpx

from pequi.config import Settings, get_settings

logger = logging.getLogger(__name__)

_E164_PATTERN = re.compile(r"^\+[1-9]\d{1,14}$")


def _get_phone_hash(to: str) -> str:
    return hashlib.sha256(to.encode()).hexdigest()[:8]


class WhatsAppClient:
    """WhatsApp client supporting Twilio and Evolution API providers."""

    def __init__(
        self,
        provider: Literal["twilio", "evolution"] | None = None,
        http_client: httpx.AsyncClient | None = None,
        settings: Settings | None = None,
    ) -> None:
        """Initialize WhatsApp client.

        Args:
            provider: WhatsApp provider (twilio or evolution). Defaults to settings.
            http_client: Optional httpx client for testing.
            settings: Optional settings for testing.
        """
        self.settings = settings or get_settings()
        self.provider = provider or self.settings.WHATSAPP_PROVIDER
        self._http_client_owned = http_client is None
        self.http_client = http_client or httpx.AsyncClient(timeout=30.0)

    async def send_message(self, to: str, body: str) -> str:
        """Send a WhatsApp message.

        Args:
            to: Phone number in E.164 format (e.g., +5511999999999)
            body: Message content

        Returns:
            Message ID from the provider

        Raises:
            ValueError: If provider credentials are not configured or provider is unsupported
        """
        if not _E164_PATTERN.match(to):
            raise ValueError("Phone number must be in E.164 format")
        for attempt in range(3):
            try:
                if self.provider == "twilio":
                    return await self._send_twilio_message(to, body)
                elif self.provider == "evolution":
                    return await self._send_evolution_message(to, body)
                else:
                    raise ValueError(f"Unsupported provider: {self.provider}")
            except ValueError:
                # Configuration errors should not be retried
                raise
            except Exception as e:
                if attempt == 2:
                    logger.warning(
                        "Failed to send WhatsApp message after 3 attempts: %s",
                        str(e),
                        extra={
                            "to_hash": _get_phone_hash(to),
                            "provider": self.provider,
                        },
                    )
                    return ""
                # Exponential backoff: 1s, 2s, 4s
                await asyncio.sleep(2**attempt)

        return ""

    async def send_template(
        self, to: str, template: str, params: dict[str, str]
    ) -> str:
        """Send a WhatsApp template message.

        Args:
            to: Phone number in E.164 format
            template: Template name
            params: Template parameters

        Returns:
            Message ID from the provider

        Raises:
            ValueError: If provider credentials are not configured or provider is unsupported
        """
        if not _E164_PATTERN.match(to):
            raise ValueError("Phone number must be in E.164 format")

        for attempt in range(3):
            try:
                if self.provider == "twilio":
                    return await self._send_twilio_template(to, template, params)
                elif self.provider == "evolution":
                    return await self._send_evolution_template(to, template, params)
                else:
                    raise ValueError(f"Unsupported provider: {self.provider}")
            except ValueError:
                # Configuration errors should not be retried
                raise
            except Exception as e:
                if attempt == 2:
                    logger.warning(
                        "Failed to send WhatsApp template after 3 attempts: %s",
                        str(e),
                        extra={
                            "to_hash": _get_phone_hash(to),
                            "template": template,
                            "provider": self.provider,
                        },
                    )
                    return ""
                await asyncio.sleep(2**attempt)

        return ""

    async def _send_twilio_message(self, to: str, body: str) -> str:
        """Send message via Twilio API."""
        if not self.settings.TWILIO_ACCOUNT_SID or not self.settings.TWILIO_AUTH_TOKEN:
            raise ValueError("Twilio credentials not configured")

        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.settings.TWILIO_ACCOUNT_SID}/Messages.json"
        auth = (self.settings.TWILIO_ACCOUNT_SID, self.settings.TWILIO_AUTH_TOKEN)
        data = {
            "From": self.settings.TWILIO_WHATSAPP_FROM,
            "To": f"whatsapp:{to}",
            "Body": body,
        }

        response = await self.http_client.post(url, auth=auth, data=data)
        response.raise_for_status()
        result = response.json()
        return result.get("sid", "")

    async def _send_twilio_template(
        self, to: str, template: str, params: dict[str, str]
    ) -> str:
        """Send template via Twilio API."""
        if not self.settings.TWILIO_ACCOUNT_SID or not self.settings.TWILIO_AUTH_TOKEN:
            raise ValueError("Twilio credentials not configured")

        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.settings.TWILIO_ACCOUNT_SID}/Messages.json"
        auth = (self.settings.TWILIO_ACCOUNT_SID, self.settings.TWILIO_AUTH_TOKEN)
        data = {
            "From": self.settings.TWILIO_WHATSAPP_FROM,
            "To": f"whatsapp:{to}",
            "MessagingServiceSid": template,
        }

        response = await self.http_client.post(url, auth=auth, data=data)
        response.raise_for_status()
        result = response.json()
        return result.get("sid", "")

    async def _send_evolution_message(self, to: str, body: str) -> str:
        """Send message via Evolution API."""
        if not self.settings.EVOLUTION_API_URL or not self.settings.EVOLUTION_API_KEY:
            raise ValueError("Evolution API credentials not configured")

        url = f"{self.settings.EVOLUTION_API_URL}/message/sendText/{self.settings.EVOLUTION_API_KEY}"
        headers = {"Content-Type": "application/json"}
        data = {"number": to, "text": body}

        response = await self.http_client.post(url, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        return result.get("key", {}).get("id", "")

    async def _send_evolution_template(
        self, to: str, template: str, params: dict[str, str]
    ) -> str:
        """Send template via Evolution API."""
        if not self.settings.EVOLUTION_API_URL or not self.settings.EVOLUTION_API_KEY:
            raise ValueError("Evolution API credentials not configured")

        url = f"{self.settings.EVOLUTION_API_URL}/message/sendText/{self.settings.EVOLUTION_API_KEY}"
        headers = {"Content-Type": "application/json"}
        data = {
            "number": to,
            "text": template,
            "options": {"delay": 1200, "presence": "composing"},
        }

        response = await self.http_client.post(url, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        return result.get("key", {}).get("id", "")

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def close(self) -> None:
        """Close the HTTP client if this client owns it."""
        if self._http_client_owned:
            await self.http_client.aclose()
