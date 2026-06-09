"""CRUD de extratos de pagamento (sem lógica de IA)."""

import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.storage import StorageError, storage
from app.deps import SessionDep, UsuarioDep
from app.models import ExtratoPagamento
from app.schemas.extrato import ExtratoOut, ExtratoUpdateIn

router = APIRouter(prefix="/extratos", tags=["extratos"])

_STATUS_VALIDOS = {"pendente", "confirmado", "rejeitado"}


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


@router.put("/{extrato_id}", response_model=ExtratoOut)
async def atualizar(
    extrato_id: uuid.UUID,
    body: ExtratoUpdateIn,
    session: SessionDep,
    _: UsuarioDep,
) -> ExtratoPagamento:
    extrato = await session.get(ExtratoPagamento, extrato_id)
    if extrato is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Extrato não encontrado.")

    dados = body.model_dump(exclude_unset=True)
    if "status" in dados and dados["status"] not in _STATUS_VALIDOS:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"status inválido. Use um de: {', '.join(sorted(_STATUS_VALIDOS))}.",
        )
    if "valor_centavos" in dados and dados["valor_centavos"] is not None and dados["valor_centavos"] < 0:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "valor_centavos não pode ser negativo.")

    for campo, valor in dados.items():
        setattr(extrato, campo, valor)

    await session.commit()
    await session.refresh(extrato)
    return extrato


@router.delete("/{extrato_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir(extrato_id: uuid.UUID, session: SessionDep, _: UsuarioDep) -> None:
    extrato = await session.get(ExtratoPagamento, extrato_id)
    if extrato is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Extrato não encontrado.")
    await storage.excluir(extrato.storage_path)
    await session.delete(extrato)
    await session.commit()
