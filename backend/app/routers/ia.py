"""Endpoints de IA — resumos e perguntas em linguagem natural sobre os aluguéis."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, HTTPException, Query, status

from app.deps import SessionDep, UsuarioDep
from app.routers.dashboard import dashboard as _dashboard_handler
from app.schemas.ia import PerguntaIn, RespostaIA
from app.services import ia as ia_service

router = APIRouter(tags=["ia"])


def _competencia_atual() -> str:
    hoje = date.today()
    return f"{hoje.year:04d}-{hoje.month:02d}"


async def _obter_dados_dashboard(session: SessionDep, usuario: UsuarioDep, competencia: str) -> dict:
    """Reutiliza o handler do dashboard e retorna os dados como dict."""
    resultado = await _dashboard_handler(
        session=session, _=usuario, competencia=competencia
    )
    return resultado.model_dump()


@router.get("/ia/resumo", response_model=RespostaIA)
async def resumo_ia(
    session: SessionDep,
    usuario: UsuarioDep,
    competencia: str | None = Query(default=None, description="Competência YYYY-MM"),
) -> RespostaIA:
    """Gera um resumo em linguagem natural da situação financeira do período."""
    comp = competencia or _competencia_atual()
    try:
        dados = await _obter_dados_dashboard(session, usuario, comp)
        resposta = await ia_service.gerar_resumo(dados)
    except RuntimeError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            f"Erro ao consultar IA: {exc}",
        ) from exc

    return RespostaIA(resposta=resposta, competencia=comp)


@router.post("/ia/pergunta", response_model=RespostaIA)
async def pergunta_ia(
    body: PerguntaIn,
    session: SessionDep,
    usuario: UsuarioDep,
) -> RespostaIA:
    """Responde uma pergunta em linguagem natural sobre os dados do período."""
    comp = body.competencia or _competencia_atual()
    try:
        dados = await _obter_dados_dashboard(session, usuario, comp)
        resposta = await ia_service.responder_pergunta(body.pergunta, dados)
    except RuntimeError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            f"Erro ao consultar IA: {exc}",
        ) from exc

    return RespostaIA(resposta=resposta, competencia=comp)
