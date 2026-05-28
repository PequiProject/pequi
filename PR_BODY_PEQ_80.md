# Pull Request — PEQ-80 | 26-05-2026

## Descrição

Este PR implementa a milestone **M5 — Body Map**, introduzindo suporte completo ao mapa corporal interativo para pacientes, incluindo:

* marcação de lesões e alterações sensitivas
* histórico imutável de evolução clínica
* upload preparado para object storage
* snapshots automáticos durante check-ins
* isolamento multi-tenant para profissionais

A implementação segue a arquitetura existente do projeto, mantendo separação clara entre:

* routers
* use cases
* repositories
* services

---

## Funcionalidades

### Mapa Corporal Atual

Implementado suporte ao estado atual do mapa corporal do paciente através de:

* `BodyMapEntry`
* upsert por `(patient_id, body_area_id)`
* soft delete via `deleted_at`
* exclusão automática de registros removidos nas consultas

Endpoints:

* `GET /v1/body-map`
* `PUT /v1/body-map`

---

### Catálogo de Áreas Corporais

Adicionado catálogo fixo de regiões corporais:

* `BodyArea`
* enums tipados:

  * `BodySide`
  * `BodySystemPart`

Inclui:

* 26 áreas corporais iniciais
* organização por:

  * cabeça
  * tronco
  * membros superiores
  * membros inferiores

Endpoint:

* `GET /v1/body-areas`

---

### Histórico Imutável

Implementado sistema append-only de snapshots clínicos:

* `BodyAreaHistory`
* snapshots nunca sofrem UPDATE/DELETE
* ordenação por `snapshot_at DESC`
* filtros por:

  * `body_area_id`
  * `finding_type`
  * intervalo de datas

Endpoint:

* `GET /v1/body-map/history`

---

### Snapshot Automático no Check-in

Integrado fluxo automático de snapshot ao submit de check-in (M4):

* snapshot criado ao finalizar check-in
* cópia do estado atual do body map
* helper reutilizável:

  * `create_body_map_snapshot(...)`

---

### Upload Preparado para MinIO/R2

Criada abstração de storage para futura integração M10:

* `StorageService`
* `FakeStorageService`

O sistema:

* NÃO armazena bytes no PostgreSQL
* salva apenas:

  * `image_url`
  * `image_key`

Endpoint:

* `POST /v1/body-map/upload`

---

## Modelagem + Migração

### Novos Models

Arquivo:

* `backend/src/pequi/models/body_map.py`

Models adicionados:

* `BodyArea`
* `BodyMapEntry`
* `BodyAreaHistory`

Inclui:

* enums tipados
* soft delete
* índices de performance
* unique parcial para impedir múltiplas entradas ativas por área/paciente

---

### Migração Alembic

Arquivo:

* `backend/alembic/versions/006_create_body_map.py`

Responsável por:

* criação de enums
* criação de tabelas
* índices
* constraints
* seed inicial das áreas corporais

Observação:

* a migração foi criada como `006_create_body_map.py`
* mantém compatibilidade com `005_create_checkins.py`

---

## Schemas (Pydantic v2)

Arquivo:

* `backend/src/pequi/schemas/body_map.py`

Schemas adicionados:

* `BodyAreaResponse`
* `BodyMapEntryCreate`
* `BodyMapEntryUpdate`
* `BodyMapEntryResponse`
* `BodyMapHistoryResponse`
* `UploadUrlResponse`
* `BodyMapUploadRequest`
* `BodyMapUpdateRequest`

Validações implementadas:

* intensidade entre `0..3`
* enums tipados
* limites de tamanho em strings
* sanitização simples
* `finding_type` obrigatório quando `remove=false`

---

## Repository Layer

Arquivo:

* `backend/src/pequi/repositories/body_map_repo.py`

Responsabilidades:

* leitura do mapa atual
* upsert transacional
* soft delete
* snapshots históricos
* filtros de histórico
* catálogo de áreas

Queries otimizadas para:

* evitar N+1
* excluir soft deleted
* ordenar snapshots eficientemente

---

## Use Cases

### Arquivos

* `backend/src/pequi/use_cases/update_body_map.py`
* `backend/src/pequi/use_cases/get_body_map_history.py`

Use cases implementados:

* `GetBodyMapUseCase`
* `UpdateBodyMapUseCase`
* `ListBodyAreasUseCase`
* `GenerateBodyMapUploadUrlUseCase`

Inclui:

* validação multi-tenant
* logs estruturados
* transações centralizadas
* isolamento de regras de negócio fora dos routers

---

## Segurança Multi-Tenant

Implementado controle de acesso entre profissionais e pacientes:

* profissionais só acessam pacientes da mesma unidade
* validação via `health_unit_id`
* proteção centralizada no use case de histórico

Logs estruturados adicionados para:

* acessos válidos
* tentativas cross-tenant

---

## Testes

### Unitários

Arquivo:

* `backend/tests/unit/test_body_map_schema.py`

Cobertura:

* intensity inválida
* enum inválido
* payload válido

---

### Integração

Arquivo:

* `backend/tests/integration/test_body_map.py`

Cobertura:

* GET body map
* PUT upsert
* soft delete
* invalid body_area_id → 404
* histórico e filtros
* upload endpoint
* isolamento multi-tenant
* snapshot via fluxo de check-in

---

## Bruno Collection

Nova coleção:

* `backend/bruno/body_map/`

Inclui:

* `get_body_map.bru`
* `update_body_map.bru`
* `get_history.bru`
* `list_body_areas.bru`
* `upload_image.bru`

Exemplos inválidos:

* `update_body_map_invalid_area.bru`
* `upload_image_invalid_type.bru`

---

## Decisões Arquiteturais

### Histórico Append-Only

O histórico clínico foi modelado como append-only:

* sem endpoints DELETE
* sem endpoints UPDATE
* repository apenas insere snapshots

Garante:

* rastreabilidade clínica
* integridade histórica
* auditabilidade

---

### Soft Delete no Estado Atual

`BodyMapEntry` utiliza:

* `deleted_at`

Benefícios:

* preservação de contexto clínico
* reversibilidade lógica
* consistência com histórico

---

### Storage Abstraction

A camada de upload foi abstraída desde a M5 para facilitar integração futura com:

* MinIO
* Cloudflare R2
* S3-compatible storage

Sem necessidade de alteração da API pública.

---

### Separação de Responsabilidades

Mantida separação clara:

* router → transporte HTTP
* use case → regras/orquestração
* repository → persistência

Sem lógica de negócio em routers.

---

## Validação Executada

* `uv run ruff check .` ✅
* `uv run ruff format --check .` ✅
* `scripts/run_tests.sh tests/unit/test_body_map_schema.py` ✅

Observação:

* suíte completa de integração bloqueada localmente por ausência de PostgreSQL ativo (`ConnectionRefusedError em 127.0.0.1:5432`)

---

## Melhorias Futuras (M10)

Planejado para integração real com object storage:

* assinatura real de upload URL
* expiração de URLs
* enforcement de MIME/type
* limite de tamanho por tenant
* antivírus assíncrono
* persistência de metadados
* segregação de bucket/prefix por tenant
* políticas LGPD de retenção e anonimização

---

## Checklist

* [x] O código compila sem erros
* [x] Testes foram adicionados ou atualizados
* [x] A documentação foi atualizada
* [ ] Revisado por pelo menos um membro da equipe
