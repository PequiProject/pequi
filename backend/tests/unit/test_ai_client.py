"""Unit tests for AI client."""

import pytest

from pequi.config import Settings
from pequi.integrations.ai_client import SYSTEM_PROMPT, AIClient, get_anthropic_client


@pytest.fixture
def mock_settings():
    """Mock settings with test credentials."""
    return Settings(
        SECRET_KEY="test-secret",
        DATABASE_URL="postgresql+asyncpg://test:test@localhost/test",
        ANTHROPIC_API_KEY="test_key",
        ANTHROPIC_MODEL="claude-3-5-haiku-20241022",
    )


class TestAIClient:
    """Test AI client functionality."""

    def test_init_with_api_key(self, mock_settings):
        """Test client initialization with API key."""
        client = AIClient(settings=mock_settings)
        assert client.api_key == "test_key"
        assert client.model == "claude-3-5-haiku-20241022"
        assert client.client is not None

    def test_init_without_api_key(self, mock_settings, caplog):
        """Test client initialization without API key."""
        mock_settings.ANTHROPIC_API_KEY = ""

        with caplog.at_level("WARNING"):
            client = AIClient(settings=mock_settings)

        assert client.client is None
        assert "Anthropic API key not configured" in caplog.text

    def test_init_with_custom_parameters(self):
        """Test client initialization with custom parameters."""
        client = AIClient(api_key="custom_key", model="custom_model")
        assert client.api_key == "custom_key"
        assert client.model == "custom_model"

    def test_init_strips_api_key(self):
        """Test that the API key is stripped of whitespace."""
        client = AIClient(api_key="  custom_key  ", model="custom_model")
        assert client.api_key == "custom_key"

    @pytest.mark.asyncio
    async def test_generate_checkin_feedback_success(self, mock_settings, mocker):
        """Test successful feedback generation."""
        mock_response = mocker.Mock()
        mock_content = mocker.Mock()
        mock_content.text = (
            "Entendo que você está passando por um momento difícil. Continue acompanhando "
            "com sua equipe de saúde."
        )
        mock_response.content = [mock_content]

        mock_client = mocker.Mock()
        mock_client.messages.create = mocker.AsyncMock(return_value=mock_response)

        client = AIClient(settings=mock_settings, client=mock_client)
        feedback = await client.generate_checkin_feedback(
            symptoms=["dor", "fadiga"],
            intensity=7,
            mood="triste",
            history_summary="Paciente em tratamento há 3 meses",
        )

        assert feedback == (
            "Entendo que você está passando por um momento difícil. Continue acompanhando "
            "com sua equipe de saúde."
        )
        mock_client.messages.create.assert_called_once()
        call_args = mock_client.messages.create.call_args
        assert call_args.kwargs["model"] == "claude-3-5-haiku-20241022"
        assert call_args.kwargs["max_tokens"] == 500
        assert call_args.kwargs["system"] == SYSTEM_PROMPT
        assert call_args.kwargs["timeout"] == 30.0

    @pytest.mark.asyncio
    async def test_generate_checkin_feedback_truncation(self, mock_settings, mocker):
        """Test that feedback is truncated to 500 characters."""
        long_text = "A" * 600
        mock_response = mocker.Mock()
        mock_content = mocker.Mock()
        mock_content.text = long_text
        mock_response.content = [mock_content]

        mock_client = mocker.Mock()
        mock_client.messages.create = mocker.AsyncMock(return_value=mock_response)

        client = AIClient(settings=mock_settings, client=mock_client)
        feedback = await client.generate_checkin_feedback(symptoms=["dor"], intensity=5, mood="ok")

        assert len(feedback) == 500
        assert feedback.endswith("...")

    @pytest.mark.asyncio
    async def test_generate_checkin_feedback_no_client(self, mock_settings, caplog):
        """Test feedback generation when client is not initialized."""
        mock_settings.ANTHROPIC_API_KEY = ""

        with caplog.at_level("WARNING"):
            client = AIClient(settings=mock_settings)
            feedback = await client.generate_checkin_feedback(
                symptoms=["dor"], intensity=5, mood="ok"
            )

        assert feedback == ""
        assert "Anthropic client not initialized" in caplog.text

    @pytest.mark.asyncio
    async def test_generate_checkin_feedback_api_error(self, mock_settings, mocker, caplog):
        """Test that API errors are logged and return empty string."""
        mock_client = mocker.Mock()
        mock_client.messages.create = mocker.AsyncMock(side_effect=Exception("API timeout"))

        with caplog.at_level("ERROR"):
            client = AIClient(settings=mock_settings, client=mock_client)
            feedback = await client.generate_checkin_feedback(
                symptoms=["dor"], intensity=5, mood="ok"
            )

        assert feedback == ""
        assert "Failed to generate AI feedback" in caplog.text

    @pytest.mark.asyncio
    async def test_generate_checkin_feedback_empty_symptoms(self, mock_settings, mocker):
        """Test feedback generation with empty symptoms list."""
        mock_response = mocker.Mock()
        mock_content = mocker.Mock()
        mock_content.text = "Obrigado pelo seu check-in."
        mock_response.content = [mock_content]

        mock_client = mocker.Mock()
        mock_client.messages.create = mocker.AsyncMock(return_value=mock_response)

        client = AIClient(settings=mock_settings, client=mock_client)
        feedback = await client.generate_checkin_feedback(symptoms=[], intensity=3, mood="bem")

        assert feedback == "Obrigado pelo seu check-in."
        call_args = mock_client.messages.create.call_args
        assert "nenhum sintoma relatado" in call_args.kwargs["messages"][0]["content"]

    @pytest.mark.asyncio
    async def test_generate_checkin_feedback_with_history(self, mock_settings, mocker):
        """Test feedback generation with patient history."""
        mock_response = mocker.Mock()
        mock_content = mocker.Mock()
        mock_content.text = "Considerando seu histórico, continue o tratamento."
        mock_response.content = [mock_content]

        mock_client = mocker.Mock()
        mock_client.messages.create = mocker.AsyncMock(return_value=mock_response)

        client = AIClient(settings=mock_settings, client=mock_client)
        feedback = await client.generate_checkin_feedback(
            symptoms=["dor"],
            intensity=6,
            mood="ansioso",
            history_summary="Paciente com histórico de reações",
        )

        assert feedback == "Considerando seu histórico, continue o tratamento."
        call_args = mock_client.messages.create.call_args
        assert "Paciente com histórico de reações" in call_args.kwargs["messages"][0]["content"]

    def test_system_prompt_content(self):
        """Test that system prompt has correct content."""
        assert "português brasileiro" in SYSTEM_PROMPT
        assert "empática" in SYSTEM_PROMPT.lower()
        assert "sem fazer diagnósticos clínicos" in SYSTEM_PROMPT.lower()
        assert "500 caracteres" in SYSTEM_PROMPT


class TestGetAnthropicClient:
    """Test factory function for AI client."""

    def test_get_client_with_api_key(self, mock_settings, mocker):
        """Test factory function with API key configured."""
        mocker.patch("pequi.integrations.ai_client.get_settings", return_value=mock_settings)

        client = get_anthropic_client()
        assert client is not None
        assert isinstance(client, AIClient)

    def test_get_client_without_api_key(self, mocker):
        """Test factory function without API key configured."""
        mock_settings = Settings(
            SECRET_KEY="test-secret",
            DATABASE_URL="postgresql+asyncpg://test:test@localhost/test",
            ANTHROPIC_API_KEY="",
        )
        mocker.patch("pequi.integrations.ai_client.get_settings", return_value=mock_settings)

        client = get_anthropic_client()
        assert client is None

    def test_get_client_with_whitespace_api_key(self, mocker):
        """Test factory function with whitespace-only API key."""
        mock_settings = Settings(
            SECRET_KEY="test-secret",
            DATABASE_URL="postgresql+asyncpg://test:test@localhost/test",
            ANTHROPIC_API_KEY="   ",
        )
        mocker.patch("pequi.integrations.ai_client.get_settings", return_value=mock_settings)

        client = get_anthropic_client()
        assert client is None
