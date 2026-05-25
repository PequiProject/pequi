"""Definições PostgreSQL ENUM — fonte única para Alembic e documentação de schema.

Uso em migrations Alembic:
    1. ``create_m3_enums(op.get_bind(), checkfirst=True)``
    2. Colunas: ``sa.Column(..., symptom_category_enum(create_type=False), ...)``

Nunca use ``sa.Enum(...)`` novo em ``create_table`` após ``.create()`` do mesmo tipo.
"""

from __future__ import annotations

from collections.abc import Callable

from sqlalchemy.dialects import postgresql


def _enum(
    *values: str,
    name: str,
    create_type: bool = False,
) -> postgresql.ENUM:
    return postgresql.ENUM(*values, name=name, create_type=create_type)


def symptom_category_enum(*, create_type: bool = False) -> postgresql.ENUM:
    return _enum(
        "dermatological",
        "neurological",
        "systemic",
        name="symptom_category_enum",
        create_type=create_type,
    )


def treatment_regimen_enum(*, create_type: bool = False) -> postgresql.ENUM:
    return _enum("PB", "MB", name="treatment_regimen_enum", create_type=create_type)


def treatment_status_enum(*, create_type: bool = False) -> postgresql.ENUM:
    return _enum(
        "active",
        "completed",
        "abandoned",
        "suspended",
        name="treatment_status_enum",
        create_type=create_type,
    )


def dose_frequency_enum(*, create_type: bool = False) -> postgresql.ENUM:
    return _enum(
        "daily",
        "monthly_supervised",
        name="dose_frequency_enum",
        create_type=create_type,
    )


M3_ENUM_FACTORIES: tuple[Callable[..., postgresql.ENUM], ...] = (
    symptom_category_enum,
    treatment_regimen_enum,
    treatment_status_enum,
    dose_frequency_enum,
)


def create_m3_enums(bind, *, checkfirst: bool = True) -> None:
    """Cria ENUMs do M3 uma vez, de forma idempotente."""
    for factory in M3_ENUM_FACTORIES:
        factory(create_type=True).create(bind, checkfirst=checkfirst)


def drop_m3_enums_op(op) -> None:
    """Remove ENUMs do M3 após as tabelas (downgrade Alembic)."""
    for type_name in (
        "dose_frequency_enum",
        "treatment_status_enum",
        "treatment_regimen_enum",
        "symptom_category_enum",
    ):
        op.execute(f"DROP TYPE IF EXISTS {type_name}")
