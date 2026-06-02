"""Unit tests for WhatsApp client."""

from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient, Response

from pequi.config import Settings
from pequi.integrations.whatsapp import WhatsAppClient


@pytest.fixture
def mock_settings():
    """Mock settings with test credentials."""
    return Settings(
        SECRET_KEY="test-secret",
        DATABASE_URL="postgresql+asyncpg://test:test@localhost/test",
        WHATSAPP_PROVIDER="twilio",
        TWILIO_ACCOUNT_SID="test_sid",
        TWILIO_AUTH_TOKEN="test_token",
        TWILIO_WHATSAPP_FROM="whatsapp:+14155238886",
        EVOLUTION_API_URL="https://test.evolution.api",
        EVOLUTION_API_KEY="test_key",
        EVOLUTION_INSTANCE="pequi-dev",
        TWILIO_CONTENT_SIDS={"test_template": "HX123"},
    )


@pytest.fixture
def mock_http_client():
    """Mock HTTP client for testing."""
    return AsyncClient()


@pytest.fixture
def whatsapp_client(mock_http_client, mock_settings):
    """Create WhatsApp client with mock HTTP client and settings."""
    return WhatsAppClient(provider="twilio", http_client=mock_http_client, settings=mock_settings)


class TestWhatsAppClient:
    """Test WhatsApp client functionality."""

    def test_init_default_provider(self, mock_http_client, mock_settings):
        """Test client initialization with default provider."""
        client = WhatsAppClient(http_client=mock_http_client, settings=mock_settings)
        assert client.provider == "twilio"

    def test_init_custom_provider(self, mock_http_client, mock_settings):
        """Test client initialization with custom provider."""
        client = WhatsAppClient(
            provider="evolution",
            http_client=mock_http_client,
            settings=mock_settings,
        )
        assert client.provider == "evolution"

    @pytest.mark.asyncio
    async def test_send_message_twilio_success(self, whatsapp_client, mocker):
        """Test sending message via Twilio successfully."""
        mock_response = mocker.Mock(spec=Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {"sid": "test_message_id"}

        mocker.patch.object(
            whatsapp_client.http_client,
            "post",
            new=AsyncMock(return_value=mock_response),
        )

        message_id = await whatsapp_client.send_message("+5511999999999", "Test message")
        assert message_id == "test_message_id"

    @pytest.mark.asyncio
    async def test_send_message_twilio_failure_logs_warning(self, whatsapp_client, mocker, caplog):
        """Test that Twilio failure logs warning and returns empty string."""
        mocker.patch.object(
            whatsapp_client.http_client,
            "post",
            new=AsyncMock(side_effect=Exception("API error")),
        )

        with caplog.at_level("WARNING"):
            message_id = await whatsapp_client.send_message("+5511999999999", "Test message")

        assert message_id == ""
        assert "Failed to send WhatsApp message" in caplog.text

    @pytest.mark.asyncio
    async def test_send_message_evolution_success(self, mock_settings, mocker):
        """Test sending message via Evolution API successfully."""
        mock_response = mocker.Mock(spec=Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {"key": {"id": "test_message_id"}}

        mock_http_client = mocker.Mock(spec=AsyncClient)
        mock_http_client.post = AsyncMock(return_value=mock_response)

        client = WhatsAppClient(
            provider="evolution",
            http_client=mock_http_client,
            settings=mock_settings,
        )
        message_id = await client.send_message("+5511999999999", "Test message")
        assert message_id == "test_message_id"
        mock_http_client.post.assert_called_once()
        call_args = mock_http_client.post.call_args
        assert call_args.args[0] == "https://test.evolution.api/message/sendText/pequi-dev"
        assert call_args.kwargs["headers"] == {
            "Content-Type": "application/json",
            "apikey": "test_key",
        }

    @pytest.mark.asyncio
    async def test_send_template_twilio_success(self, whatsapp_client, mocker):
        """Test sending template via Twilio successfully."""
        mock_response = mocker.Mock(spec=Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {"sid": "test_template_id"}

        mocker.patch.object(
            whatsapp_client.http_client,
            "post",
            new=AsyncMock(return_value=mock_response),
        )

        template_id = await whatsapp_client.send_template(
            "+5511999999999", "test_template", {"param1": "value1"}
        )
        assert template_id == "test_template_id"
        data = whatsapp_client.http_client.post.call_args.kwargs["data"]
        assert data["ContentSid"] == "HX123"
        assert data["ContentVariables"] == '{"param1":"value1"}'
        assert "MessagingServiceSid" not in data

    @pytest.mark.asyncio
    async def test_send_template_evolution_success(self, mock_settings, mocker):
        """Test sending template via Evolution API successfully."""
        mock_response = mocker.Mock(spec=Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {"key": {"id": "test_template_id"}}

        mock_http_client = mocker.Mock(spec=AsyncClient)
        mock_http_client.post = AsyncMock(return_value=mock_response)

        client = WhatsAppClient(
            provider="evolution",
            http_client=mock_http_client,
            settings=mock_settings,
        )
        template_id = await client.send_template(
            "+5511999999999", "test_template", {"param1": "value1"}
        )
        assert template_id == "test_template_id"
        mock_http_client.post.assert_called_once()
        call_args = mock_http_client.post.call_args
        assert call_args.args[0] == "https://test.evolution.api/message/sendTemplate/pequi-dev"
        assert call_args.kwargs["headers"] == {
            "Content-Type": "application/json",
            "apikey": "test_key",
        }
        assert call_args.kwargs["json"] == {
            "number": "+5511999999999",
            "name": "test_template",
            "language": {"code": "pt_BR"},
            "components": [
                {
                    "type": "body",
                    "parameters": [{"type": "text", "text": "value1"}],
                }
            ],
        }

    @pytest.mark.asyncio
    async def test_send_message_retry_with_backoff(self, whatsapp_client, mocker):
        """Test that message sending retries with exponential backoff."""
        mock_response = mocker.Mock(spec=Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {"sid": "test_message_id"}

        post_mock = mocker.patch.object(
            whatsapp_client.http_client,
            "post",
            new=AsyncMock(side_effect=[Exception("error"), Exception("error"), mock_response]),
        )

        message_id = await whatsapp_client.send_message("+5511999999999", "Test message")
        assert message_id == "test_message_id"
        assert post_mock.call_count == 3

    @pytest.mark.asyncio
    async def test_send_message_unsupported_provider(self, mock_http_client, mock_settings):
        """Test that unsupported provider raises ValueError."""
        client = WhatsAppClient(
            provider="unsupported",
            http_client=mock_http_client,
            settings=mock_settings,
        )
        with pytest.raises(ValueError, match="Unsupported provider"):
            await client.send_message("+5511999999999", "Test message")

    @pytest.mark.asyncio
    async def test_send_message_twilio_no_credentials(self, mock_http_client):
        """Test that missing Twilio credentials raises ValueError."""
        mock_settings = Settings(
            SECRET_KEY="test-secret",
            DATABASE_URL="postgresql+asyncpg://test:test@localhost/test",
            WHATSAPP_PROVIDER="twilio",
            TWILIO_ACCOUNT_SID="",
            TWILIO_AUTH_TOKEN="",
            TWILIO_WHATSAPP_FROM="whatsapp:+14155238886",
        )
        client = WhatsAppClient(
            provider="twilio",
            http_client=mock_http_client,
            settings=mock_settings,
        )

        with pytest.raises(ValueError, match="Twilio credentials not configured"):
            await client._send_twilio_message("+5511999999999", "Test")

    @pytest.mark.asyncio
    async def test_send_message_evolution_no_credentials(self, mock_http_client):
        """Test that missing Evolution credentials raises ValueError."""
        mock_settings = Settings(
            SECRET_KEY="test-secret",
            DATABASE_URL="postgresql+asyncpg://test:test@localhost/test",
            WHATSAPP_PROVIDER="evolution",
            EVOLUTION_API_URL="",
            EVOLUTION_API_KEY="",
        )
        client = WhatsAppClient(
            provider="evolution",
            http_client=mock_http_client,
            settings=mock_settings,
        )

        with pytest.raises(ValueError, match="Evolution API credentials not configured"):
            await client._send_evolution_message("+5511999999999", "Test")

    @pytest.mark.asyncio
    async def test_close_http_client(self, mock_settings, mocker):
        """Test that owned HTTP client is closed properly."""
        client = WhatsAppClient(settings=mock_settings)
        mocker.patch.object(client.http_client, "aclose", new=AsyncMock())

        await client.close()

        client.http_client.aclose.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_message_invalid_phone_format(self, whatsapp_client):
        """Test that invalid phone numbers raise ValueError."""
        with pytest.raises(ValueError, match=r"E\.164 format"):
            await whatsapp_client.send_message("5551999999999", "Test message")

    @pytest.mark.asyncio
    async def test_send_template_invalid_phone_format(self, whatsapp_client):
        """Test that invalid phone numbers for templates raise ValueError."""
        with pytest.raises(ValueError, match=r"E\.164 format"):
            await whatsapp_client.send_template("5511999999999", "template", {"param1": "value1"})
