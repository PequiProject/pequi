# M3 - Treatments, Doses & Journey

> **Status:** Em implementacao
> **Depende de:** M2

## Objetivo

Permitir que o paciente gerencie seu tratamento PB/MB, registre doses e acompanhe uma jornada
mensal unificada. Profissionais continuam podendo criar tratamentos e registrar doses
supervisionadas pelo contrato legado `/v1`.

## Modelo

- `treatments.prescribed_by` e opcional para tratamentos patient-first criados em `/v2`.
- Campos profissionais permanecem disponiveis para compatibilidade `/v1`.
- Apenas um tratamento ativo e permitido por paciente.
- `dose_logs` impede duplicidade por tratamento, medicamento e horario esperado.
- Adesao e lida exclusivamente de `adherence_snapshots`.

### Journey events

`journey_events` persiste eventos clinicos unificados:

```text
id, patient_id, treatment_id, event_type, title, description,
occurred_at, metadata, source_type, source_id, created_at
```

Tipos suportados pela modelagem incluem `consultation`, `dose_registered`, `treatment_started`,
`treatment_completed`, `clinical_improvement`, `clinical_worsening` e `alert`.

O registro de uma dose cria automaticamente um evento `dose_registered` na mesma transacao.
`source_type` e `source_id` permitem idempotencia e integracao futura por workers de check-in.

## Journey

| Metodo | Path | Auth | Limite |
|---|---|---|---|
| `GET` | `/v1/patients/me/journey` | patient | 100/min |
| `GET` | `/v2/journey` | patient | 100/min |

A resposta inclui blocos `patient`, `treatment` e `summary`, meses em ordem decrescente,
`month_number`, `is_current`, eventos unificados, progresso, consultas e doses registradas.

## Regras

- Nao calcular adesao em tempo real.
- Nao usar `CASCADE DELETE` em dados clinicos.
- Paciente acessa somente seu proprio tratamento e sua propria jornada.
- Dose duplicada retorna conflito sem desfazer outras alteracoes da transacao.
- Eventos futuros de check-in devem ser persistidos por worker em `journey_events`.

## Criterios de aceite

- [x] Tratamentos PB e MB calculam duracao esperada.
- [x] Dose duplicada retorna conflito.
- [x] Dose registrada cria evento persistido na Journey.
- [x] Journey agrupa eventos pelo mes correto.
- [x] Journey identifica o mes atual.
- [x] Journey retorna meses em ordem decrescente.
- [x] Resumo retorna progresso, consultas e doses registradas.
- [x] Modelagem suporta eventos clinicos futuros.
- [x] Testes unitarios, integracao e E2E cobrem o fluxo principal.
