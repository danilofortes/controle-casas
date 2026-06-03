import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from app.deps import SessionDep, UsuarioDep
from app.models import Casa, Terreno
from app.schemas.terreno import TerrenoCreate, TerrenoOut, TerrenoUpdate

router = APIRouter(prefix="/terrenos", tags=["terrenos"])


async def _get_or_404(session, terreno_id: uuid.UUID) -> Terreno:
    terreno = await session.get(Terreno, terreno_id)
    if terreno is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Terreno não encontrado.")
    return terreno


@router.get("", response_model=list[TerrenoOut])
async def listar(session: SessionDep, _: UsuarioDep) -> list[Terreno]:
    res = await session.scalars(select(Terreno).order_by(Terreno.nome))
    return list(res)


@router.post("", response_model=TerrenoOut, status_code=status.HTTP_201_CREATED)
async def criar(dados: TerrenoCreate, session: SessionDep, _: UsuarioDep) -> Terreno:
    terreno = Terreno(**dados.model_dump())
    session.add(terreno)
    await session.commit()
    await session.refresh(terreno)
    return terreno


@router.get("/{terreno_id}", response_model=TerrenoOut)
async def detalhe(terreno_id: uuid.UUID, session: SessionDep, _: UsuarioDep) -> Terreno:
    return await _get_or_404(session, terreno_id)


@router.put("/{terreno_id}", response_model=TerrenoOut)
async def editar(
    terreno_id: uuid.UUID,
    dados: TerrenoUpdate,
    session: SessionDep,
    _: UsuarioDep,
) -> Terreno:
    terreno = await _get_or_404(session, terreno_id)
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(terreno, campo, valor)
    await session.commit()
    await session.refresh(terreno)
    return terreno


@router.delete("/{terreno_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir(
    terreno_id: uuid.UUID,
    session: SessionDep,
    _: UsuarioDep,
    confirmar: bool = False,
) -> None:
    terreno = await _get_or_404(session, terreno_id)
    qtd_casas = await session.scalar(
        select(func.count(Casa.id)).where(Casa.terreno_id == terreno_id)
    )
    if qtd_casas and not confirmar:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"O terreno possui {qtd_casas} casa(s) vinculada(s). "
            "Reenvie com '?confirmar=true' para excluir tudo em cascata.",
        )
    await session.delete(terreno)
    await session.commit()
