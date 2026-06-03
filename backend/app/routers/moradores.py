import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import SessionDep, UsuarioDep
from app.models import Casa, Morador
from app.schemas.morador import MoradorCreate, MoradorOut, MoradorUpdate

router = APIRouter(tags=["moradores"])


async def _casa_or_404(session, casa_id: uuid.UUID) -> Casa:
    casa = await session.get(Casa, casa_id)
    if casa is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Casa não encontrada.")
    return casa


async def _morador_or_404(session, morador_id: uuid.UUID) -> Morador:
    morador = await session.get(Morador, morador_id)
    if morador is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Morador não encontrado.")
    return morador


@router.get("/casas/{casa_id}/moradores", response_model=list[MoradorOut])
async def listar(
    casa_id: uuid.UUID,
    session: SessionDep,
    _: UsuarioDep,
    incluir_inativos: bool = True,
) -> list[Morador]:
    await _casa_or_404(session, casa_id)
    stmt = select(Morador).where(Morador.casa_id == casa_id).order_by(Morador.nome)
    if not incluir_inativos:
        stmt = stmt.where(Morador.data_saida.is_(None))
    return list(await session.scalars(stmt))


@router.post(
    "/casas/{casa_id}/moradores",
    response_model=MoradorOut,
    status_code=status.HTTP_201_CREATED,
)
async def adicionar(
    casa_id: uuid.UUID,
    dados: MoradorCreate,
    session: SessionDep,
    _: UsuarioDep,
) -> Morador:
    await _casa_or_404(session, casa_id)
    morador = Morador(casa_id=casa_id, **dados.model_dump())
    session.add(morador)
    await session.commit()
    await session.refresh(morador)
    return morador


@router.put("/moradores/{morador_id}", response_model=MoradorOut)
async def editar(
    morador_id: uuid.UUID,
    dados: MoradorUpdate,
    session: SessionDep,
    _: UsuarioDep,
) -> Morador:
    morador = await _morador_or_404(session, morador_id)
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(morador, campo, valor)
    await session.commit()
    await session.refresh(morador)
    return morador


@router.delete("/moradores/{morador_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover(
    morador_id: uuid.UUID, session: SessionDep, _: UsuarioDep
) -> None:
    morador = await _morador_or_404(session, morador_id)
    await session.delete(morador)
    await session.commit()
