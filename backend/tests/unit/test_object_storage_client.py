from unittest.mock import AsyncMock

import pytest

from pequi.config import Settings
from pequi.integrations.object_storage import ObjectStorageClient


class AsyncContextManager:
    def __init__(self, value):
        self.value = value

    async def __aenter__(self):
        return self.value

    async def __aexit__(self, exc_type, exc, tb):
        return False


@pytest.fixture
def mock_settings():
    return Settings(
        SECRET_KEY="test-secret",
        DATABASE_URL="postgresql+asyncpg://test:test@localhost/test",
        STORAGE_ENDPOINT="https://test-storage.local",
        STORAGE_ACCESS_KEY="test_access_key",
        STORAGE_SECRET_KEY="test_secret_key",
        STORAGE_BUCKET_IMAGES="test-bucket",
        STORAGE_REGION="us-east-1",
        STORAGE_PUBLIC_URL="https://cdn.test-storage.local",
    )


@pytest.fixture
def storage_client(mock_settings):
    return ObjectStorageClient(settings=mock_settings)


@pytest.mark.asyncio
async def test_get_success(storage_client, mocker):
    mock_body = AsyncMock()
    mock_body.read = AsyncMock(return_value=b"file-content")
    mock_body.__aenter__ = AsyncMock(return_value=mock_body)
    mock_body.__aexit__ = AsyncMock(return_value=False)

    mock_client = mocker.Mock()
    mock_client.get_object = AsyncMock(return_value={"Body": mock_body})

    mocker.patch.object(
        storage_client,
        "_get_client",
        new=AsyncMock(return_value=AsyncContextManager(mock_client)),
    )

    result = await storage_client.get("files/test.txt")

    assert result == b"file-content"
    mock_client.get_object.assert_called_once_with(Bucket="test-bucket", Key="files/test.txt")


@pytest.mark.asyncio
async def test_get_failure_logs_error(storage_client, mocker, caplog):
    mock_client = mocker.Mock()
    mock_client.get_object = AsyncMock(side_effect=Exception("download failed"))

    mocker.patch.object(
        storage_client,
        "_get_client",
        new=AsyncMock(return_value=AsyncContextManager(mock_client)),
    )

    with caplog.at_level("ERROR"):
        with pytest.raises(Exception, match="download failed"):
            await storage_client.get("files/test.txt")

    assert "Failed to get object from storage" in caplog.text


@pytest.mark.asyncio
async def test_delete_success(storage_client, mocker):
    mock_client = mocker.Mock()
    mock_client.delete_object = AsyncMock(return_value=None)

    mocker.patch.object(
        storage_client,
        "_get_client",
        new=AsyncMock(return_value=AsyncContextManager(mock_client)),
    )

    await storage_client.delete("files/test.txt")
    mock_client.delete_object.assert_called_once_with(Bucket="test-bucket", Key="files/test.txt")


@pytest.mark.asyncio
async def test_delete_failure_logs_error_and_does_not_raise(storage_client, mocker, caplog):
    mock_client = mocker.Mock()
    mock_client.delete_object = AsyncMock(side_effect=Exception("delete failed"))

    mocker.patch.object(
        storage_client,
        "_get_client",
        new=AsyncMock(return_value=AsyncContextManager(mock_client)),
    )

    with caplog.at_level("ERROR"):
        await storage_client.delete("files/test.txt")

    assert "Failed to delete object from storage" in caplog.text
