"""Normaliza follow-up de consulta (espelha o fluxo do app Angular)."""

from typing import Any

from pequi.schemas.health_appointment import (
    AppointmentFollowUpDraftIn,
    NeurologicalAssessmentDraftIn,
)


def build_follow_up_payload(
    raw: AppointmentFollowUpDraftIn,
    *,
    neurological: NeurologicalAssessmentDraftIn | None = None,
) -> dict[str, Any] | None:
    result: dict[str, Any] = {}

    conduct = raw.conduct.strip()
    if conduct:
        result["conduct"] = conduct

    guidance = raw.guidance_received.strip()
    if guidance:
        result["guidance_received"] = guidance

    if raw.next_appointment_date:
        result["next_appointment_date"] = raw.next_appointment_date

    if raw.update_instituted_meds_from_consultation:
        result["had_medication_change"] = True
        dose_summary = " | ".join(
            part
            for part in [
                f"Prednisona {raw.instituted_prednisone_mg_kg or '—'} mg/kg",
                f"AINE {raw.instituted_aine_mg_day or '—'} mg/dia",
                f"Talidomida {raw.instituted_thalidomide_mg_day or '—'} mg/dia",
                f"Pentoxifilina {raw.instituted_pentoxifylline_mg_day or '—'} mg/dia",
                f"Outro: {raw.instituted_other_medication}"
                if raw.instituted_other_medication
                else None,
            ]
            if part
        )
        result["medication_change"] = {
            "description": raw.medication_change_description.strip() or None,
            "new_medication_name": "Medicamentos instituídos atualizados",
            "new_dose_description": dose_summary,
        }
    elif raw.register_supervised_dose:
        result["had_medication_change"] = False
        selected = [
            name
            for flag, name in (
                (raw.dose_scheme_rifampicina, "Rifampicina"),
                (raw.dose_scheme_clofazimina, "Clofazimina"),
                (raw.dose_scheme_minociclina, "Minociclina"),
                (raw.dose_scheme_ofloxacino, "Ofloxacino"),
                (raw.dose_scheme_dapsone, "Dapsona"),
            )
            if flag
        ]
        med_name = " + ".join(selected) or raw.other_medication_name.strip()
        if med_name:
            supervised: dict[str, Any] = {"medication_name": med_name}
            if raw.selected_medication_id and raw.selected_medication_id != "other":
                supervised["medication_id"] = raw.selected_medication_id
            notes = raw.supervised_dose_notes.strip()
            if notes:
                supervised["notes"] = notes
            result["supervised_dose"] = supervised
    elif raw.had_medication_change is False or not raw.update_instituted_meds_from_consultation:
        result["had_medication_change"] = False

    if raw.register_neurological_assessment and neurological is not None:
        ans = _build_neurological_record(neurological)
        if ans:
            result["neurological_assessment"] = ans

    return result if result else None


def _build_neurological_record(
    raw: NeurologicalAssessmentDraftIn,
) -> dict[str, Any] | None:
    has_gif = any(
        value != ""
        for value in (raw.gif_eye, raw.gif_hand, raw.gif_foot, raw.highest_gif)
    )
    has_details = (
        raw.assessment_date != ""
        or has_gif
        or raw.omp_sum.strip() != ""
        or raw.conduct.strip() != ""
        or raw.ubs.strip() != ""
        or raw.reference.strip() != ""
    )
    if not has_details:
        return None

    record: dict[str, Any] = {
        "assessment_date": raw.assessment_date,
        "gif_eye": raw.gif_eye,
        "gif_hand": raw.gif_hand,
        "gif_foot": raw.gif_foot,
        "highest_gif": raw.highest_gif,
        "omp_sum": raw.omp_sum,
    }
    if raw.conduct.strip():
        record["conduct"] = raw.conduct.strip()
    if raw.ubs.strip():
        record["ubs"] = raw.ubs.strip()
    if raw.reference.strip():
        record["reference"] = raw.reference.strip()
    return record


def extract_supervised_drug_names(raw: AppointmentFollowUpDraftIn) -> list[str]:
    from_schemes = [
        name
        for flag, name in (
            (raw.dose_scheme_rifampicina, "Rifampicina"),
            (raw.dose_scheme_clofazimina, "Clofazimina"),
            (raw.dose_scheme_minociclina, "Minociclina"),
            (raw.dose_scheme_ofloxacino, "Ofloxacino"),
            (raw.dose_scheme_dapsone, "Dapsona"),
        )
        if flag
    ]
    if from_schemes:
        return from_schemes

    combined = raw.other_medication_name.strip()
    if not combined:
        return []

    return [part.strip() for part in combined.split("+") if part.strip()]
