# 🏠 Casa em Dia

> Gestão de aluguéis dos imóveis da família, sem papel e sem caderninho.

**Casa em Dia** (internamente `controle-casas`) é um app **mobile-first** que digitaliza o controle manual de aluguéis feito pelos pais: casas no mesmo terreno que dividem um relógio de água e um de luz, com cobranças, despesas e relatórios mensais centralizados em um só lugar.

O coração do sistema é a **divisão das contas "por cabeça"** (rateio proporcional ao número de moradores de cada casa), incluindo a parte que a **família administradora** paga.

![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0_async-D71F00)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white)

---

## 🔗 Demo / Produção

| Ambiente | URL |
|---|---|
| **App (frontend)** | https://controle-casas.vercel.app |
| **API (backend)** | https://controle-casas-api.onrender.com |
| **Documentação da API (Swagger)** | https://controle-casas-api.onrender.com/docs |

> Acesso protegido por uma **senha única compartilhada** entre a família.

---

## 📱 Telas

<table>
  <tr>
    <td align="center"><strong>Início</strong></td>
    <td align="center"><strong>Casas</strong></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/inicio.png" alt="Tela inicial com atalhos, total recebido/a receber, anel de progresso e pendências" width="400" /></td>
    <td><img src="docs/screenshots/casas.png" alt="Lista de terrenos e casas agrupados, com aluguel e vencimento" width="400" /></td>
  </tr>
</table>

---

## ✨ Principais funcionalidades

- **Cadastros** de terrenos, casas e moradores (com idade/adulto e contagem de pessoas por casa).
- **Cobranças de aluguel** por casa e por competência (mês), com possibilidade de desconto pontual.
- **Contas compartilhadas de água e luz** com **divisão "por cabeça"** entre as casas, incluindo a **casa administradora**, que tem um número de moradores **fixo e configurável**.
- **Despesas** com categorias (manutenção, reparo, imposto, outros).
- **Relatório mensal**: totais do mês, quebra por tipo (aluguel / água / luz / despesas), visão **por casa** e visão da **casa administradora** (parte de água/luz que a administradora arca).
- **Marcação de pagamentos** como recebidos (aluguéis e rateios).
- **Pendências e avisos de vencimento**: destaque para o que está atrasado e o que **vence em até 3 dias**.
- **Autenticação** por senha compartilhada com sessão via **JWT (HS256)**.
- **PWA instalável** no celular (mobile-first).

---

## 🧰 Stack tecnológico

**Backend**
- Python **3.12+**
- **FastAPI** + **Uvicorn**
- **SQLAlchemy 2.0** (async) + **asyncpg**
- **Alembic** (migrations)
- **Pydantic v2** + **pydantic-settings**
- **PyJWT** (HS256)

**Frontend**
- **React 18** + **Vite 5** + **TypeScript**
- **React Router DOM**
- **CSS puro** (mobile-first) — fonte padrão **Poppins**, destaques em **Inter Bold**, ícones **SVG**, cor primária **`#FF5722`**
- PWA (ícones gerados com **sharp**)

**Banco & Deploy**
- **PostgreSQL** no **Supabase** (RLS habilitado nas tabelas públicas; cascade deletes via `ondelete=CASCADE` + `passive_deletes`)
- **Render** (API — auto-deploy no push da `main`)
- **Vercel** (frontend — deploy manual via CLI)

---

## 🗂️ Estrutura do monorepo

```
controle-casas/
├─ backend/                 # API FastAPI
│  ├─ app/
│  │  ├─ main.py            # app FastAPI, CORS, /api/health
│  │  ├─ deps.py            # dependências (sessão de DB, auth Bearer)
│  │  ├─ core/              # config, db (engine async), security (JWT)
│  │  ├─ domain/            # lógica pura: rateio, money, competencia
│  │  ├─ models/            # modelos SQLAlchemy
│  │  ├─ schemas/           # schemas Pydantic
│  │  ├─ routers/           # auth, terrenos, casas, moradores, contas,
│  │  │                     #   rateios, alugueis, despesas, relatorio,
│  │  │                     #   dashboard, config
│  │  └─ services/          # consultas auxiliares (ex.: nº de moradores)
│  ├─ alembic/              # migrations (env.py + versions/)
│  ├─ scripts/seed.py       # seed opcional de exemplo
│  ├─ tests/                # pytest (domínio + API)
│  ├─ requirements.txt
│  ├─ pyproject.toml
│  └─ .env.example
├─ frontend/                # App React + Vite
│  ├─ src/
│  │  ├─ auth/              # AuthContext (sessão/JWT)
│  │  ├─ components/        # UI (AppShell, BottomNav, Modal, forms, ...)
│  │  ├─ pages/             # Login, Dashboard, Casas, Casa, Novo, Relatorio, Ajustes
│  │  ├─ lib/               # api, format, useApi, pwa
│  │  ├─ styles/            # global.css
│  │  ├─ App.tsx
│  │  └─ main.tsx
│  ├─ package.json
│  ├─ vercel.json
│  └─ .env.example
├─ render.yaml              # Blueprint do Render (serviço da API)
└─ specs/                   # requisitos do projeto
```

---

## 💡 Conceitos de domínio

### Divisão "por cabeça" (rateio)

As contas de **água** e **luz** chegam por um único relógio do terreno e precisam ser divididas entre as casas. A divisão é **proporcional ao número de moradores** de cada casa:

- O valor de cada casa é `floor(total × pessoas ÷ total_de_pessoas)`, em **centavos**.
- A sobra de centavos do arredondamento é distribuída pelo **método dos maiores restos** (largest remainder), de forma **determinística**, garantindo que a soma das fatias seja **exatamente** o valor total.
- A **casa administradora** participa do rateio com um número de moradores **fixo e configurável** (preferência global `moradores_administradora`), refletindo a parte que a própria família que administra paga.
- O número de pessoas é registrado como **snapshot** no momento do lançamento, para não distorcer contas antigas quando a composição das casas mudar.

