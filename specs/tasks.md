# Plano de Implementação — Controle de Casas Alugadas (Backend Python)

Tarefas em ordem de execução, com foco **backend-first** (FastAPI + Supabase). Cada
item referencia os requisitos atendidos (`requirements.md`). Marque `[x]` ao concluir.

> Convenção: começar pela camada de domínio (cálculos puros e testáveis), depois
> banco/modelos, depois API. Valores monetários sempre em centavos (int). O frontend
> será planejado em fase própria, após a API estar pronta.

## Fase 0 — Base do projeto (backend)
- [ ] 0.1 Criar `backend/` com `pyproject.toml` (FastAPI, uvicorn, SQLAlchemy 2.0, asyncpg, alembic, pydantic, pydantic-settings, pytest, httpx).
- [ ] 0.2 Estrutura de pastas: `app/{core,domain,models,schemas,routers}`, `alembic/`, `tests/`.
- [ ] 0.3 `app/core/config.py`: settings via Pydantic lendo `DATABASE_URL`, `APP_SENHA`, `APP_SESSION_SECRET`. _(Req 1.5, RNF 3)_
- [ ] 0.4 `.env.example` com as variáveis; `README.md` inicial (como rodar).
- [ ] 0.5 `app/main.py`: app FastAPI com CORS, rota de health `/api/health` e Swagger em `/docs`. _(RNF 9)_

## Fase 1 — Domínio (lógica pura e testável)
- [ ] 1.1 `app/domain/money.py`: helpers centavos↔reais e formatação `pt-BR`. _(RNF 2, 5)_
- [ ] 1.2 `app/domain/competencia.py`: validar/formatar `YYYY-MM`, navegar meses. _(Req 9.3, RNF 2)_
- [ ] 1.3 `app/domain/rateio.py`: função pura `calcular_rateio(...)` com método dos maiores restos. _(Req 6.2, 6.4)_
- [ ] 1.4 Testes pytest do rateio (soma exata, total ímpar, 1 casa, pessoas variadas) e de money/competência. _(Req 6.4, RNF 5)_
- [ ] 1.5 Garantir erro quando `total_pessoas == 0`. _(Req 6.5)_

## Fase 2 — Banco de dados (modelos + Supabase)
- [ ] 2.1 `app/core/db.py`: engine async (asyncpg) + session factory; ler `DATABASE_URL` do Supabase.
- [ ] 2.2 Modelos SQLAlchemy: Terreno, Casa, Morador, ContaCompartilhada, RateioConta, CobrancaAluguel, Despesa + enums. _(Req 2–8)_
- [ ] 2.3 Restrições de unicidade: rateio_conta(conta_id,casa_id), cobranca_aluguel(casa_id,competencia). _(Req 5.1, 6)_
- [ ] 2.4 Configurar Alembic e criar a primeira migração; aplicar no Supabase (`alembic upgrade head`).
- [ ] 2.5 Script/seed opcional: 1 terreno, 3 casas e moradores de exemplo.

## Fase 3 — Autenticação (senha compartilhada)
- [ ] 3.1 `app/core/security.py`: comparação segura de senha + criação/validação de token (JWT HS256). _(Req 1.2, 1.5)_
- [ ] 3.2 `app/routers/auth.py`: `POST /auth/login` (senha ok/erro), `POST /auth/logout`. _(Req 1.2, 1.3, 1.4)_
- [ ] 3.3 `app/deps.py`: dependency `usuario_autenticado` que valida o Bearer token e protege rotas. _(Req 1.1)_

## Fase 4 — Terrenos e casas (CRUD)
- [ ] 4.1 Schemas Pydantic + router de Terreno: listar, criar, editar, excluir (checar vínculos). _(Req 2)_
- [ ] 4.2 Schemas + router de Casa: nome, terreno, aluguel (centavos), dia de vencimento, ativo. _(Req 3)_
- [ ] 4.3 `GET /casas/{id}` com dados agregados (nº de moradores ativos). _(Req 3, 4.3)_

