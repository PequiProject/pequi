from decimal import ROUND_HALF_UP, Decimal


class AdherenceService:
    """Cálculo stateless de percentual de adesão.

    Não acessa banco de dados. Recebe contadores brutos e retorna o percentual
    arredondado a 2 casas decimais. Use cases leem snapshots do banco; este
    serviço é usado pelo worker (M9) para gerar os valores antes de persisti-los.
    """

    @staticmethod
    def calculate_pct(total_doses: int, taken_doses: int) -> Decimal:
        """Retorna percentual de adesão como Decimal com 2 casas decimais.

        Args:
            total_doses: Total de doses previstas no período.
            taken_doses: Total de doses efetivamente tomadas.

        Returns:
            Decimal entre 0.00 e 100.00, arredondado por ROUND_HALF_UP.
        """
        if total_doses == 0:
            return Decimal("0.00")

        pct = Decimal(taken_doses) / Decimal(total_doses) * Decimal("100")
        return pct.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
