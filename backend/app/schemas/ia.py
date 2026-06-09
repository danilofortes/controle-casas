from pydantic import BaseModel


class PerguntaIn(BaseModel):
    pergunta: str
    competencia: str | None = None


class RespostaIA(BaseModel):
    resposta: str
    competencia: str | None = None
