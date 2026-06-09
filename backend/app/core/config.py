import os
from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Valores default inseguros: servem apenas para desenvolvimento local e NUNCA
# devem ir para produção. O validador abaixo falha na inicialização caso esses
# defaults sejam mantidos em produção.
DEFAULT_APP_SENHA = "troque-esta-senha"
DEFAULT_APP_SESSION_SECRET = "troque-este-segredo"

# Ambientes em que tolerar os defaults inseguros é aceitável (dev/teste).
_AMBIENTES_NAO_PRODUCAO = {"test", "testing", "dev", "development", "local"}


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
    app_senha: str = Field(default=DEFAULT_APP_SENHA, alias="APP_SENHA")
    app_session_secret: str = Field(
        default=DEFAULT_APP_SESSION_SECRET, alias="APP_SESSION_SECRET"
    )
    app_session_expire_minutes: int = Field(
        default=43200, alias="APP_SESSION_EXPIRE_MINUTES"
    )
    app_cors_origins: str = Field(default="*", alias="APP_CORS_ORIGINS")
    app_env: str = Field(default="production", alias="APP_ENV")
    supabase_url: str | None = Field(default=None, alias="SUPABASE_URL")
    supabase_service_key: str | None = Field(
        default=None, alias="SUPABASE_SERVICE_KEY"
    )
    supabase_storage_bucket: str = Field(
        default="documentos", alias="SUPABASE_STORAGE_BUCKET"
    )
    storage_max_upload_bytes: int = Field(
        default=25_165_824, alias="STORAGE_MAX_UPLOAD_BYTES"
    )
    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-2.5-flash-lite", alias="GEMINI_MODEL")

    @property
    def cors_origins_list(self) -> list[str]:
        if self.app_cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.app_cors_origins.split(",") if o.strip()]

    @model_validator(mode="after")
    def _exigir_secrets_em_producao(self) -> "Settings":
        """Falha rápido se os secrets default forem mantidos em produção.

        Os defaults só são tolerados em ambiente de teste (detectado via
        ``PYTEST_CURRENT_TEST``) ou quando ``APP_ENV`` indica dev/teste.
        """
        em_teste = "PYTEST_CURRENT_TEST" in os.environ
        em_nao_producao = self.app_env.strip().lower() in _AMBIENTES_NAO_PRODUCAO
        if em_teste or em_nao_producao:
            return self

        pendentes: list[str] = []
        if self.app_senha == DEFAULT_APP_SENHA:
            pendentes.append("APP_SENHA")
        if self.app_session_secret == DEFAULT_APP_SESSION_SECRET:
            pendentes.append("APP_SESSION_SECRET")
        if pendentes:
            nomes = "/".join(pendentes)
            raise RuntimeError(
                f"{nomes} não configurado(s): defina variáveis de ambiente "
                "seguras antes de iniciar a aplicação em produção."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
