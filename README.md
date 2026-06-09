# 🏠 Casa em Dia

> Aluguéis da família no celular, sem caderno.

**Casa em Dia** (`controle-casas`) substitui o caderno que meus pais usavam para controlar os aluguéis. Várias casas no mesmo terreno, um relógio de água, um de luz, cobranças, despesas e o relatório do mês ficam num app só.

O rateio "por cabeça" divide água e luz pelo número de moradores de cada casa, incluindo a parte da casa administradora.

[![Produção](https://img.shields.io/badge/App-controle--casas.vercel.app-FF5722?logo=vercel&logoColor=white)](https://controle-casas.vercel.app/)
![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0_async-D71F00)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-AI-4285F4?logo=google&logoColor=white)

---

## 👨‍👩‍👧 Sobre o projeto

Projeto pessoal. Meus pais administram aluguéis de casas no mesmo terreno e, por anos, anotavam tudo no caderno. Água e luz chegam num relógio só, o rateio era feito na mão, e era comum perder o fio do que já tinha sido pago ou do que ainda faltava receber.

Fiz o **Casa em Dia** para tirar essa conta do papel e colocar no celular. Não é produto comercial. É a rotina deles virando sistema.

Tudo roda em planos gratuitos: banco no [Supabase](https://supabase.com), API no [Render](https://render.com), frontend na [Vercel](https://vercel.com) e IA via [Google Gemini](https://ai.google.dev/). Custo fixo zero.

O repositório está público para referência técnica. Dados de produção e credenciais ficam privados (uso familiar).

---

## 🚀 Como funciona em produção

Três peças, banco separado. O frontend é um build estático (Vite) servido pela Vercel — PWA mobile-first, instalável no celular, disponível em [controle-casas.vercel.app](https://controle-casas.vercel.app/). A API FastAPI fica no Render e faz deploy a cada push na `main`. O PostgreSQL é o Supabase, acessado só pelo backend.

O app fala exclusivamente com a API via `VITE_API_URL`. Nenhuma credencial de banco chega ao navegador.

A autenticação é por senha única da família (JWT HS256). CORS limitado ao domínio do app. Todos os segredos — `APP_SENHA`, `APP_SESSION_SECRET`, `DATABASE_URL`, `GEMINI_API_KEY` — ficam como variável de ambiente no servidor. As tabelas do Supabase têm RLS ativo.

---

## 🤖 Inteligência Artificial (Gemini)

O app usa o Google Gemini em três situações práticas. A lógica fica em `backend/app/services/ia.py`, os endpoints em `backend/app/routers/ia.py`.

`GET /ia/resumo` gera um parágrafo com a situação do mês: o que está em aberto, o que está atrasado, o que vence em breve. O componente `ResumoIA.tsx` exibe isso no dashboard.

`POST /ia/pergunta` aceita uma pergunta em texto livre — "quem está atrasado?", "quanto falta receber?" — e responde com base nos dados do período. É o `FinanceBot.tsx`, um chat flutuante no app.

`POST /ia/analisar-extrato` é o mais útil no dia a dia. Recebe um comprovante PIX, extrato bancário ou recibo (PDF, PNG, JPG, WebP) em base64 e usa o Gemini para extrair nome do pagador, valor e data. Depois compara o nome com os moradores cadastrados, tolerando apelidos, abreviações e ordem invertida de sobrenome. Com confiança acima de 80%, o modal de confirmação (`ModalConfirmarExtrato.tsx`) já vem pré-preenchido. O admin só confirma.

Se o Gemini retornar um UUID errado no match do morador — o que acontece — o serviço cai para comparação fuzzy de nomes via `SequenceMatcher`. Funciona na prática.

`POST /ia/confirmar-extrato` fecha o ciclo: salva o arquivo no Supabase Storage, cria o registro de `ExtratoPagamento` e dá baixa nas cobranças selecionadas (aluguel e/ou rateios de água/luz).

Para usar a IA, configure `GEMINI_API_KEY` (obtenha em [ai.google.dev](https://ai.google.dev/)) e `GEMINI_MODEL` (padrão: `gemini-2.0-flash`).

---

## 📱 Telas

<table>
  <tr>
    <td align="center"><strong>Início</strong></td>
    <td align="center"><strong>Casas</strong></td>
  </tr>
  <tr>
    <td><img src="https://raw.githubusercontent.com/danilofortes/controle-casas/main/docs/screenshots/inicio.png" alt="Tela inicial" width="400" /></td>
    <td><img src="https://raw.githubusercontent.com/danilofortes/controle-casas/main/docs/screenshots/casas.png" alt="Lista de casas" width="400" /></td>
  </tr>
</table>

---

## ✨ O que o app faz

- Cadastro de terrenos, casas e moradores (parentesco, sexo, idade, contagem por casa).
- Cobrança de aluguel por mês (`YYYY-MM`), com desconto pontual e recorrência automática.
- Contas de água e luz compartilhadas, rateio "por cabeça", incluindo a casa administradora.
- Despesas por categoria (manutenção, reparo, imposto, outros).
- Marcar aluguéis e rateios como pagos/recebidos.
- Upload de comprovante, análise por IA e baixa automática das cobranças.
- Aviso de pendências e do que vence em até 3 dias.
- Resumo automático do mês e chat com os dados via Gemini.
- Relatório mensal com visão por casa e por tipo (aluguel, água, luz, despesas).
- Documentos por casa: PDFs, fotos e anotações (Supabase Storage).
- PWA instalável no celular, login por senha compartilhada (JWT HS256).

---

## 🧰 Stack

Backend em Python 3.12+ com FastAPI, SQLAlchemy 2.0 async, Alembic, Pydantic v2, PyJWT e google-generativeai. Frontend em React 18 + Vite 5 + TypeScript, CSS puro (mobile-first), React Router DOM, PWA com sharp. Banco PostgreSQL no Supabase com RLS.

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
│  │  ├─ schemas/           # schemas Pydantic (inclui ia.py e extrato.py)
│  │  ├─ routers/           # auth, terrenos, casas, moradores, contas,
│  │  │                     #   rateios, alugueis, despesas, relatorio,
│  │  │                     #   dashboard, documentos, extratos, ia, config
│  │  └─ services/          # ia.py (Gemini), aluguel_recorrencia, config, moradores
│  ├─ alembic/              # migrations 0001–0011
│  ├─ scripts/              # seed.py, setup_supabase_storage.py
│  ├─ tests/                # pytest (domínio + API)
│  ├─ requirements.txt
│  └─ .env.example
├─ frontend/
│  ├─ src/
│  │  ├─ auth/              # AuthContext
│  │  ├─ components/        # FinanceBot, ResumoIA, ModalConfirmarExtrato,
│  │  │                     #   MarkdownLite, gráficos, AppSidebar, BottomNav...
│  │  ├─ pages/             # Login, Dashboard, Casas, Casa, Documentos,
│  │  │                     #   Novo, Relatorio, Ajustes
│  │  ├─ lib/               # api, format, useApi, pwa, morador
│  │  └─ styles/            # global.css, app-layout.css, theme.css, ui-system.css
│  ├─ public/               # PWA icons, manifest, sw.js
│  └─ .env.example
├─ specs/                   # requisitos e design
├─ render.yaml
└─ .github/workflows/keep-warm.yml
```

---

## 💡 Como o rateio funciona

Água e luz chegam num relógio só. O valor de cada casa é proporcional ao número de moradores: `floor(total × pessoas ÷ total_pessoas)`, em centavos. O que sobra no arredondamento vai pelo método dos maiores restos — a soma sempre fecha com o total. A casa administradora entra no rateio com um número fixo de moradores configurável. O snapshot de moradores é gravado no lançamento, então mudanças futuras não alteram contas antigas.

> Dinheiro sempre em centavos (int). Sem float.

Aluguel e contas pertencem a uma competência `YYYY-MM`. Aluguéis podem ter recorrência automática. O relatório mensal mostra tudo por competência: totais, quebra por tipo e visão por casa.

---

## 🚀 Rodando localmente

Você precisa de Python 3.12+, Node.js 18+ e um banco PostgreSQL (Supabase ou local). Para os testes, não precisa de banco — roda com SQLite em memória. A `GEMINI_API_KEY` é necessária só se for usar os endpoints de IA.

### Backend

No macOS/Linux troque `..venv\Scripts\Activate.ps1` por `source .venv/bin/activate`.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# preencha DATABASE_URL, APP_SENHA, APP_SESSION_SECRET e GEMINI_API_KEY
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
| `GEMINI_API_KEY` | Chave do Google AI Studio (necessária para os endpoints de IA) |
| `GEMINI_MODEL` | Modelo a usar (padrão: `gemini-2.0-flash`) |
| `SUPABASE_URL` | URL do projeto Supabase (necessária para Storage) |
| `SUPABASE_SERVICE_KEY` | Chave de serviço do Supabase (necessária para Storage) |
| `APP_SESSION_EXPIRE_MINUTES` | Validade do token em minutos (padrão: 43200 = 30 dias) |
| `APP_CORS_ORIGINS` | Origens CORS separadas por vírgula (padrão: `*`) |

### Frontend (`frontend/.env`)

| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL da API (se vazio, usa o padrão do código) |

---

## 🗃️ Migrations

O Alembic gerencia as migrations numeradas de `0001` a `0011`, cobrindo schema inicial, documentos por casa, parentesco e sexo de moradores, extrato de pagamento com RLS e recorrência de aluguel.

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

## 📦 Deploy

A API fica no Render via [`render.yaml`](render.yaml). O comando de start é `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`, então as migrations rodam automaticamente no deploy. Configure os segredos no painel do Render. Para o Storage funcionar, crie o bucket `documentos` no Supabase ou rode `python -m scripts.setup_supabase_storage`.

O frontend vai para a Vercel manualmente (não está conectado ao Git):

```bash
cd frontend
npx vercel deploy --prod --yes
```

Configure `VITE_API_URL` nas variáveis de ambiente da Vercel.

---

## 📄 Licença

Projeto de uso pessoal e familiar. Sem licença pública definida.
