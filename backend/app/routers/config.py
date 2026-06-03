from fastapi import APIRouter

from app.deps import SessionDep, UsuarioDep
from app.schemas.config import ConfiguracaoOut, ConfiguracaoUpdate
from app.services.config import (
    get_moradores_administradora,
    set_moradores_administradora,
)

router = APIRouter(prefix="/config", tags=["config"])


@router.get("", response_model=ConfiguracaoOut)
async def obter(session: SessionDep, _: UsuarioDep) -> ConfiguracaoOut:
    return ConfiguracaoOut(
        moradores_administradora=await get_moradores_administradora(session)
    )


@router.put("", response_model=ConfiguracaoOut)
async def atualizar(
    dados: ConfiguracaoUpdate, session: SessionDep, _: UsuarioDep
) -> ConfiguracaoOut:
    valor = await set_moradores_administradora(
        session, dados.moradores_administradora
    )
    return ConfiguracaoOut(moradores_administradora=valor)
