# Pull Request — PEQ-77 | 15-05-2026

## Descrição

Este PR atende a tarefa **[PEQ-77](https://pequi-pds-team.atlassian.net/browse/PEQ-77)** no escopo do milestone **M2 — Patients** (`docs/milestones/M2-patients.md`): introduz no **backend** modelos, migração, repositórios, casos de uso, rotas de paciente (`/v1/patients/me`), contratos Bruno e testes (unitário + integração) para perfil clínico, unidade de saúde e consentimento. Objetivo é estabelecer a base de dados e API alinhada ao documento de milestone, com entregas incrementais possíveis nas próximas iterações.

---

## Funcionalidades

- **Modelos SQLAlchemy** em `src/pequi/models/`: `HealthUnit`, `PatientProfile`, `Consent` (campos alinhados ao desenho do M2; minimização de endereço no schema de leitura).
- **Migração Alembic** `alembic/versions/002_create_patients.py`: tabelas `health_units`, `patient_profiles` e `consents` (primeira revisão encadeada ao repositório; revisar FKs com tabela `users` quando M1 estiver consolidada no mesmo branch de migrações).
- **Repositories** `patient_repo.py` e `health_unit_repo.py` para leitura/atualização do perfil.
- **Use cases** `get_patient_profile` e `update_patient_profile` (resolução por `user_id` no update, consistente com o GET).
- **Router** `routers/patient.py` com `GET /me` e `PATCH /me` registrados em `main.py` sob prefixo `/v1/patients`.
- **Schemas Pydantic** `schemas/patient.py` e `schemas/health_unit.py`.
- **Bruno** `bruno/patient/get_profile.bru` e `bruno/patient/update_profile.bru`.
- **Testes** `tests/unit/test_patient_schema.py` e `tests/integration/test_patient_profile.py`.
- **`models/__init__.py`**: exporta modelos para `alembic/env.py` carregar metadados.
- **Dockerfile**: cópia de `README.md` junto ao `pyproject.toml` para build com manifest que referencia `readme` no pacote.

---

## Melhorias de TUI / UX

_Não aplicável — alteração restrita ao backend._

---

## Lógica de Prioridade

_Não aplicável._

---

## Ajustes

- **`GetPatientProfileUseCase`**: uso de `PatientProfileRead.model_validate(...)` (Pydantic v2) em substituição a `from_orm`.
- **`UpdatePatientProfileUseCase`**: passa a receber `user_id`, resolve o perfil por `get_by_user_id` e atualiza pelo `id` do paciente (alinha router ↔ use case).
- **`main.py`**: `include_router` do módulo `patient` em `/v1/patients`.

---

## Integração

- Jira: [PEQ-77](https://pequi-pds-team.atlassian.net/browse/PEQ-77).
- Milestone: `docs/milestones/M2-patients.md` (M2 — Patients).

---

## Observações

- **Escopo parcial em relação ao M2**: ainda não constam neste PR os endpoints `GET /v1/patients/{id}`, `GET /v1/patients` (profissional/admin), rate limits explícitos (`slowapi`), `audit_logs` no acesso por profissional, fluxo completo de consentimento no cadastro nem dependência real de autenticação no router (stubs `Depends` para evolução com M1).
- **ORM vs migração**: modelos referenciam `users.id`; a migração `002` cria colunas `user_id` sem FK explícita no SQL gerado — alinhar cadeia de revisões e constraints quando a tabela `users` existir na mesma linha de migrações.
- **CI / testes locais**: rodar `cd backend && scripts/run_tests.sh` com PostgreSQL de teste (`pequi_test`) disponível, conforme `AGENTS.md`.

---

## Checklist

- [ ] O código compila sem erros
- [ ] Testes foram adicionados ou atualizados
- [ ] A documentação foi atualizada
- [ ] Revisado por pelo menos um membro da equipe
