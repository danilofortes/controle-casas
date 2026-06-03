from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    senha: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MensagemResponse(BaseModel):
    detail: str
