import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import SessionDep, UsuarioDep
from app.models import Casa, Terreno
from app.schemas.casa import CasaCreate, CasaDetalheOut, CasaOut, CasaUpdate
from app.services.moradores import contar_moradores_atuais

router = APIRouter(prefix="/casas", tags=["casas"])


async def _get_or_404(session, casa_id: uuid.UUID) -> Casa:
    casa = await session.get(Casa, casa_id)
    if casa is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Casa não encontrada.")
    return casa


async def _validar_terreno(session, terreno_id: uuid.UUID) -> None:
    if await session.get(Terreno, terreno_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Terreno não encontrado.")


@router.get("", response_model=list[CasaOut])
async def listar(
    session: SessionDep,
    _: UsuarioDep,
    terreno_id: uuid.UUID | None = None,
) -> list[Casa]:
    stmt = select(Casa).order_by(Casa.nome)
    if terreno_id is not None:
        stmt = stmt.where(Casa.terreno_id == terreno_id)
    return list(await session.scalars(stmt))


@router.post("", response_model=CasaOut, status_code=status.HTTP_201_CREATED)
async def criar(dados: CasaCreate, session: SessionDep, _: UsuarioDep) -> Casa:
    await _validar_terreno(session, dados.terreno_id)
    casa = Casa(**dados.model_dump())
    session.add(casa)
    await session.commit()
    await session.refresh(casa)
    return casa


@router.get("/{casa_id}", response_model=CasaDetalheOut)
async def detalhe(
    casa_id: uuid.UUID, session: SessionDep, _: UsuarioDep
) -> CasaDetalheOut:
    casa = await _get_or_404(session, casa_id)
    qtd = await contar_moradores_atuais(session, casa_id)
    return CasaDetalheOut.from_casa(casa, qtd)


@router.put("/{casa_id}", response_model=CasaOut)
async def editar(
    casa_id: uuid.UUID, dados: CasaUpdate, session: SessionDep, _: UsuarioDep
) -> Casa:
    casa = await _get_or_404(session, casa_id)
    payload = dados.model_dump(exclude_unset=True)
    if "terreno_id" in payload and payload["terreno_id"] is not None:
        await _validar_terreno(session, payload["terreno_id"])
    for campo, valor in payload.items():
        setattr(casa, campo, valor)
    await session.commit()
    await session.refresh(casa)
    return casa


@router.delete("/{casa_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir(casa_id: uuid.UUID, session: SessionDep, _: UsuarioDep) -> None:
    casa = await _get_or_404(session, casa_id)
    await session.delete(casa)
    await session.commit()
