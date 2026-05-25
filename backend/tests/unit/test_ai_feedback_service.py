from pequi.services.ai_feedback_service import AIFeedbackService


def test_sanitize_removes_cpf_and_email():
    service = AIFeedbackService()
    text = "Contato: joao@email.com ou CPF 123.456.789-00"
    result = service._sanitize(text)
    assert "joao@email.com" not in result
    assert "123.456.789-00" not in result
    assert "[redacted]" in result
