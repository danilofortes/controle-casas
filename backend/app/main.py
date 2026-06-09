from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    alugueis,
    auth,
    casas,
    config,
    contas,
    dashboard,
    despesas,
    documentos,
    moradores,
    rateios,
    relatorio,
    terrenos,
    ia,
)

app = FastAPI(
    title="Controle de Casas Alugadas",
    description="API para administrar aluguéis e contas de água/luz rateadas por cabeça.",
    version="0.1.0",
)

# Nunca combine allow_origins=["*"] com allow_credentials=True: além de ser
# rejeitado pelos navegadores, expõe a API a qualquer origem. Quando as origens
# estão liberadas (curinga), desabilitamos o envio de credenciais.
_cors_origins = settings.cors_origins_list
_cors_allow_credentials = _cors_origins != ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_routers = [
    auth.router,
    terrenos.router,
    casas.router,
    moradores.router,
    contas.router,
    rateios.router,
    alugueis.router,
    despesas.router,
    documentos.router,
    relatorio.router,
    dashboard.router,
    config.router,
    ia.router,
]
for r in api_routers:
    app.include_router(r, prefix="/api")


@app.get("/api/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
