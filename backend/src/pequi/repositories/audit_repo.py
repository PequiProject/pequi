from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from pequi.models.audit_log import AuditLog


class AuditRepository:
    """Repository para persistir logs de auditoria em tabela (LGPD compliance)."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def log_action(
        self,
        *,
        actor_user_id: UUID,
        actor_role: str,
        entity_type: str,
        entity_id: str | None = None,
        action: str,
        details: str | None = None,
        ip_address: str | None = None,
    ) -> AuditLog:
        """Persiste ação de auditoria na tabela audit_logs (append-only)."""
        audit_log = AuditLog(
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            details=details,
            ip_address=ip_address,
        )
        self._session.add(audit_log)
        await self._session.flush()
        await self._session.refresh(audit_log)
        return audit_log
