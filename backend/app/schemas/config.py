from pydantic import BaseModel, Field


class ConfiguracaoOut(BaseModel):
    moradores_administradora: int


class ConfiguracaoUpdate(BaseModel):
    moradores_administradora: int = Field(..., ge=0, le=50)
