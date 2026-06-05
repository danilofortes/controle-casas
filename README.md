# 🏠 Casa em Dia

> Aluguéis da família no celular, sem caderno.

**Casa em Dia** (`controle-casas`) substitui o caderno que meus pais usavam para controlar os aluguéis. Várias casas no mesmo terreno, um relógio de água, um de luz, cobranças, despesas e o relatório do mês ficam num app só.

O rateio "por cabeça" divide água e luz pelo número de moradores de cada casa, incluindo a parte da casa administradora.

![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0_async-D71F00)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white)

---

## 👨‍👩‍👧 Sobre o projeto (pessoal)

Projeto pessoal. Meus pais administram aluguéis de casas no mesmo terreno e, por anos, anotavam tudo no caderno. Água e luz chegam num relógio só, o rateio era feito na mão, e era comum perder o fio do que já tinha sido pago ou do que ainda faltava receber.

Fiz o **Casa em Dia** para tirar essa conta do papel e colocar no celular. Não é produto comercial. É a rotina deles virando sistema.

Para rodar de ponta a ponta sem pagar mensalidade, usei só ferramentas gratuitas:

| Camada | Ferramenta | Plano |
|--------|------------|-------|
| Banco | [Supabase](https://supabase.com) (PostgreSQL) | Free |
| API | [Render](https://render.com) | Free |
| Frontend | [Vercel](https://vercel.com) | Free |
| Código | Python, FastAPI, React, Vite | Open source |

Hoje o custo fixo é zero. Só entra despesa se algum serviço sair do free tier ou se a família quiser domínio próprio.

O repositório está público para referência técnica. Os dados de produção e as URLs do app ficam privados (uso familiar).

---

## 🚀 Como funciona em produção

Três peças, banco separado:

- **Frontend:** build estático (Vite) na CDN. PWA mobile-first, instalável no celular.
- **Backend:** API **FastAPI** no Render, com deploy a cada push na `main`.
- **Banco:** **PostgreSQL** no Supabase. Só o backend acessa.

O app fala só com a API (`VITE_API_URL`). Nada de credencial de banco ou segredo no navegador.

**Segurança em produção:**

- Senha única da família, sessão com **JWT (HS256)**.
- **CORS** limitado ao domínio do app.
- Segredos (`APP_SENHA`, `APP_SESSION_SECRET`, `DATABASE_URL`) só em variável de ambiente no servidor. Em produção, a API não sobe sem eles.
- **RLS** nas tabelas do Supabase.

> URLs de produção ficam privadas (uso familiar). Para rodar a sua cópia, veja [Como rodar localmente](#-como-rodar-localmente) e [Deploy](#-deploy).

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

- Cadastro de terrenos, casas e moradores (idade, adulto, contagem por casa).
- Cobrança de aluguel por casa e por mês (`YYYY-MM`), com desconto pontual se precisar.
- Contas de água e luz compartilhadas, rateio "por cabeça", incluindo a **casa administradora** (nº de moradores fixo e configurável).
- Despesas por categoria (manutenção, reparo, imposto, outros).
- Relatório mensal: totais, quebra por tipo (aluguel, água, luz, despesas), visão por casa e visão da administradora.
- Marcar aluguéis e rateios como pagos/recebidos.
- Pendências e aviso do que vence em até 3 dias.
- Login com senha compartilhada (**JWT HS256**).
- PWA instalável no celular.

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
- **CSS puro** (mobile-first). Fonte **Poppins**, destaques **Inter Bold**, ícones **SVG**, cor **`#FF5722`**
- PWA (ícones com **sharp**)

**Banco & Deploy**
- **PostgreSQL** no **Supabase** (RLS; cascade com `ondelete=CASCADE` + `passive_deletes`)
- **Render** (API, auto-deploy na `main`)
- **Vercel** (frontend, deploy manual via CLI)

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

Água e luz chegam num relógio só do terreno. O valor de cada casa segue o número de moradores:

- Cálculo: `floor(total × pessoas ÷ total_de_pessoas)`, em **centavos**.
- Centavos que sobram no arredondamento vão pelo **método dos maiores restos**, de forma fixa. A soma das fatias bate com o total.
- A **casa administradora** entra no rateio com nº de moradores fixo (`moradores_administradora`).
- O nº de pessoas fica gravado no lançamento (snapshot). Se alguém mudar de casa depois, a conta antiga não muda.

> Dinheiro sempre em **centavos (int)**. Sem `float`.

### Cobranças e competência

Aluguel e conta compartilhada pertencem a uma **competência** `YYYY-MM`. Dá para marcar como pago/recebido.

### Relatório mensal

Por competência, o relatório mostra:

- Totais do mês.
- Quebra por tipo: aluguel, água, luz, despesas.
- Visão por casa.
- Visão da casa administradora (parcela de água/luz que ela paga).

---

## 🚀 Como rodar localmente

### Pré-requisitos

- **Python 3.12+**
- **Node.js** (18+) e **npm**
- **PostgreSQL** (Supabase ou local). Nos **testes**, não precisa: roda com SQLite em memória.

### Backend

Comandos em **Windows / PowerShell**. No macOS/Linux, use `source .venv/bin/activate` no lugar do passo 1.

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

**Autenticação:** `POST /api/auth/login` com `{ "senha": "<APP_SENHA>" }`, pegue o `access_token` e mande nas rotas em `Authorization: Bearer <token>` (ou **Authorize** no Swagger).

### Frontend

```bash
cd frontend

# 1) dependências
npm install

# 2) variáveis de ambiente
cp .env.example .env
# defina VITE_API_URL (ex.: http://127.0.0.1:8000)

# 3) modo desenvolvimento
npm run dev
```

Outros scripts:

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
| `DATABASE_URL` | Sim | PostgreSQL com **asyncpg** (ex.: `postgresql+asyncpg://USUARIO:SENHA@HOST:PORTA/postgres`). Porta 5432 direta ou 6543 (pooler Supabase). |
| `APP_SENHA` | Sim | Senha única de acesso. |
| `APP_SESSION_SECRET` | Sim | Segredo longo para assinar o JWT (HS256). |
| `APP_SESSION_EXPIRE_MINUTES` | Não | Validade do token em minutos (padrão: `43200`, 30 dias). |
| `APP_CORS_ORIGINS` | Não | Origens CORS, separadas por vírgula (padrão: `*`). |

> No Render, `PYTHON_VERSION` = `3.12.4`.

### Frontend (`frontend/.env`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_API_URL` | Não | URL da API. Se vazio, usa o padrão do código. |

---

## 🗃️ Migrations (Alembic)

Em `backend/`, com `DATABASE_URL` configurada:

```bash
# aplicar todas as migrations pendentes
alembic upgrade head

# criar uma nova migration a partir dos modelos (precisa de um banco acessível)
alembic revision --autogenerate -m "descricao da mudanca"

# voltar uma migration
alembic downgrade -1
```

Migrations versionadas: schema inicial, administradora, morador (adulto/idade), **RLS** (`0005_enable_rls`), **cascade deletes** (`0006_cascade_deletes`).

---

## 🧪 Testes

Testes em `backend/tests/` com **pytest**. Domínio (rateio) não usa banco. API usa **SQLite em memória** (`aiosqlite`).

```bash
cd backend
pip install -e ".[dev]"   # pytest, pytest-asyncio, httpx, aiosqlite
pytest
```

---

## 📦 Deploy

### API (Render)

[`render.yaml`](render.yaml), serviço `controle-casas-api`:

- **Build:** `pip install -r requirements.txt`
- **Start:** `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Health check:** `/api/health`
- **Auto-deploy:** push na `main`
- Segredos no painel do Render. Nada versionado no Git.

### Frontend (Vercel, manual)

A Vercel não está ligada ao Git. Deploy manual em `frontend/`:

```bash
cd frontend
npx vercel deploy --prod --yes
```

SPA via [`frontend/vercel.json`](frontend/vercel.json) (rewrite para `index.html`). Configure `VITE_API_URL` na Vercel.

---

## 📄 Licença / nota final

Projeto de uso pessoal e familiar. Detalhes em [Sobre o projeto (pessoal)](#-sobre-o-projeto-pessoal). Sem licença pública definida.
