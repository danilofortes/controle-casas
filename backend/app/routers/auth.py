from fastapi import APIRouter, HTTPException, status

from app.core.security import criar_token, senha_correta
from app.schemas.auth import LoginRequest, MensagemResponse, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(dados: LoginRequest) -> TokenResponse:
    if not senha_correta(dados.senha):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Senha incorreta.",
        )
    return TokenResponse(access_token=criar_token())


@router.post("/logout", response_model=MensagemResponse)
async def logout() -> MensagemResponse:
    # Sessão é stateless (JWT). O cliente apenas descarta o token.
    return MensagemResponse(detail="Sessão encerrada. Descarte o token no cliente.")
