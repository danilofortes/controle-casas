"""Acesso às preferências globais (tabela `configuracao`)."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Configuracao

CHAVE_MORADORES_ADMIN = "moradores_administradora"


async def get_moradores_administradora(session: AsyncSession) -> int:
    """Quantidade fixa de moradores da casa administradora (padrão 0)."""
    cfg = await session.get(Configuracao, CHAVE_MORADORES_ADMIN)
    if cfg is None:
        return 0
    try:
        return max(0, int(cfg.valor))
    except (TypeError, ValueError):
        return 0


async def set_moradores_administradora(session: AsyncSession, valor: int) -> int:
    cfg = await session.get(Configuracao, CHAVE_MORADORES_ADMIN)
    if cfg is None:
        session.add(Configuracao(chave=CHAVE_MORADORES_ADMIN, valor=str(valor)))
    else:
        cfg.valor = str(valor)
    await session.commit()
    return valor
