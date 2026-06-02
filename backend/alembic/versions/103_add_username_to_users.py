"""add username to users

Revision ID: 103_add_username_to_users
Revises: 102_unique_constraints
Create Date: 2026-06-02 00:00:00.000000

Estratégia de migração para produção:
1. Adiciona coluna `username` como nullable.
2. Popula usuários existentes com um username derivado do prefixo do e-mail
   mais os 4 primeiros caracteres hexadecimais do UUID (garantia de unicidade).
3. Adiciona constraint NOT NULL e índice único (case-insensitive via LOWER).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "103_add_username_to_users"
down_revision: str | None = "011_create_lgpd_tables"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Adiciona coluna nullable para permitir preenchimento seguro dos registros existentes.
    op.add_column("users", sa.Column("username", sa.String(30), nullable=True))

    # 2. Popula username para usuários já cadastrados.
    #    Formato: <prefixo_email_sanitizado>_<4 hex chars do UUID>
    #    Isso garante unicidade mesmo quando múltiplos usuários compartilham o mesmo prefixo.
    op.execute(
        """
        UPDATE users
        SET username = LOWER(
            REGEXP_REPLACE(
                SPLIT_PART(email, '@', 1),
                '[^a-z0-9_\\-]', '_', 'gi'
            )
        ) || '_' || SUBSTRING(REPLACE(id::text, '-', ''), 1, 4)
        WHERE username IS NULL
        """
    )

    # 3. Garante que nenhum username ficou vazio após a sanitização (edge case).
    op.execute(
        """
        UPDATE users
        SET username = 'user_' || SUBSTRING(REPLACE(id::text, '-', ''), 1, 8)
        WHERE username IS NULL OR username = '' OR username = '_'
        """
    )

    # 4. Aplica NOT NULL após o preenchimento.
    op.alter_column("users", "username", nullable=False)

    # 5. Cria índice único case-insensitive para garantir unicidade em produção.
    op.create_index(
        "ix_users_username_lower",
        "users",
        [sa.text("LOWER(username)")],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_users_username_lower", table_name="users")
    op.drop_column("users", "username")
