# Controle de Casas Alugadas — Backend (API)

API REST em **FastAPI** para administrar o aluguel de casas que ficam no mesmo
terreno e compartilham um relógio de água e um de luz. O coração do sistema é a
**divisão das contas por cabeça** (rateio), com snapshot do número de moradores no
momento do lançamento.

- **Stack:** Python 3.12+, FastAPI, Uvicorn, SQLAlchemy 2.0 (async) + asyncpg,
  Alembic, Pydantic v2, PyJWT.
- **Banco:** PostgreSQL (Supabase).
- **Dinheiro:** sempre em **centavos (int)** — nunca float.

## Estrutura

```
backend/
  app/
    main.py            # app FastAPI, CORS, /api/health, /docs
    deps.py            # dependências (sessão de DB, autenticação Bearer)
    core/              # config, db (engine async), security (JWT)
    domain/            # lógica pura: rateio, money, competencia
    models/            # modelos SQLAlchemy
    schemas/           # schemas Pydantic (entrada/saída)
    routers/           # auth, terrenos, casas, moradores, contas, rateios,
                       #   alugueis, despesas, relatorio, dashboard
    services/          # consultas auxiliares (cabeças atuais)
  alembic/             # migrações (env.py + versions/0001_initial.py)
  scripts/seed.py      # seed opcional (1 terreno, 3 casas, moradores)
  tests/               # pytest (domínio + API)
  pyproject.toml
  requirements.txt
  .env.example
```

## Passo a passo (local)

> Ambiente Windows/PowerShell. Em macOS/Linux, troque a ativação do venv por
> `source .venv/bin/activate`.

### 1. Criar e ativar o ambiente virtual

```powershell
cd C:\projetos\controle-casas\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2. Instalar as dependências

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
# (ou, usando o pyproject: pip install -e ".[dev]")
```

### 3. Configurar variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```powershell
copy .env.example .env
```

- `DATABASE_URL` — string do Postgres do Supabase, **com o driver asyncpg**:
  `postgresql+asyncpg://USUARIO:SENHA@HOST:PORTA/postgres`
- `APP_SENHA` — a senha única compartilhada de acesso.
- `APP_SESSION_SECRET` — segredo aleatório e longo para assinar o JWT.

### 4. Rodar a migração (cria as tabelas)

Com a `DATABASE_URL` apontando para o banco (Supabase ou um Postgres local):

```powershell
alembic upgrade head
```

> A primeira migração já está pronta em `alembic/versions/0001_initial.py`.
> Se preferir **regenerá-la** a partir dos modelos (precisa de um banco acessível):
> ```powershell
> alembic revision --autogenerate -m "schema inicial"
> alembic upgrade head
> ```

### 5. (Opcional) Popular dados de exemplo

```powershell
python -m scripts.seed
```

### 6. Subir a API

```powershell
uvicorn app.main:app --reload
```

- Documentação interativa (Swagger): http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/api/health

### 7. Autenticação

1. `POST /api/auth/login` com `{ "senha": "<APP_SENHA>" }` → retorna `access_token`.
2. Envie o token nas demais rotas no header `Authorization: Bearer <token>`.
   No Swagger, use o botão **Authorize**.

## Testes

Os testes de domínio (com ênfase no `rateio.py`) não dependem de banco. Os testes
de API usam SQLite em memória (via `aiosqlite`), então também rodam sem Postgres.

```powershell
pip install -e ".[dev]"   # garante pytest, httpx, aiosqlite
pytest
```

## Aplicar no Supabase

1. Crie um projeto no **Supabase** e copie a connection string do Postgres
   (Project Settings → Database). Use a porta do **pooler** (6543) em ambientes
   serverless, ou a conexão direta (5432) para um serviço long-running.
2. Monte a `DATABASE_URL` com o driver async e SSL, por exemplo:
   `postgresql+asyncpg://postgres.<ref>:<senha>@aws-0-<regiao>.pooler.supabase.com:6543/postgres`
3. Exporte as variáveis (`DATABASE_URL`, `APP_SENHA`, `APP_SESSION_SECRET`) no
   ambiente de deploy (ex.: **Render**) e rode a migração:
   ```bash
   alembic upgrade head
   ```
4. Suba a API com Uvicorn e valide em `/docs`.

## Endpoints (prefixo `/api`)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/login` | Recebe senha, devolve token JWT |
| POST | `/auth/logout` | Encerra sessão (cliente descarta token) |
| GET/POST | `/terrenos` | Listar / criar terreno |
| GET/PUT/DELETE | `/terrenos/{id}` | Detalhe / editar / excluir (checa vínculos) |
| GET/POST | `/casas` | Listar / criar casa |
| GET/PUT/DELETE | `/casas/{id}` | Detalhe (com nº de moradores atuais) / editar / excluir |
| GET/POST | `/casas/{id}/moradores` | Listar / adicionar morador |
| PUT/DELETE | `/moradores/{id}` | Editar / remover morador |
| GET/POST | `/contas` | Listar / lançar conta (calcula rateio) |
| GET | `/contas/{id}` | Detalhe da conta com rateios |
| PUT/DELETE | `/contas/{id}` | Editar (recalcula) / excluir |
| PATCH | `/rateios/{id}/pagamento` | Marcar/desmarcar pago |
| GET/POST | `/alugueis` | Listar / registrar cobrança manual |
| PUT/DELETE | `/alugueis/{id}` | Editar (desconto pontual) / excluir |
| PATCH | `/alugueis/{id}/pagamento` | Marcar/desmarcar pago |
| GET/POST | `/despesas` | Listar / criar despesa |
| PUT/DELETE | `/despesas/{id}` | Editar / excluir despesa |
| GET | `/relatorio?competencia=YYYY-MM` | Resumo mensal por casa + totais |
| GET | `/dashboard?competencia=YYYY-MM` | Visão geral (em aberto, atrasados) |
