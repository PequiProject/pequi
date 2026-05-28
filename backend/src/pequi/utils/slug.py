import re
import unicodedata
from uuid import uuid4


def slugify_title(title: str) -> str:
    """Normaliza título para slug URL: minúsculas, sem acentos, hífens."""
    normalized = unicodedata.normalize("NFKD", title)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    lowered = ascii_text.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", lowered)
    return slug.strip("-")


def slug_base_from_title(title: str) -> str:
    """Retorna base de slug; se título não gera caracteres latinos, usa sufixo único."""
    base = slugify_title(title)
    if base:
        return base
    return f"artigo-{uuid4().hex[:8]}"


def unique_slug(base_slug: str, existing_slugs: list[str]) -> str:
    """Retorna slug único acrescentando sufixo numérico se necessário."""
    if base_slug not in existing_slugs:
        return base_slug
    suffix = 2
    while f"{base_slug}-{suffix}" in existing_slugs:
        suffix += 1
    return f"{base_slug}-{suffix}"
