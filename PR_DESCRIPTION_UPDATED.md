# Pull Request — PEQ-79 | 22-05-2026

## Descrição

Este PR introduz o **sistema completo de check-ins** para o aplicativo Pequi (Milestone M4), permitindo que pacientes enviem relatórios diários de sintomas, com **avaliação automatizada de alertas** e **feedback alimentado por IA**. Esta funcionalidade permite que profissionais de saúde monitorem a adesão ao tratamento e detectem deterioração clínica precocemente.

---

## Funcionalidades

- Implementado **sistema de check-in de pacientes** com submissão de sintomas diários
- Adicionado **sistema de alertas automatizados** baseado em:
  - Pico de sintomas (intensidade ≥ 8)
  - Declínio de humor (3 dias consecutivos com humor `terrible`)
  - Doses perdidas (mais de 3 doses em uma semana)
- Criado **sistema de feedback via IA** (Anthropic API) para check-ins com alta gravidade
- Implementado **histórico de check-ins** com paginação
- Adicionado **resolução de alertas** por profissionais de saúde
- Criado **fila de jobs assíncronos** (ARQ + Redis) para processamento em background

---

## Arquitetura

- **Camadas afetadas:**
  - `routers/` - Novos endpoints `/v1/checkins` (submit, get, history) e `/v1/alerts` (list, resolve)
  - `use_cases/` - SubmitCheckinUseCase, GetCheckinUseCase, GetCheckinHistoryUseCase, ListAlertsUseCase, ResolveAlertUseCase
  - `services/` - AlertService, AIFeedbackService, NotificationService
  - `repositories/` - CheckinRepository, AlertRepository
  - `models/` - Checkin, Alert ORM models
  - `schemas/` - CheckinCreate, CheckinResponse, AlertResponse, CheckinHistoryResponse
  - `workers/` - AIFeedbackWorker, job enqueueing
  - `integrations/` - AIClient (Anthropic API integration)

- **Cadeia de dependências respeitada:**
  ```
  routers/checkin.py → use_cases/submit_checkin.py → services/alert_service.py → repositories/checkin_repo.py → database.py
  ```

---

## Mudanças no Banco de Dados

**Migration:** `005_create_checkins.py`

- Criada tabela `checkins` com:
  - `id` (UUID, primary key)
  - `patient_id` (UUID, foreign key para patient_profiles)
  - `symptom_ids` (array de UUIDs)
  - `symptom_intensity` (integer 0-10)
  - `mood` (integer 1-5)
  - `notes` (text, nullable)
  - `ai_feedback` (text, nullable)
  - `created_at` (TIMESTAMPTZ)

- Criada tabela `alerts` com:
  - `id` (UUID, primary key)
  - `patient_id` (UUID, foreign key para patient_profiles)
  - `checkin_id` (UUID, foreign key para checkins)
  - `alert_type` (enum: symptom_spike, mood_decline, missed_doses)
  - `severity` (enum: low, medium, high, critical)
  - `resolved_at` (TIMESTAMPTZ, nullable)
  - `created_at` (TIMESTAMPTZ)

**Constraints:**
- Sem `CASCADE DELETE` - usa `ON DELETE RESTRICT`
- Ambas `upgrade()` e `downgrade()` implementadas

---

## Privacidade e LGPD

- Sem dados PII nos check-ins (usa apenas UUIDs)
- Sem nomes de pacientes, CPFs ou coordenadas nos logs
- Feedback da IA sanitiza CPF e e-mail antes do processamento
- Logs de auditoria para acesso profissional a dados de paciente (via structlog)
- Sem exposição de `user_id` em qualquer endpoint

---

## Testes

**Testes unitários:**
- `test_checkin_schema.py` - Validação Pydantic para intensidade de sintomas (0-10) e requisitos de symptom_ids
- `test_alert_service.py` - Lógica de avaliação de alertas (pico de sintomas, declínio de humor, doses perdidas)
- `test_ai_feedback_service.py` - Sanitização de PII (remoção de CPF e e-mail)

**Testes de integração:**
- `test_checkin_flow.py` - Fluxo completo de submissão de check-in com avaliação de alertas
- `test_alert_after_checkin.py` - Criação de alerta após check-in com alta intensidade de sintomas
- `test_checkin_history.py` - Recuperação histórica de check-ins com paginação

**Resultados dos testes:** 61 passed em 8.34s

---

## Contrato de API

**Arquivos Bruno criados:**
- `backend/bruno/checkin/submit_checkin.bru` - POST /v1/checkins
- `backend/bruno/checkin/get_checkin.bru` - GET /v1/checkins/{id}
- `backend/bruno/checkin/get_history.bru` - GET /v1/checkins/history
- `backend/bruno/checkin/list_alerts.bru` - GET /v1/alerts
- `backend/bruno/checkin/resolve_alert.bru` - PATCH /v1/alerts/{id}/resolve

**Rate limits:**
- POST /v1/checkins: `@user_limiter.limit("10/minute")`
- GET /v1/checkins/{id}: `@user_limiter.limit("100/minute")`
- GET /v1/checkins/history: `@user_limiter.limit("100/minute")`
- GET /v1/alerts: `@user_limiter.limit("100/minute")`
- PATCH /v1/alerts/{id}/resolve: `@user_limiter.limit("20/minute")`
- Todos os endpoints seguem prefixo `/v1/`

---

## Integração

- Avaliação de alertas integrada ao pipeline de submissão de check-in
- Processamento de feedback via IA em background via ARQ workers (após commit da transação)
- Notificações enviadas quando feedback é gerado
- Ordenação e paginação aplicadas no nível de repositório

---

## Observações

- O sistema de alertas é **baseado em regras clínicas** e documentado no código
- Garante compatibilidade com as **limitações de latência** via processamento assíncrono
- Melhora a usabilidade especialmente para **monitoramento remoto**
- Melhorias futuras podem incluir **regras de alerta personalizadas por profissional**

---

## Checklist

- [x] Todos os commits seguem o formato Conventional Commits
- [x] Sem dados pessoais (CPF, nome do paciente, coordenadas) em código, logs ou mensagens de commit
- [x] Sem credenciais ou URLs de produção hardcoded
- [x] Sem instruções `print()` restantes - usa `structlog` apenas
- [x] Todos os testes passam (61 passed)
- [x] Verificações de lint e format passam
- [x] Migration tem ambas `upgrade()` e `downgrade()`
- [x] Sem `CASCADE DELETE` em entidades clínicas
- [x] Arquivos Bruno criados para todos os novos endpoints
- [x] Rate limits aplicados em endpoints sensíveis (user_limiter em endpoints autenticados)
- [x] Cadeia de dependências respeitada (routers → use_cases → services → repositories)
- [x] Testes unitários e de integração adicionados
- [x] Enqueue de IA após commit da transação (BackgroundTasks)
- [x] Logs de auditoria para acesso profissional a dados de paciente