## Fase 5 — Moradores (CRUD + histórico)
- [ ] 5.1 Modelo/escopo com `data_entrada` e `data_saida` (histórico, sem apagar quem saiu). _(Req 4.1, 4.2, 4.3)_
- [ ] 5.2 `GET/POST /casas/{id}/moradores`, `PUT/DELETE /moradores/{id}`; registrar saída via `data_saida`. _(Req 4.1, 4.2, 4.6)_
- [ ] 5.3 Contagem de cabeças atuais (moradores sem data de saída) exposta nos recursos de casa. _(Req 4.4)_

## Fase 6 — Contas de água/luz com rateio
- [ ] 6.1 `POST /contas`: recebe terreno, tipo, competência, valor total, vencimento, casas participantes (default: ativas). _(Req 6.1, 6.6)_
- [ ] 6.2 Calcular rateio com `domain/rateio.py`, gravar `pessoas_snapshot` e fatias. _(Req 6.2, 6.3, 6.4)_
- [ ] 6.3 Bloquear (422) se total de pessoas = 0. _(Req 6.5)_
- [ ] 6.4 `GET /contas` e `GET /contas/{id}` (com rateios e status). _(Req 6, 7.1)_
- [ ] 6.5 `PUT /contas/{id}`: recalcular rateio mantendo snapshot; `DELETE` em cascata. _(Req 6.7)_

## Fase 7 — Aluguéis (registro manual, sem automação)
- [ ] 7.1 `POST /alugueis`: registrar manualmente uma cobrança (casa, competência, valor, vencimento); valor da casa apenas como sugestão. **Sem geração automática.** _(Req 5.1, 5.2)_
- [ ] 7.2 `GET /alugueis` (filtro por competência), `PUT /alugueis/{id}` (desconto pontual) e `DELETE /alugueis/{id}`. _(Req 5.4, 5.5)_
- [ ] 7.3 Sinalizar atraso (campo derivado: vencido e em aberto). _(Req 5.6)_

## Fase 8 — Pagamentos
- [ ] 8.1 `PATCH /rateios/{id}/pagamento` e `PATCH /alugueis/{id}/pagamento` (marcar/desmarcar + data). _(Req 7.1, 7.2, 7.5)_
- [ ] 8.2 Totais por casa/competência (devido, pago, em aberto) nos recursos de relatório. _(Req 7.3)_

## Fase 9 — Despesas
- [ ] 9.1 CRUD `/despesas` (descrição, categoria, valor, data, vínculo casa/terreno). _(Req 8)_

## Fase 10 — Relatório e dashboard
- [ ] 10.1 `GET /relatorio?competencia=YYYY-MM`: por casa (aluguel, água, luz, devido, pago, em aberto) + totais. _(Req 9.1, 9.2)_
- [ ] 10.2 `GET /dashboard`: total em aberto do mês, qtd. de atrasados, atalhos. _(Req 10.1, 10.2)_

## Fase 11 — Qualidade e publicação do backend
- [ ] 11.1 Testes de integração dos endpoints-chave (login, conta+rateio, pagamento, relatório). _(RNF 5)_
- [ ] 11.2 Tratamento de erros padronizado (404/409/422) com mensagens pt-BR. _(RNF 6)_
- [ ] 11.3 Provisionar Supabase (DATABASE_URL) e hospedar a API no **Render** com variáveis de ambiente. _(RNF 3)_
- [ ] 11.4 Rodar migrações em produção e validar via `/docs`. _(RNF 9)_

## Fase 12 — Frontend (planejamento posterior)
- [ ] 12.1 Definir a tecnologia do frontend (mobile-first) e criar spec/seção própria.
- [ ] 12.2 Implementar telas consumindo a API: login, casas/moradores, lançar conta, pagamentos, relatório.
- [ ] 12.3 Publicar o frontend e testar o fluxo completo no celular. _(RNF 1)_

## Critérios de pronto (Definition of Done — backend)
- Requisitos com critérios de aceitação atendidos e verificados via testes/Swagger.
- `domain/rateio.py` com testes passando e soma de rateios sempre exata. _(Req 6.4)_
- API REST documentada (OpenAPI) e protegida por senha. _(Req 1, RNF 9)_
- Banco no Supabase com migrações aplicadas; API publicada e acessível.
- Frontend planejado em spec própria (Fase 12) para a etapa seguinte.
