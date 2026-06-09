import pytest


async def _criar_terreno(client, nome="Terreno A"):
    r = await client.post("/api/terrenos", json={"nome": nome})
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def _criar_casa(client, terreno_id, nome, aluguel=80000, ativo=True):
    r = await client.post(
        "/api/casas",
        json={
            "terreno_id": terreno_id,
            "nome": nome,
            "aluguel_centavos": aluguel,
            "dia_vencimento": 10,
            "ativo": ativo,
        },
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def _add_morador(client, casa_id, nome, entrada="2024-01-01", saida=None):
    payload = {"nome": nome, "data_entrada": entrada}
    if saida:
        payload["data_saida"] = saida
    r = await client.post(f"/api/casas/{casa_id}/moradores", json=payload)
    assert r.status_code == 201, r.text
    return r.json()["id"]


@pytest.mark.asyncio
async def test_login_senha_errada(client):
    r = await client.post("/api/auth/login", json={"senha": "errada"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_rota_protegida_sem_token(client):
    r = await client.get("/api/terrenos")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_fluxo_conta_com_rateio_e_snapshot(auth_client):
    client = auth_client
    terreno_id = await _criar_terreno(client)
    casa1 = await _criar_casa(client, terreno_id, "Casa 1")
    casa2 = await _criar_casa(client, terreno_id, "Casa 2")
    casa3 = await _criar_casa(client, terreno_id, "Casa 3")

    # 4 / 1 / 1 pessoas
    for nome in ("A", "B", "C", "D"):
        await _add_morador(client, casa1, nome)
    await _add_morador(client, casa2, "E")
    await _add_morador(client, casa3, "F")

    r = await client.post(
        "/api/contas",
        json={
            "terreno_id": terreno_id,
            "tipo": "AGUA",
            "competencia": "2026-03",
            "valor_total_centavos": 30000,
            "vencimento": "2026-03-10",
        },
    )
    assert r.status_code == 201, r.text
    conta = r.json()
    valores = {x["casa_id"]: x["valor_centavos"] for x in conta["rateios"]}
    assert valores[casa1] == 20000
    assert valores[casa2] == 5000
    assert valores[casa3] == 5000
    assert sum(valores.values()) == 30000

    snaps = {x["casa_id"]: x["pessoas_snapshot"] for x in conta["rateios"]}
    assert snaps[casa1] == 4

    # Mudança de moradores NÃO altera o snapshot da conta já lançada
    await _add_morador(client, casa2, "novo")
    r2 = await client.get(f"/api/contas/{conta['id']}")
    snaps2 = {x["casa_id"]: x["pessoas_snapshot"] for x in r2.json()["rateios"]}
    assert snaps2[casa2] == 1


@pytest.mark.asyncio
async def test_conta_total_pessoas_zero_422(auth_client):
    client = auth_client
    terreno_id = await _criar_terreno(client)
    await _criar_casa(client, terreno_id, "Casa vazia")
    r = await client.post(
        "/api/contas",
        json={
            "terreno_id": terreno_id,
            "tipo": "LUZ",
            "competencia": "2026-03",
            "valor_total_centavos": 10000,
            "vencimento": "2026-03-10",
        },
    )
    assert r.status_code == 422
    assert "pessoas" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_editar_conta_recalcula_mantendo_snapshot(auth_client):
    client = auth_client
    terreno_id = await _criar_terreno(client)
    casa1 = await _criar_casa(client, terreno_id, "Casa 1")
    casa2 = await _criar_casa(client, terreno_id, "Casa 2")
    await _add_morador(client, casa1, "A")
    await _add_morador(client, casa2, "B")

    r = await client.post(
        "/api/contas",
        json={
            "terreno_id": terreno_id,
            "tipo": "AGUA",
            "competencia": "2026-04",
            "valor_total_centavos": 10000,
            "vencimento": "2026-04-10",
        },
    )
    conta_id = r.json()["id"]

    r2 = await client.put(
        f"/api/contas/{conta_id}", json={"valor_total_centavos": 20000}
    )
    assert r2.status_code == 200
    valores = [x["valor_centavos"] for x in r2.json()["rateios"]]
    assert sum(valores) == 20000
    assert valores == [10000, 10000]


@pytest.mark.asyncio
async def test_pagamento_rateio(auth_client):
    client = auth_client
    terreno_id = await _criar_terreno(client)
    casa1 = await _criar_casa(client, terreno_id, "Casa 1")
    await _add_morador(client, casa1, "A")
    r = await client.post(
        "/api/contas",
        json={
            "terreno_id": terreno_id,
            "tipo": "AGUA",
            "competencia": "2026-05",
            "valor_total_centavos": 5000,
            "vencimento": "2026-05-10",
        },
    )
    rateio_id = r.json()["rateios"][0]["id"]
    rp = await client.patch(
        f"/api/rateios/{rateio_id}/pagamento",
        json={"pago": True, "pago_em": "2026-05-09"},
    )
    assert rp.status_code == 200
    assert rp.json()["pago"] is True
    assert rp.json()["pago_em"] == "2026-05-09"


@pytest.mark.asyncio
async def test_aluguel_manual_e_conflito(auth_client):
    client = auth_client
    terreno_id = await _criar_terreno(client)
    casa1 = await _criar_casa(client, terreno_id, "Casa 1", aluguel=80000)

    r = await client.post(
        "/api/alugueis",
        json={"casa_id": casa1, "competencia": "2026-03"},
    )
    assert r.status_code == 201, r.text
    assert r.json()["valor_centavos"] == 80000  # sugerido pelo valor da casa
    assert r.json()["vencimento"] == "2026-03-10"

    # mesma casa/competência -> 409
    r2 = await client.post(
        "/api/alugueis",
        json={"casa_id": casa1, "competencia": "2026-03"},
    )
    assert r2.status_code == 409


@pytest.mark.asyncio
async def test_aluguel_recorrente_e_propagacao_valor(auth_client):
    client = auth_client
    terreno_id = await _criar_terreno(client)
    casa_id = await _criar_casa(client, terreno_id, "Casa 1", aluguel=80000)

    r = await client.post(
        "/api/alugueis",
        json={
            "casa_id": casa_id,
            "competencia": "2026-06",
            "repetir_meses": 3,
        },
    )
    assert r.status_code == 201, r.text
    grupo = r.json()["recorrencia_id"]
    assert grupo is not None

    lista = await client.get(
        "/api/alugueis", params={"casa_id": casa_id}
    )
    assert len(lista.json()) == 3
    assert all(c["recorrencia_id"] == grupo for c in lista.json())
    assert {c["competencia"] for c in lista.json()} == {
        "2026-06",
        "2026-07",
        "2026-08",
    }

    jun_id = next(c["id"] for c in lista.json() if c["competencia"] == "2026-06")
    r_put = await client.put(
        f"/api/alugueis/{jun_id}",
        json={"valor_centavos": 90000},
    )
    assert r_put.status_code == 200

    atualizado = await client.get(
        "/api/alugueis", params={"casa_id": casa_id}
    )
    por_comp = {c["competencia"]: c["valor_centavos"] for c in atualizado.json()}
    assert por_comp["2026-06"] == 90000
    assert por_comp["2026-07"] == 90000
    assert por_comp["2026-08"] == 90000


@pytest.mark.asyncio
async def test_casa_aluguel_propaga_cobrancas_recorrentes(auth_client):
    from datetime import date

    client = auth_client
    terreno_id = await _criar_terreno(client)
    casa_id = await _criar_casa(client, terreno_id, "Casa 1", aluguel=80000)
    hoje = date.today()
    comp = f"{hoje.year:04d}-{hoje.month:02d}"

    await client.post(
        "/api/alugueis",
        json={
            "casa_id": casa_id,
            "competencia": comp,
            "repetir_meses": 2,
        },
    )

    r = await client.put(
        f"/api/casas/{casa_id}",
        json={"aluguel_centavos": 95000},
    )
    assert r.status_code == 200

    lista = await client.get(
        "/api/alugueis", params={"casa_id": casa_id}
    )
    assert all(c["valor_centavos"] == 95000 for c in lista.json())


@pytest.mark.asyncio
async def test_relatorio_mensal(auth_client):
    client = auth_client
    terreno_id = await _criar_terreno(client)
    casa1 = await _criar_casa(client, terreno_id, "Casa 1", aluguel=80000)
    await _add_morador(client, casa1, "A")

    await client.post(
        "/api/alugueis", json={"casa_id": casa1, "competencia": "2026-06"}
    )
    await client.post(
        "/api/contas",
        json={
            "terreno_id": terreno_id,
            "tipo": "AGUA",
            "competencia": "2026-06",
            "valor_total_centavos": 6000,
            "vencimento": "2026-06-10",
        },
    )

    r = await client.get("/api/relatorio", params={"competencia": "2026-06"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["competencia_formatada"] == "06/2026"
    linha = data["casas"][0]
    assert linha["aluguel_centavos"] == 80000
    assert linha["agua_centavos"] == 6000
    assert linha["total_devido_centavos"] == 86000
    assert linha["em_aberto_centavos"] == 86000
    assert data["totais"]["total_a_receber_centavos"] == 86000


@pytest.mark.asyncio
async def test_relatorio_total_administradora(auth_client):
    client = auth_client
    terreno_id = await _criar_terreno(client)
    casa1 = await _criar_casa(client, terreno_id, "Casa 1", aluguel=80000)
    await _add_morador(client, casa1, "A")

    # A administradora entra na contagem de cabeças (1 pessoa), mas não é cobrada.
    rc = await client.put("/api/config", json={"moradores_administradora": 1})
    assert rc.status_code == 200, rc.text

    # AGUA 10000 / 2 cabeças (casa1=1, admin=1) -> casa paga 5000, admin 5000.
    await client.post(
        "/api/contas",
        json={
            "terreno_id": terreno_id,
            "tipo": "AGUA",
            "competencia": "2026-06",
            "valor_total_centavos": 10000,
            "vencimento": "2026-06-10",
        },
    )
    # LUZ 9000 / 2 cabeças -> casa paga 4500, admin 4500.
    await client.post(
        "/api/contas",
        json={
            "terreno_id": terreno_id,
            "tipo": "LUZ",
            "competencia": "2026-06",
            "valor_total_centavos": 9000,
            "vencimento": "2026-06-10",
        },
    )

    r = await client.get("/api/relatorio", params={"competencia": "2026-06"})
    assert r.status_code == 200, r.text
    admin = r.json()["administradora"]
    assert admin["agua_centavos"] == 5000
    assert admin["luz_centavos"] == 4500
    assert admin["total_centavos"] == 9500

    # Uma linha por conta com fatia administradora (água e luz).
    itens = admin["itens"]
    assert len(itens) == 2
    por_tipo = {i["tipo"]: i for i in itens}
    assert por_tipo["AGUA"]["valor_centavos"] == 5000
    assert por_tipo["AGUA"]["vencimento"] == "2026-06-10"
    assert por_tipo["AGUA"]["terreno_nome"] == "Terreno A"
    assert por_tipo["LUZ"]["valor_centavos"] == 4500
    assert por_tipo["AGUA"]["conta_id"]


@pytest.mark.asyncio
async def test_dashboard_pendencias(auth_client):
    client = auth_client
    terreno_id = await _criar_terreno(client)
    casa1 = await _criar_casa(client, terreno_id, "Casa 1", aluguel=50000)
    await _add_morador(client, casa1, "A")
    await client.post(
        "/api/alugueis",
        json={"casa_id": casa1, "competencia": "2020-01", "vencimento": "2020-01-10"},
    )
    r = await client.get("/api/dashboard", params={"competencia": "2020-01"})
    assert r.status_code == 200
    data = r.json()
    assert data["total_em_aberto_centavos"] == 50000
    assert data["qtd_itens_abertos"] == 1
    assert data["qtd_itens_atrasados"] == 1


@pytest.mark.asyncio
async def test_excluir_terreno_com_casas_exige_confirmacao(auth_client):
    client = auth_client
    terreno_id = await _criar_terreno(client)
    await _criar_casa(client, terreno_id, "Casa 1")
    r = await client.delete(f"/api/terrenos/{terreno_id}")
    assert r.status_code == 409
    r2 = await client.delete(f"/api/terrenos/{terreno_id}?confirmar=true")
    assert r2.status_code == 204


@pytest.mark.asyncio
async def test_excluir_casa_com_dependencias_exige_confirmacao(auth_client):
    client = auth_client
    terreno_id = await _criar_terreno(client)
    casa_id = await _criar_casa(client, terreno_id, "Casa 1")
    await _add_morador(client, casa_id, "A")
    await client.post(
        "/api/alugueis", json={"casa_id": casa_id, "competencia": "2026-07"}
    )

    # Sem confirmar -> 409 explicando a cascata
    r = await client.delete(f"/api/casas/{casa_id}")
    assert r.status_code == 409
    assert "confirmar=true" in r.json()["detail"]

    # Com confirmar -> remove a casa e tudo que depende dela
    r2 = await client.delete(f"/api/casas/{casa_id}?confirmar=true")
    assert r2.status_code == 204

    r3 = await client.get(f"/api/casas/{casa_id}")
    assert r3.status_code == 404
    # Moradores da casa também somem (cascata no banco).
    r4 = await client.get("/api/alugueis", params={"casa_id": casa_id})
    assert r4.json() == []


@pytest.mark.asyncio
async def test_excluir_casa_sem_dependencias(auth_client):
    client = auth_client
    terreno_id = await _criar_terreno(client)
    casa_id = await _criar_casa(client, terreno_id, "Casa só")
    r = await client.delete(f"/api/casas/{casa_id}")
    assert r.status_code == 204


@pytest.mark.asyncio
async def test_excluir_aluguel(auth_client):
    client = auth_client
    terreno_id = await _criar_terreno(client)
    casa_id = await _criar_casa(client, terreno_id, "Casa 1")
    r = await client.post(
        "/api/alugueis", json={"casa_id": casa_id, "competencia": "2026-08"}
    )
    aluguel_id = r.json()["id"]
    rd = await client.delete(f"/api/alugueis/{aluguel_id}")
    assert rd.status_code == 204
    rl = await client.get("/api/alugueis", params={"casa_id": casa_id})
    assert rl.json() == []


@pytest.mark.asyncio
async def test_excluir_conta_remove_rateios(auth_client):
    client = auth_client
    terreno_id = await _criar_terreno(client)
    casa_id = await _criar_casa(client, terreno_id, "Casa 1")
    await _add_morador(client, casa_id, "A")
    r = await client.post(
        "/api/contas",
        json={
            "terreno_id": terreno_id,
            "tipo": "AGUA",
            "competencia": "2026-09",
            "valor_total_centavos": 5000,
            "vencimento": "2026-09-10",
        },
    )
    conta_id = r.json()["id"]
    rd = await client.delete(f"/api/contas/{conta_id}")
    assert rd.status_code == 204
    rg = await client.get(f"/api/contas/{conta_id}")
    assert rg.status_code == 404
    # O rateio não deve mais aparecer entre as cobranças da casa.
    rc = await client.get(
        f"/api/casas/{casa_id}/cobrancas", params={"competencia": "2026-09"}
    )
    assert rc.json() == []


@pytest.mark.asyncio
async def test_excluir_despesa(auth_client):
    client = auth_client
    terreno_id = await _criar_terreno(client)
    r = await client.post(
        "/api/despesas",
        json={
            "terreno_id": terreno_id,
            "descricao": "Reparo telhado",
            "categoria": "REPARO",
            "valor_centavos": 12000,
            "data": "2026-09-05",
        },
    )
    assert r.status_code == 201, r.text
    despesa_id = r.json()["id"]
    rd = await client.delete(f"/api/despesas/{despesa_id}")
    assert rd.status_code == 204


@pytest.mark.asyncio
async def test_listar_despesas_por_competencia_com_nomes(auth_client):
    client = auth_client
    terreno_id = await _criar_terreno(client, "Ouro Verde")
    casa_id = await _criar_casa(client, terreno_id, "Casa 1")

    # Despesa de set/2026 vinculada à casa
    await client.post(
        "/api/despesas",
        json={
            "casa_id": casa_id,
            "descricao": "Troca de torneira",
            "categoria": "REPARO",
            "valor_centavos": 8000,
            "data": "2026-09-12",
        },
    )
    # Despesa de set/2026 vinculada ao terreno
    await client.post(
        "/api/despesas",
        json={
            "terreno_id": terreno_id,
            "descricao": "Poda de árvores",
            "categoria": "MANUTENCAO",
            "valor_centavos": 5000,
            "data": "2026-09-20",
        },
    )
    # Despesa de outro mês (não deve aparecer no filtro)
    await client.post(
        "/api/despesas",
        json={
            "terreno_id": terreno_id,
            "descricao": "Outro mês",
            "categoria": "OUTROS",
            "valor_centavos": 1000,
            "data": "2026-10-01",
        },
    )

    r = await client.get("/api/despesas", params={"competencia": "2026-09"})
    assert r.status_code == 200, r.text
    dados = r.json()
    assert len(dados) == 2
    por_desc = {d["descricao"]: d for d in dados}
    assert por_desc["Troca de torneira"]["casa_nome"] == "Casa 1"
    assert por_desc["Poda de árvores"]["terreno_nome"] == "Ouro Verde"
    assert por_desc["Poda de árvores"]["casa_nome"] is None


@pytest.mark.asyncio
async def test_listar_despesas_competencia_invalida_422(auth_client):
    client = auth_client
    r = await client.get("/api/despesas", params={"competencia": "2026-13"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_competencia_invalida_422(auth_client):
    client = auth_client
    terreno_id = await _criar_terreno(client)
    casa1 = await _criar_casa(client, terreno_id, "Casa 1")
    await _add_morador(client, casa1, "A")
    r = await client.post(
        "/api/contas",
        json={
            "terreno_id": terreno_id,
            "tipo": "AGUA",
            "competencia": "2026-13",
            "valor_total_centavos": 1000,
            "vencimento": "2026-12-10",
        },
    )
    assert r.status_code == 422


_PNG_1PX = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


@pytest.mark.asyncio
async def test_documentos_crud(auth_client):
    client = auth_client
    terreno_id = await _criar_terreno(client, "Doc Terreno")
    casa_id = await _criar_casa(client, terreno_id, "Casa Docs")

    r = await client.get(f"/api/casas/{casa_id}/documentos")
    assert r.status_code == 200, r.text
    vazio = r.json()
    assert vazio["pdfs"] == []
    assert vazio["fotos"] == []
    assert vazio["anotacoes"] == []
    assert vazio["casa_nome"] == "Casa Docs"

    r = await client.post(
        f"/api/casas/{casa_id}/documentos/anotacoes",
        json={"titulo": "Chave reserva", "texto": "Com o vizinho."},
    )
    assert r.status_code == 201, r.text
    nota = r.json()
    nota_id = nota["id"]
    assert nota["titulo"] == "Chave reserva"

    r = await client.put(
        f"/api/documentos/anotacoes/{nota_id}",
        json={"titulo": "Chave atualizada", "texto": "Devolver ao sair."},
    )
    assert r.status_code == 200, r.text
    assert r.json()["titulo"] == "Chave atualizada"

    r = await client.post(
        f"/api/casas/{casa_id}/documentos/pdfs",
        json={
            "nome": "contrato.pdf",
            "tamanho_bytes": 1200,
            "url": "https://example.com/contrato.pdf",
        },
    )
    assert r.status_code == 201, r.text
    pdf_id = r.json()["id"]

    r = await client.post(
        f"/api/casas/{casa_id}/documentos/fotos",
        json={"legenda": "Fachada", "url": _PNG_1PX},
    )
    assert r.status_code == 201, r.text
    foto_id = r.json()["id"]
    assert r.json()["legenda"] == "Fachada"

    r = await client.get(f"/api/casas/{casa_id}/documentos")
    assert r.status_code == 200, r.text
    bundle = r.json()
    assert len(bundle["pdfs"]) == 1
    assert len(bundle["fotos"]) == 1
    assert len(bundle["anotacoes"]) == 1

    r = await client.delete(f"/api/documentos/pdfs/{pdf_id}")
    assert r.status_code == 204, r.text
    r = await client.delete(f"/api/documentos/fotos/{foto_id}")
    assert r.status_code == 204, r.text
    r = await client.delete(f"/api/documentos/anotacoes/{nota_id}")
    assert r.status_code == 204, r.text

    r = await client.get(f"/api/casas/{casa_id}/documentos")
    assert r.status_code == 200, r.text
    assert r.json()["pdfs"] == []
    assert r.json()["fotos"] == []
    assert r.json()["anotacoes"] == []
