from pequi.schemas.health_appointment import AppointmentFollowUpDraftIn
from pequi.services.appointment_follow_up import (
    build_follow_up_payload,
    extract_supervised_drug_names,
)


def test_build_supervised_dose_follow_up():
    payload = build_follow_up_payload(
        AppointmentFollowUpDraftIn(
            register_supervised_dose=True,
            dose_scheme_rifampicina=True,
            dose_scheme_dapsone=True,
        )
    )
    assert payload is not None
    assert payload["supervised_dose"]["medication_name"] == "Rifampicina + Dapsona"


def test_extract_drug_names_from_other_field():
    names = extract_supervised_drug_names(
        AppointmentFollowUpDraftIn(
            other_medication_name="Rifampicina + Clofazimina",
        )
    )
    assert names == ["Rifampicina", "Clofazimina"]
