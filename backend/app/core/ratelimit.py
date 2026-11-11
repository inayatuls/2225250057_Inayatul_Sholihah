import time
from collections import defaultdict, deque

from app.core.errors import AppError


class RateLimiter:
    """Pembatas sederhana di memori (cukup untuk satu proses server)."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str, limit: int, window_s: float = 60.0) -> None:
        now = time.monotonic()
        q = self._hits[key]
        while q and now - q[0] > window_s:
            q.popleft()
        if len(q) >= limit:
            raise AppError(429, "TOO_MANY_ATTEMPTS", "Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.")
        q.append(now)

    def reset(self) -> None:
        self._hits.clear()


login_limiter = RateLimiter()
