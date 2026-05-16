from datetime import date
from uuid import uuid4

from pequi.schemas.patient import PatientProfileRead, PatientProfileUpdate


def test_patient_schema_roundtrip():
    data = {
        "id": uuid4(),
        "user_id": uuid4(),
        "health_unit_id": uuid4(),
        "date_of_birth": date(1990, 1, 1),
        "sex": "M",
        "neighborhood": "Centro",
        "city": "Cidade",
        "state": "ST",
        "disability_grade": 0,
    }

    p = PatientProfileRead.model_validate(data)
    assert p.city == "Cidade"

    upd = PatientProfileUpdate.model_validate({"neighborhood": "Bairro"})
    assert upd.neighborhood == "Bairro"
