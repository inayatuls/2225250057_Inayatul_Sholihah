from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
ROOT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    app_env: str = "development"
    database_url: str = f"sqlite+aiosqlite:///{(BACKEND_DIR / 'dev.db').as_posix()}"
    jwt_secret: str = "dev-secret-ganti-di-produksi-minimal-32-karakter"
    jwt_access_ttl_min: int = 15
    jwt_refresh_ttl_days: int = 7
    cors_origins: str = "http://localhost:5173"
    cookie_secure: bool = False
    login_rate_per_min: int = 5
    frontend_dist: Path = ROOT_DIR / "frontend" / "dist"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
