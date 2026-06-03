import hmac
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings

ALGORITHM = "HS256"


def senha_correta(senha_informada: str) -> bool:
    """Compara a senha informada com `APP_SENHA` de forma resistente a timing."""
    return hmac.compare_digest(senha_informada, settings.app_senha)


def criar_token() -> str:
    """Cria um JWT HS256 de sessão com validade configurável."""
    agora = datetime.now(timezone.utc)
    expira = agora + timedelta(minutes=settings.app_session_expire_minutes)
    payload = {
        "sub": "admin",
        "iat": int(agora.timestamp()),
        "exp": int(expira.timestamp()),
    }
    return jwt.encode(payload, settings.app_session_secret, algorithm=ALGORITHM)


def validar_token(token: str) -> dict:
    """Valida e decodifica o token. Lança `jwt.PyJWTError` se inválido/expirado."""
    return jwt.decode(token, settings.app_session_secret, algorithms=[ALGORITHM])
