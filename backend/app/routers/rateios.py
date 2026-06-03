import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, status

from app.deps import SessionDep, UsuarioDep
from app.models import RateioConta
from app.schemas.conta import PagamentoUpdate, RateioOut

router = APIRouter(prefix="/rateios", tags=["rateios"])


@router.patch("/{rateio_id}/pagamento", response_model=RateioOut)
async def pagamento(
    rateio_id: uuid.UUID,
    dados: PagamentoUpdate,
    session: SessionDep,
    _: UsuarioDep,
) -> RateioConta:
    rateio = await session.get(RateioConta, rateio_id)
    if rateio is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Rateio não encontrado.")
    rateio.pago = dados.pago
    if dados.pago:
        rateio.pago_em = dados.pago_em or date.today()
    else:
        rateio.pago_em = None
    await session.commit()
    await session.refresh(rateio)
    return rateio
