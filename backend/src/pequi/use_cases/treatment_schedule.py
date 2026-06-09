import calendar
from datetime import date

from pequi.models.treatment import TreatmentRegimen

_REGIMEN_MONTHS = {
    TreatmentRegimen.PB: 6,
    TreatmentRegimen.MB: 12,
}


def calculate_expected_end(start_date: date, regimen: TreatmentRegimen) -> date:
    """Adiciona N meses à data de início, limitando ao último dia do mês destino."""
    months = _REGIMEN_MONTHS[regimen]
    total_months = start_date.month - 1 + months
    year = start_date.year + total_months // 12
    month = total_months % 12 + 1
    day = min(start_date.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)
