import math


class ArticleService:
    """Regras puras de artigo (sem acesso a banco)."""

    WORDS_PER_MINUTE = 200

    @staticmethod
    def calculate_reading_time_min(content: str) -> int:
        word_count = len(content.split())
        if word_count == 0:
            return 0
        return math.ceil(word_count / ArticleService.WORDS_PER_MINUTE)
