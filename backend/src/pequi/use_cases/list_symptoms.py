from pequi.repositories.treatment_repo import SymptomRepository
from pequi.schemas.treatment import SymptomResponse


class ListSymptomsUseCase:
    """Lista todos os sintomas do catálogo (seed-only, sem paginação)."""

    def __init__(self, symptom_repo: SymptomRepository) -> None:
        self._symptom_repo = symptom_repo

    async def execute(self) -> list[SymptomResponse]:
        symptoms = await self._symptom_repo.list_all()
        return [SymptomResponse.model_validate(s) for s in symptoms]
