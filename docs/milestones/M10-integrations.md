# M10 — Integrations

> **Status:** 🔜 Pendente
> **Depende de:** M9
> **Bloqueado por:** —

## Objetivo

Implementar os clientes externos que o sistema usa: WhatsApp via Twilio/Evolution API, object storage via MinIO/Cloudflare R2 (aiobotocore) e AI via Anthropic Claude. Todos os clientes são stateless, injetáveis via FastAPI Depends e mockáveis em testes.

## Clientes implementados

### `integrations/whatsapp.py` — WhatsApp

```python
class WhatsAppClient:
    async def send_message(self, to: str, body: str) -> str: ...
    async def send_template(self, to: str, template: str, params: dict) -> str: ...
```

- Suporte a Twilio (`WHATSAPP_PROVIDER=twilio`) e Evolution API (`WHATSAPP_PROVIDER=evolution`)
- Selecionado via `settings.WHATSAPP_PROVIDER` em runtime
- Retry automático com backoff exponencial (3 tentativas)
- Falha loga warning (não exception) — notificação não é crítica para o fluxo

### `integrations/object_storage.py` — MinIO / Cloudflare R2

```python
class ObjectStorageClient:
    async def upload(self, key: str, data: bytes, content_type: str) -> str: ...
    async def generate_presigned_url(self, key: str, expires: int = 3600) -> str: ...
    async def delete(self, key: str) -> None: ...
```

- Usa `aiobotocore` (S3-compatible)
- `upload()` retorna a URL pública ou pré-assinada conforme configuração
- `delete()` usado no fluxo de exclusão de conta (M11 — LGPD)
- Buckets configuráveis por variável de ambiente (`STORAGE_BUCKET_IMAGES`, etc.)

### `integrations/ai_client.py` — Anthropic Claude

```python
class AIClient:
    async def generate_checkin_feedback(
        self,
        symptoms: list[str],
        intensity: int,
        mood: str,
        history_summary: str,
    ) -> str: ...
```

- Usa `anthropic` SDK async
- Prompt de sistema garante que a resposta é em português, empática e **sem diagnóstico clínico**
- Timeout de 30s — falha loga erro mas não interrompe o fluxo do worker
- Resposta truncada a 500 caracteres antes de salvar no banco

## Arquivos criados

| Arquivo | Descrição |
|---------|-----------|
| `integrations/__init__.py` | |
| `integrations/whatsapp.py` | Cliente WhatsApp |
| `integrations/object_storage.py` | Cliente S3-compatible |
| `integrations/ai_client.py` | Cliente Anthropic |
| `tests/unit/test_whatsapp_client.py` | Mock dos clientes |
| `tests/unit/test_ai_client.py` | Mock da API Anthropic |

## Variáveis de ambiente adicionadas

```env
WHATSAPP_PROVIDER=twilio              # ou "evolution"
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
EVOLUTION_API_URL=https://...
EVOLUTION_API_KEY=...

STORAGE_ENDPOINT=http://minio:9000    # ou URL do R2
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
STORAGE_BUCKET_IMAGES=pequi-images
STORAGE_REGION=us-east-1

ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-3-5-haiku-20241022
```

## Critérios de aceite

- [ ] Testes unitários usam `pytest-mock` — nunca chamam APIs reais
- [ ] `WhatsAppClient` funciona com ambos os providers (Twilio e Evolution)
- [ ] Falha na API da Anthropic não levanta exception não tratada no worker
- [ ] `delete()` do object storage chamado corretamente no fluxo de exclusão de conta
- [ ] Nenhuma chave de API aparece em logs