> Valores monetários são sempre tratados em **centavos (int)** — nunca em `float`.

### Cobranças e competência

Cada cobrança de aluguel e cada conta compartilhada pertence a uma **competência** no formato `YYYY-MM` (mês de referência). Aluguéis e rateios podem ser marcados como **pagos/recebidos**.

### Relatório mensal

Para uma competência, o relatório consolida:

- **Totais** do mês.
- **Quebra** por tipo: aluguel, água, luz e despesas.
- Visão **por casa**.
- Visão da **casa administradora** (parcela de água/luz que a administradora arca).

---

## 🚀 Como rodar localmente

### Pré-requisitos

- **Python 3.12+**
- **Node.js** (18+) e **npm**
- Um **PostgreSQL** acessível (Supabase ou local). Para os **testes**, o banco não é necessário (usa SQLite em memória).

### Backend

Os comandos abaixo usam **Windows / PowerShell**. Em macOS/Linux, troque a ativação do venv por `source .venv/bin/activate`.

```powershell
cd backend

# 1) ambiente virtual
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2) dependências
python -m pip install --upgrade pip
pip install -r requirements.txt

# 3) variáveis de ambiente
copy .env.example .env
# edite o .env e preencha DATABASE_URL, APP_SENHA e APP_SESSION_SECRET

# 4) migrations (cria as tabelas)
alembic upgrade head

# 5) (opcional) dados de exemplo
python -m scripts.seed

# 6) subir a API
uvicorn app.main:app --reload
```

- Swagger: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/api/health

**Autenticação:** faça `POST /api/auth/login` com `{ "senha": "<APP_SENHA>" }`, receba o `access_token` e envie-o nas demais rotas no header `Authorization: Bearer <token>` (ou use o botão **Authorize** no Swagger).

### Frontend

```bash
cd frontend

# 1) dependências
npm install

# 2) variáveis de ambiente
cp .env.example .env
# defina VITE_API_URL (ex.: http://127.0.0.1:8000 para apontar para a API local)

# 3) modo desenvolvimento
npm run dev
```

Outros scripts disponíveis:

```bash
npm run build     # type-check (tsc -b) + build de produção (vite build)
npm run preview   # serve localmente o build de produção
npm run icons     # regenera os ícones do PWA (usa sharp)
```

---

## ⚙️ Variáveis de ambiente

### Backend (`backend/.env`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | String de conexão do PostgreSQL **com o driver asyncpg** (ex.: `postgresql+asyncpg://USUARIO:SENHA@HOST:PORTA/postgres`). Suporta a conexão direta (5432) ou o pooler do Supabase (6543). |
| `APP_SENHA` | Sim | Senha única compartilhada de acesso ao sistema. |
| `APP_SESSION_SECRET` | Sim | Segredo longo e aleatório usado para assinar o JWT (HS256). |
| `APP_SESSION_EXPIRE_MINUTES` | Não | Validade do token de sessão, em minutos (padrão: `43200`, ou seja, 30 dias). |
| `APP_CORS_ORIGINS` | Não | Origens permitidas para CORS, separadas por vírgula (padrão: `*`). |

> No deploy (Render), o `PYTHON_VERSION` também é definido (`3.12.4`).

### Frontend (`frontend/.env`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_API_URL` | Não | URL base da API. Se ausente, o app usa `https://controle-casas-api.onrender.com` como padrão. |

---

## 🗃️ Migrations (Alembic)

A partir de `backend/`, com a `DATABASE_URL` configurada:

```bash
# aplicar todas as migrations pendentes
alembic upgrade head

# criar uma nova migration a partir dos modelos (precisa de um banco acessível)
alembic revision --autogenerate -m "descricao da mudanca"

# voltar uma migration
alembic downgrade -1
```

As migrations versionadas incluem o schema inicial, a configuração da administradora, campos de morador (adulto/idade), o **RLS** das tabelas públicas (`0005_enable_rls`) e os **cascade deletes** (`0006_cascade_deletes`).

---

## 🧪 Testes

Os testes ficam em `backend/tests/` e usam **pytest**. Os testes de domínio (ênfase no rateio) não dependem de banco, e os testes de API usam **SQLite em memória** (`aiosqlite`) — ou seja, rodam sem Postgres.

```bash
cd backend
pip install -e ".[dev]"   # garante pytest, pytest-asyncio, httpx e aiosqlite
pytest
```

---

## 📦 Deploy

### API — Render

O deploy é descrito em [`render.yaml`](render.yaml) (serviço web `controle-casas-api`):

- **Build:** `pip install -r requirements.txt`
- **Start:** `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Health check:** `/api/health`
- **Auto-deploy:** a cada `git push` na branch `main`.
- Os segredos (`DATABASE_URL`, `APP_SENHA`, `APP_SESSION_SECRET`) são definidos no painel do Render (Environment) — **não** ficam versionados.

### Frontend — Vercel (manual)

A Vercel **não** está conectada ao Git neste projeto. O deploy do frontend é **manual**, a partir da pasta `frontend/`:

```bash
cd frontend
npx vercel deploy --prod --yes
```

O roteamento SPA é tratado pelo [`frontend/vercel.json`](frontend/vercel.json) (rewrite de todas as rotas para `index.html`). Defina `VITE_API_URL` nas variáveis de ambiente do projeto na Vercel.

---

## 📄 Licença / nota final

Projeto de **uso pessoal e familiar**, criado para digitalizar o controle de aluguéis dos imóveis da família. Não possui licença pública definida.
