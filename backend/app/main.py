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
    moradores,
    rateios,
    relatorio,
    terrenos,
)

app = FastAPI(
    title="Controle de Casas Alugadas",
    description="API para administrar aluguéis e contas de água/luz rateadas por cabeça.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
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
    relatorio.router,
    dashboard.router,
    config.router,
]
for r in api_routers:
    app.include_router(r, prefix="/api")


@app.get("/api/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
