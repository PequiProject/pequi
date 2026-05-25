"""Testes unitários para AdherenceService.calculate_pct.

Sem banco de dados, sem HTTP — isolamento total.
Cobre os três casos exigidos nos critérios de aceite do M3.
"""

from decimal import Decimal

import pytest

from pequi.services.adherence_service import AdherenceService


class TestAdherenceServiceCalculatePct:
    def test_zero_percent_when_no_doses_taken(self) -> None:
        result = AdherenceService.calculate_pct(total_doses=10, taken_doses=0)
        assert result == Decimal("0.00")

    def test_zero_percent_when_total_is_zero(self) -> None:
        """Divisão por zero retorna 0.00 sem exceção."""
        result = AdherenceService.calculate_pct(total_doses=0, taken_doses=0)
        assert result == Decimal("0.00")

    def test_thirty_three_percent(self) -> None:
        """1 de 3 doses tomadas → 33.33%."""
        result = AdherenceService.calculate_pct(total_doses=3, taken_doses=1)
        assert result == Decimal("33.33")

    def test_one_hundred_percent(self) -> None:
        result = AdherenceService.calculate_pct(total_doses=6, taken_doses=6)
        assert result == Decimal("100.00")

    def test_returns_decimal_type(self) -> None:
        result = AdherenceService.calculate_pct(total_doses=4, taken_doses=1)
        assert isinstance(result, Decimal)

    def test_rounds_to_two_decimal_places(self) -> None:
        """2/3 = 66.666... → arredonda para 66.67."""
        result = AdherenceService.calculate_pct(total_doses=3, taken_doses=2)
        assert result == Decimal("66.67")

    def test_fifty_percent(self) -> None:
        result = AdherenceService.calculate_pct(total_doses=10, taken_doses=5)
        assert result == Decimal("50.00")

    @pytest.mark.parametrize(
        ("total", "taken", "expected"),
        [
            (1, 1, Decimal("100.00")),
            (2, 1, Decimal("50.00")),
            (7, 1, Decimal("14.29")),
            (180, 120, Decimal("66.67")),
        ],
    )
    def test_parametric_cases(self, total: int, taken: int, expected: Decimal) -> None:
        assert AdherenceService.calculate_pct(total, taken) == expected
