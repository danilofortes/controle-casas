import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import SessionDep, UsuarioDep
from app.models import Casa, Despesa, Terreno
from app.schemas.despesa import DespesaCreate, DespesaOut, DespesaUpdate

router = APIRouter(prefix="/despesas", tags=["despesas"])


async def _despesa_or_404(session, despesa_id: uuid.UUID) -> Despesa:
    despesa = await session.get(Despesa, despesa_id)
    if despesa is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Despesa não encontrada.")
    return despesa


async def _validar_vinculos(
    session, terreno_id: uuid.UUID | None, casa_id: uuid.UUID | None
) -> None:
    if terreno_id is not None and await session.get(Terreno, terreno_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Terreno não encontrado.")
    if casa_id is not None and await session.get(Casa, casa_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Casa não encontrada.")


@router.get("", response_model=list[DespesaOut])
async def listar(
    session: SessionDep,
    _: UsuarioDep,
    terreno_id: uuid.UUID | None = None,
    casa_id: uuid.UUID | None = None,
) -> list[Despesa]:
    stmt = select(Despesa).order_by(Despesa.data.desc())
    if terreno_id is not None:
        stmt = stmt.where(Despesa.terreno_id == terreno_id)
    if casa_id is not None:
        stmt = stmt.where(Despesa.casa_id == casa_id)
    return list(await session.scalars(stmt))


@router.post("", response_model=DespesaOut, status_code=status.HTTP_201_CREATED)
async def criar(dados: DespesaCreate, session: SessionDep, _: UsuarioDep) -> Despesa:
    await _validar_vinculos(session, dados.terreno_id, dados.casa_id)
    despesa = Despesa(**dados.model_dump())
    session.add(despesa)
    await session.commit()
    await session.refresh(despesa)
    return despesa


@router.put("/{despesa_id}", response_model=DespesaOut)
async def editar(
    despesa_id: uuid.UUID,
    dados: DespesaUpdate,
    session: SessionDep,
    _: UsuarioDep,
) -> Despesa:
    despesa = await _despesa_or_404(session, despesa_id)
    payload = dados.model_dump(exclude_unset=True)
    await _validar_vinculos(
        session, payload.get("terreno_id"), payload.get("casa_id")
    )
    for campo, valor in payload.items():
        setattr(despesa, campo, valor)
    await session.commit()
    await session.refresh(despesa)
    return despesa


@router.delete("/{despesa_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir(despesa_id: uuid.UUID, session: SessionDep, _: UsuarioDep) -> None:
    despesa = await _despesa_or_404(session, despesa_id)
    await session.delete(despesa)
    await session.commit()
