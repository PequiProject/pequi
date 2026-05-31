from uuid import uuid4

import pytest

from pequi.services.notification_service import NotificationService


@pytest.mark.asyncio
async def test_send_feedback_sends_whatsapp_when_phone_is_available(mocker):
    whatsapp_client = mocker.Mock()
    whatsapp_client.send_message = mocker.AsyncMock(return_value="msg_123")
    service = NotificationService(whatsapp_client=whatsapp_client)

    await service.send_feedback(uuid4(), "Feedback de teste", recipient_phone="+5511999999999")

    whatsapp_client.send_message.assert_awaited_once_with(
        "+5511999999999",
        "Feedback de teste",
    )


@pytest.mark.asyncio
async def test_send_feedback_skips_whatsapp_without_phone(mocker):
    whatsapp_client = mocker.Mock()
    whatsapp_client.send_message = mocker.AsyncMock(return_value="msg_123")
    service = NotificationService(whatsapp_client=whatsapp_client)

    await service.send_feedback(uuid4(), "Feedback de teste")

    whatsapp_client.send_message.assert_not_awaited()
