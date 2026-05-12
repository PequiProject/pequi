# M9 — ARQ Workers

> **Status:** 🔜 Pendente
> **Depende de:** M4
> **Bloqueado por:** —

## Objetivo

Implementar os workers assíncronos ARQ que processam tarefas em background: cálculo de adesão periódico, envio de notificações WhatsApp e geração de resumos semanais de sintomas. Workers rodam em container separado (`worker` service no docker-compose).

## Jobs implementados

### `adherence_worker` — Cálculo de adesão

```
Trigger:  Cron diário (00:05 UTC)
Ação:     Para cada tratamento ativo:
          1. Busca dose_logs dos últimos 7 e 30 dias
          2. Calcula AdherenceService.calculate_pct()
          3. Upsert em adherence_snapshots
          4. Se adesão < 70%: enfileira notification_job('low_adherence', patient_id)
```

### `notification_worker` — Envio de notificações

```
Trigger:  Enfileirado por outros workers/use_cases
Ação:     1. Busca preferências de notificação do paciente
          2. Envia via WhatsApp (integrations/whatsapp.py)
          3. Registra status de envio
Tipos:
  - 'dose_reminder'     → lembrete diário de dose
  - 'ai_feedback'       → feedback gerado pela IA
  - 'low_adherence'     → alerta de baixa adesão para profissional
  - 'alert_generated'   → novo alerta para profissional
```

### `summary_worker` — Resumo semanal

```
Trigger:  Cron semanal (Domingo 01:00 UTC)
Ação:     Para cada paciente ativo:
          1. Agrega check-ins da semana
          2. Calcula avg_intensity, dominant_mood, checkin_count, alert_count
          3. Upsert em weekly_symptom_summaries
```

### `ai_feedback_worker` — Feedback de IA (enfileirado por submit_checkin)

```
Trigger:  Enfileirado quando symptom_intensity >= 7
Ação:     1. Busca checkin + histórico recente
          2. Chama integrations/ai_client.py (Anthropic)
          3. Update checkin.ai_feedback + checkin.ai_feedback_at
          4. Enfileira notification_job('ai_feedback', patient_id)
```

## Arquivos criados

| Arquivo | Descrição |
|---------|-----------|
| `workers/settings.py` | `WorkerSettings` ARQ: Redis URL, jobs, cron |
| `workers/adherence_worker.py` | Job de cálculo de adesão |
| `workers/notification_worker.py` | Job de envio de notificações |
| `workers/summary_worker.py` | Job de resumo semanal |
| `workers/ai_feedback_worker.py` | Job de feedback IA |
| `tests/unit/test_adherence_worker.py` | Testes do worker de adesão |

## Configuração ARQ

```python
# workers/settings.py
class WorkerSettings:
    functions = [
        adherence_job,
        notification_job,
        summary_job,
        ai_feedback_job,
    ]
    cron_jobs = [
        cron(adherence_job, hour=0, minute=5),    # diário 00:05 UTC
        cron(summary_job, weekday=6, hour=1),      # domingo 01:00 UTC
    ]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    max_jobs = 10
    job_timeout = 300   # 5 minutos
    keep_result = 3600  # resultado mantido 1 hora
```

## Regras

- Workers **nunca** acessam banco diretamente — usam repositories via `AsyncSession`
- Cada job cria sua própria sessão de banco (não compartilhada entre jobs)
- Falhas são logadas via structlog e reportadas ao Sentry (sem PII nos logs)
- Idempotência: jobs de cálculo podem reprocessar o mesmo período sem duplicar dados (upsert)
- Dose reminder só é enviado se paciente tiver `notifications_enabled=true`

## Critérios de aceite

- [ ] `python -m arq pequi.workers.settings.WorkerSettings` inicia sem erros
- [ ] Cron de adesão processa corretamente (mock do banco nos testes)
- [ ] Falha na API do WhatsApp não derruba o worker (retry com backoff)
- [ ] Logs não contêm nome, CPF ou data de nascimento do paciente
