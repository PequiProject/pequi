import logging

import pytest

from pequi.config import Settings
from pequi.core import logging as pequi_logging
from pequi.db import pg_enums


def test_pg_enum_factories_expose_expected_database_type_names():
    assert pg_enums.symptom_category_enum().name == "symptom_category_enum"
    assert pg_enums.symptom_category_enum().enums == [
        "dermatological",
        "neurological",
        "systemic",
    ]
    assert pg_enums.treatment_regimen_enum().name == "treatment_regimen_enum"
    assert pg_enums.treatment_regimen_enum().enums == ["PB", "MB"]
    assert pg_enums.treatment_status_enum().name == "treatment_status_enum"
    assert pg_enums.treatment_status_enum().enums == [
        "active",
        "completed",
        "abandoned",
        "suspended",
    ]
    assert pg_enums.dose_frequency_enum().name == "dose_frequency_enum"
    assert pg_enums.dose_frequency_enum().enums == ["daily", "monthly_supervised"]


def test_create_m3_enums_delegates_creation_to_all_factories(monkeypatch):
    created = []

    class FakeEnum:
        def __init__(self, name, create_type):
            self.name = name
            self.create_type = create_type

        def create(self, bind, *, checkfirst):
            created.append((self.name, bind, self.create_type, checkfirst))

    def factory(name):
        return lambda *, create_type=False: FakeEnum(name, create_type)

    monkeypatch.setattr(
        pg_enums,
        "M3_ENUM_FACTORIES",
        (factory("one"), factory("two")),
    )

    pg_enums.create_m3_enums("bind", checkfirst=False)

    assert created == [
        ("one", "bind", True, False),
        ("two", "bind", True, False),
    ]


def test_drop_m3_enums_drops_types_in_dependency_safe_order():
    statements = []

    class FakeOp:
        def execute(self, statement):
            statements.append(statement)

    pg_enums.drop_m3_enums_op(FakeOp())

    assert statements == [
        "DROP TYPE IF EXISTS dose_frequency_enum",
        "DROP TYPE IF EXISTS treatment_status_enum",
        "DROP TYPE IF EXISTS treatment_regimen_enum",
        "DROP TYPE IF EXISTS symptom_category_enum",
    ]


@pytest.mark.parametrize(
    ("env", "expected_level"),
    [
        ("development", logging.DEBUG),
        ("production", logging.INFO),
    ],
)
def test_configure_logging_sets_root_handler_and_noise_levels(monkeypatch, env, expected_level):
    settings = Settings(
        SECRET_KEY="test",
        DATABASE_URL="postgresql+asyncpg://pequi:pequi@localhost:5432/pequi",
        ENV=env,
    )
    monkeypatch.setattr(pequi_logging, "get_settings", lambda: settings)

    pequi_logging.configure_logging()

    root_logger = logging.getLogger()
    assert root_logger.level == expected_level
    assert len(root_logger.handlers) == 1
    assert logging.getLogger("uvicorn.access").level == logging.WARNING
    assert logging.getLogger("sqlalchemy.engine").level == logging.WARNING
    assert logging.getLogger("httpx").level == logging.WARNING


def test_get_logger_returns_bound_structlog_logger():
    logger = pequi_logging.get_logger("pequi.tests")

    assert logger is not None
