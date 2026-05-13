# Milestones — Projeto Pequi

Documentação do plano de implementação do backend. Cada milestone é uma unidade de entrega independente e deve ser confirmada antes da próxima iniciar.

## Índice

| Milestone | Título | Status |
|-----------|--------|--------|
| [M0](./M0-foundation.md) | Foundation | ✅ Em progresso |
| [M1](./M1-auth-users.md) | Auth & Users | 🔜 Pendente |
| [M2](./M2-patients.md) | Patients | 🔜 Pendente |
| [M3](./M3-treatments-doses.md) | Treatments & Doses | 🔜 Pendente |
| [M4](./M4-checkins-alerts.md) | Check-ins & Alerts | 🔜 Pendente |
| [M5](./M5-body-map.md) | Body Map | 🔜 Pendente |
| [M6](./M6-community.md) | Community | 🔜 Pendente |
| [M7](./M7-articles.md) | Articles | 🔜 Pendente |
| [M8](./M8-professional.md) | Professional Dashboard | 🔜 Pendente |
| [M9](./M9-workers.md) | ARQ Workers | 🔜 Pendente |
| [M10](./M10-integrations.md) | Integrations | 🔜 Pendente |
| [M11](./M11-lgpd.md) | LGPD & Account | 🔜 Pendente |

## Convenções

- **Cada milestone** entrega código funcional, testado e com coleção Bruno atualizada.
- **Migrações Alembic** são geradas no milestone que cria os modelos correspondentes.
- **Breaking changes** entre milestones são documentadas aqui antes de implementadas.
- O status `✅ Concluído` só é atribuído após testes passando no CI.

## Cadeia de dependências entre milestones

```
M0 (Foundation)
 └── M1 (Auth & Users)
       └── M2 (Patients)
             ├── M3 (Treatments & Doses)
             │     └── M4 (Check-ins & Alerts)
             │           ├── M5 (Body Map)
             │           ├── M9 (ARQ Workers)
             │           └── M10 (Integrations)
             ├── M6 (Community)
             ├── M7 (Articles)
             └── M8 (Professional Dashboard)
M11 (LGPD) — depende de M1..M8 (fecha o ciclo)
```
