from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configurações da aplicação, lidas de variáveis de ambiente / arquivo .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/controle_casas",
        alias="DATABASE_URL",
    )
    app_senha: str = Field(default="troque-esta-senha", alias="APP_SENHA")
    app_session_secret: str = Field(
        default="troque-este-segredo", alias="APP_SESSION_SECRET"
    )
    app_session_expire_minutes: int = Field(
        default=43200, alias="APP_SESSION_EXPIRE_MINUTES"
    )
    app_cors_origins: str = Field(default="*", alias="APP_CORS_ORIGINS")

    @property
    def cors_origins_list(self) -> list[str]:
        if self.app_cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.app_cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
