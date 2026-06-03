"""Seed opcional: cria 1 terreno, 3 casas e alguns moradores de exemplo.

Uso (com o .env configurado e a migração já aplicada):
    python -m scripts.seed
"""

import asyncio
from datetime import date

from app.core.db import AsyncSessionLocal
from app.models import Casa, Morador, Terreno


async def main() -> None:
    async with AsyncSessionLocal() as session:
        terreno = Terreno(nome="Terreno Principal", endereco="Rua das Casas, 100")
        session.add(terreno)
        await session.flush()

        dados_casas = [
            ("Casa 1", 80000, 10, [("João", date(2024, 1, 1)), ("Maria", date(2024, 1, 1))]),
            ("Casa 2", 75000, 10, [("Ana", date(2024, 3, 1))]),
            ("Casa dos fundos", 60000, 5, [("Pedro", date(2023, 6, 1)), ("Lucas", date(2023, 6, 1)), ("Sofia", date(2023, 6, 1))]),
        ]
        for nome, aluguel, dia, moradores in dados_casas:
            casa = Casa(
                terreno_id=terreno.id,
                nome=nome,
                aluguel_centavos=aluguel,
                dia_vencimento=dia,
            )
            session.add(casa)
            await session.flush()
            for i, (nome_m, entrada) in enumerate(moradores):
                session.add(
                    Morador(
                        casa_id=casa.id,
                        nome=nome_m,
                        responsavel=(i == 0),
                        data_entrada=entrada,
                    )
                )

        await session.commit()
        print("Seed concluído.")


if __name__ == "__main__":
    asyncio.run(main())
