from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings


def _build_connect_args(database_url: str) -> dict:
    """O pooler do Supabase (PgBouncer em modo transaction, porta 6543) não
    suporta prepared statements nomeados/cacheados. Quando detectamos o pooler,
    desabilitamos o cache de statements do asyncpg e do SQLAlchemy para evitar
    erros do tipo "prepared statement ... does not exist / already exists"."""
    is_pooler = "pooler.supabase.com" in database_url or ":6543" in database_url
    if is_pooler:
        return {
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
        }
    return {}


engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    connect_args=_build_connect_args(settings.database_url),
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency do FastAPI: fornece uma sessão async por requisição."""
    async with AsyncSessionLocal() as session:
        yield session
