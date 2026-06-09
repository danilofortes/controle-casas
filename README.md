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
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)

---

## 👨‍👩‍👧 Sobre o projeto

Meus pais nunca foram muito de usar cadernos para controlar os aluguéis. Na prática, boa parte da gestão ficava na memória da minha mãe, que sempre foi extremamente organizada financeiramente e tinha facilidade para acompanhar pagamentos, despesas e tudo o que acontecia nas casas.

Por muito tempo isso funcionou bem. Porém, mesmo com organização e experiência, a memória tem seus limites. Hoje, com a facilidade de registrar e analisar informações, manter um histórico dos dados vai muito além de apenas lembrar o que foi pago ou recebido. Ter registros permite acompanhar gastos recorrentes, identificar padrões, planejar despesas futuras e tomar decisões com mais segurança.

O Casa em Dia nasceu justamente dessa realidade. A ideia não era substituir a forma como minha família administrava os aluguéis, mas transformar anos de conhecimento e organização em uma ferramenta que tornasse o controle mais simples, acessível e eficiente para o futuro.

O repositório está público para referência técnica.

---

## ✨ O que o app faz

- Cadastro de terrenos, casas e moradores (parentesco, sexo, idade, contagem por casa).
- Cobrança de aluguel por mês (`YYYY-MM`), com desconto pontual e recorrência automática.
- Contas de água e luz compartilhadas, rateio "por cabeça", incluindo a casa administradora.
- Despesas por categoria (manutenção, reparo, imposto, outros).
- Marcar aluguéis e rateios como pagos/recebidos.
- Aviso de pendências e do que vence em até 3 dias.
- Relatório mensal com visão por casa e por tipo (aluguel, água, luz, despesas).
- Documentos por casa: PDFs, fotos e anotações.
- PWA instalável no celular, login por senha compartilhada (JWT HS256).

---

## 🧰 Stack

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

**Banco**
- **PostgreSQL** (RLS; cascade com `ondelete=CASCADE` + `passive_deletes`)

---

## 🗂️ Estrutura do monorepo

```
controle-casas/
├─ backend/
│  ├─ app/
│  │  ├─ main.py            # app FastAPI, CORS, /api/health
│  │  ├─ deps.py            # dependências (sessão de DB, auth Bearer)
│  │  ├─ core/              # config, db, security (JWT), storage
│  │  ├─ domain/            # lógica pura: rateio, money, competencia
│  │  ├─ models/            # aluguel, casa, conta, despesa, documento,
│  │  │                     #   extrato, morador, terreno, configuracao
│  │  ├─ schemas/           # schemas Pydantic
│  │  ├─ routers/           # auth, terrenos, casas, moradores, contas,
│  │  │                     #   rateios, alugueis, despesas, relatorio,
│  │  │                     #   dashboard, documentos, extratos, config
│  │  └─ services/          # consultas auxiliares
│  ├─ alembic/              # migrations
│  ├─ scripts/seed.py       # seed opcional de exemplo
│  ├─ tests/                # pytest (domínio + API)
│  ├─ requirements.txt
│  └─ .env.example
├─ frontend/
│  ├─ src/
│  │  ├─ auth/              # AuthContext
│  │  ├─ components/        # UI (AppShell, BottomNav, Modal, forms, ...)
│  │  ├─ pages/             # Login, Dashboard, Casas, Casa, Novo, Relatorio, Ajustes
│  │  ├─ lib/               # api, format, useApi, pwa
│  │  └─ styles/            # global.css
│  ├─ package.json
│  └─ .env.example
└─ specs/                   # requisitos do projeto
```

---

## 💡 Como o rateio funciona

O rateio é um sistema que a minha família adotou por conta da forma como administra as coisas: várias casas no mesmo terreno, uma única conta de água e uma de luz, e a necessidade de dividir o custo de forma justa entre todos. Em vez de cada casa ter seu próprio medidor, o valor total da conta é repartido proporcionalmente ao número de moradores de cada casa — incluindo a própria casa administradora, que também entra na divisão.

Água e luz chegam num relógio só. O valor de cada casa é proporcional ao número de moradores: `floor(total × pessoas ÷ total_pessoas)`, em centavos. O que sobra no arredondamento vai pelo método dos maiores restos — a soma sempre fecha com o total. A casa administradora entra no rateio com um número fixo de moradores configurável. O snapshot de moradores é gravado no lançamento, então mudanças futuras não alteram contas antigas.

> Dinheiro sempre em centavos (int). Sem float.

Aluguel e contas pertencem a uma competência `YYYY-MM`. Aluguéis podem ter recorrência automática. O relatório mensal mostra tudo por competência: totais, quebra por tipo e visão por casa.

---

## 🚀 Rodando localmente

Você precisa de Python 3.12+, Node.js 18+ e um banco PostgreSQL (local ou serviço externo). Para os testes, não precisa de banco — roda com SQLite em memória.

### Backend

No macOS/Linux troque `.\.venv\Scripts\Activate.ps1` por `source .venv/bin/activate`.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# preencha DATABASE_URL, APP_SENHA e APP_SESSION_SECRET
alembic upgrade head
uvicorn app.main:app --reload
```

Swagger em http://127.0.0.1:8000/docs. Para autenticar, faça `POST /api/auth/login` com `{ "senha": "<APP_SENHA>" }` e use o `access_token` no header `Authorization: Bearer <token>`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # defina VITE_API_URL=http://127.0.0.1:8000
npm run dev
```

---

## ⚙️ Variáveis de ambiente

### Backend (`backend/.env`)

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | PostgreSQL com asyncpg. Ex.: `postgresql+asyncpg://user:pass@host:5432/postgres` |
| `APP_SENHA` | Senha única de acesso |
| `APP_SESSION_SECRET` | Segredo para assinar o JWT |
| `APP_SESSION_EXPIRE_MINUTES` | Validade do token em minutos (padrão: 43200 = 30 dias) |
| `APP_CORS_ORIGINS` | Origens CORS separadas por vírgula (padrão: `*`) |

### Frontend (`frontend/.env`)

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL da API (se vazio, usa o padrão do código) |

---

## 🗃️ Migrations

```bash
alembic upgrade head        # aplica tudo
alembic downgrade -1        # volta uma
alembic revision --autogenerate -m "descricao"  # cria nova migration
```

---

## 🧪 Testes

Os testes de domínio (rateio, competência, dinheiro) não precisam de banco. Os de API usam SQLite em memória via `aiosqlite`.

```bash
cd backend
pip install -e ".[dev]"
pytest
```

---

## 📄 Licença

Projeto de uso pessoal e familiar. Sem licença pública definida.
