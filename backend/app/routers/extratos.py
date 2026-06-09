"""CRUD de extratos de pagamento (sem lógica de IA)."""

import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.storage import StorageError, storage
from app.deps import SessionDep, UsuarioDep
from app.models import ExtratoPagamento
from app.schemas.extrato import ExtratoOut

router = APIRouter(prefix="/extratos", tags=["extratos"])


@router.get("", response_model=list[ExtratoOut])
async def listar(
    session: SessionDep,
    _: UsuarioDep,
    casa_id: uuid.UUID | None = None,
    competencia: str | None = None,
    status: str | None = None,
) -> list[ExtratoPagamento]:
    stmt = select(ExtratoPagamento).order_by(ExtratoPagamento.created_at.desc())
    if casa_id:
        stmt = stmt.where(ExtratoPagamento.casa_id == casa_id)
    if competencia:
        stmt = stmt.where(ExtratoPagamento.competencia == competencia)
    if status:
        stmt = stmt.where(ExtratoPagamento.status == status)
    return list(await session.scalars(stmt))


@router.delete("/{extrato_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir(extrato_id: uuid.UUID, session: SessionDep, _: UsuarioDep) -> None:
    extrato = await session.get(ExtratoPagamento, extrato_id)
    if extrato is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Extrato não encontrado.")
    await storage.excluir(extrato.storage_path)
    await session.delete(extrato)
    await session.commit()
