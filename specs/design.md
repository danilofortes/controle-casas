# Design — Controle de Casas Alugadas

## Visão geral

Sistema para administrar aluguéis de casas que ficam no mesmo terreno e
compartilham relógios de água e luz. O coração do sistema é a **divisão automática
das contas por cabeça**, com snapshot do número de moradores no momento do
lançamento.

A arquitetura é **backend separado em Python (FastAPI)** expondo uma **API REST**,
com banco **PostgreSQL no Supabase**. O **frontend será definido depois** e
consumirá essa API. Este documento traduz os requisitos (`requirements.md`) em
arquitetura, modelo de dados e contrato de API. O plano de execução está em
`tasks.md`.

## Arquitetura

```
┌─────────────────────────────────────────────┐
│      Frontend (a definir) — mobile-first      │
│      consome a API REST via HTTP/JSON         │
└───────────────┬───────────────────────────────┘
                │  REST / JSON  (+ token de sessão)
┌───────────────▼───────────────────────────────┐
│              Backend — FastAPI (Python)        │
│  - Routers (endpoints REST)                    │
│  - Schemas Pydantic (validação entrada/saída)  │
│  - Camada de domínio (rateio, dinheiro)        │
│  - Autenticação (senha + token)                │
│  - SQLAlchemy (ORM async)                      │
└───────────────┬───────────────────────────────┘
                │ asyncpg
┌───────────────▼───────────────────────────────┐
│        PostgreSQL gerenciado (Supabase)        │
└─────────────────────────────────────────────┘
```

- **API REST stateless:** todos os recursos via endpoints JSON; documentação automática (Swagger/OpenAPI) em `/docs`.
- **Domínio isolado:** a lógica de rateio fica em módulos puros (`app/domain/`), testável sem banco nem HTTP.
- **Supabase como banco:** usamos o Supabase principalmente como Postgres gerenciado (conexão via `DATABASE_URL`). Recursos extras do Supabase (Auth, Storage, Realtime) ficam disponíveis para evolução futura, mas não são requisito agora.
- **Frontend desacoplado:** por ser API REST + OpenAPI, qualquer frontend (React/Next.js, app mobile, etc.) pode consumir depois.

## Stack tecnológica

| Camada | Escolha | Motivo |
|---|---|---|
| Linguagem | Python 3.12+ | Preferência do mantenedor; ótimo ecossistema |
| Framework | FastAPI | Moderno, rápido, validação com Pydantic, docs automáticas |
| ORM | SQLAlchemy 2.0 (async) | Padrão robusto e maduro para Postgres |
| Driver | asyncpg | Driver async performático para Postgres |
| Migrações | Alembic | Versionamento do schema |
| Validação | Pydantic v2 | Schemas de entrada/saída e configurações |
| Banco | PostgreSQL (Supabase) | Dados relacionais, integridade, gerenciado |
| Servidor | Uvicorn (ASGI) | Execução do FastAPI |
| Testes | pytest | Testes de domínio e de API |
| Gerência de deps | `pyproject.toml` (uv/pip) ou `requirements.txt` | Reprodutibilidade |
| Hospedagem backend | Render | Serviço Python long-running em plano gratuito, simples de configurar |

> Alternativa considerada: **SQLModel** (Pydantic + SQLAlchemy juntos). Decisão:
> usar **SQLAlchemy 2.0 + Pydantic** separados por serem mais maduros e documentados;
> SQLModel pode ser reavaliado.

### Conexão com o Supabase
- O Supabase fornece a string de conexão Postgres. Para o backend, usar a porta do
  **pooler** (pgBouncer) quando hospedado em ambientes serverless, ou conexão direta
  para um serviço long-running.
- A `DATABASE_URL` (com SSL) vai em variável de ambiente, nunca no código.

### Representação de dinheiro
Valores monetários DEVEM ser armazenados como **inteiros em centavos** (ex.:
R$ 1.234,56 → `123456`) para evitar erros de ponto flutuante e garantir soma exata
no rateio. A formatação para `pt-BR` (R$) é responsabilidade do frontend, mas a API
PODE também devolver um campo formatado por conveniência.

## Modelo de dados

### Diagrama de entidades

```
Terreno 1───* Casa 1───* Morador
   │                │
   │                ├──* CobrancaAluguel
   │                ├──* RateioConta *───1 ContaCompartilhada
   │                └──* Despesa
   │
   └──* ContaCompartilhada (água/luz do terreno)
   └──* Despesa (despesa geral do terreno)
```

### Entidades (tabelas)

#### terreno
- `id` (uuid, pk)
- `nome` (text)
- `endereco` (text, nullable)
- `created_at`, `updated_at`

#### casa
- `id` (uuid, pk)
- `terreno_id` (fk → terreno)
- `nome` (text) — ex.: "Casa 1", "Casa dos fundos"
- `aluguel_centavos` (int) — valor fixo do aluguel
- `dia_vencimento` (int 1–31)
- `ativo` (bool, default true)
- `observacoes` (text, nullable)
- `created_at`, `updated_at`

#### morador
- `id` (uuid, pk)
- `casa_id` (fk → casa)
- `nome` (text)
- `telefone` (text, nullable)
- `responsavel` (bool, default false)
- `data_entrada` (date) — quando passou a morar na casa
- `data_saida` (date, nullable) — quando saiu (null = ainda mora)
- `created_at`, `updated_at`

> **Histórico:** moradores que já saíram permanecem na tabela com `data_saida`
> preenchida (não são apagados). Cabeças "atuais" de uma casa = nº de moradores com
> `data_saida` nula (ou futura). Esse é o número usado no snapshot do rateio.

#### conta_compartilhada
- `id` (uuid, pk)
- `terreno_id` (fk → terreno)
- `tipo` (enum: `AGUA` | `LUZ`)
- `competencia` (text `YYYY-MM`)
- `valor_total_centavos` (int)
- `vencimento` (date)
- `created_at`, `updated_at`

#### rateio_conta
- `id` (uuid, pk)
- `conta_id` (fk → conta_compartilhada, on delete cascade)
- `casa_id` (fk → casa)
- `pessoas_snapshot` (int) — nº de moradores no momento do lançamento
- `valor_centavos` (int) — fatia calculada
- `pago` (bool, default false)
- `pago_em` (date, nullable)
- único (`conta_id`, `casa_id`)

#### cobranca_aluguel
- `id` (uuid, pk)
- `casa_id` (fk → casa)
- `competencia` (text `YYYY-MM`)
- `valor_centavos` (int) — copiado do valor da casa (permite desconto pontual)
- `vencimento` (date)
- `pago` (bool, default false)
- `pago_em` (date, nullable)
- único (`casa_id`, `competencia`)

#### despesa
- `id` (uuid, pk)
- `terreno_id` (fk → terreno, nullable)
- `casa_id` (fk → casa, nullable)
- `descricao` (text)
- `categoria` (enum: `MANUTENCAO` | `REPARO` | `IMPOSTO` | `OUTROS`)
- `valor_centavos` (int)
- `data` (date)
- `created_at`

### Esboço dos modelos SQLAlchemy (referência)

```python
import uuid
from datetime import date, datetime
from enum import Enum
from sqlalchemy import ForeignKey, String, Integer, Boolean, Date, DateTime, Enum as SAEnum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class TipoConta(str, Enum):
    AGUA = "AGUA"
    LUZ = "LUZ"

class Casa(Base):
    __tablename__ = "casa"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    terreno_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("terreno.id"))
    nome: Mapped[str]
    aluguel_centavos: Mapped[int]
    dia_vencimento: Mapped[int] = mapped_column(default=10)
    ativo: Mapped[bool] = mapped_column(default=True)
    observacoes: Mapped[str | None]
    moradores: Mapped[list["Morador"]] = relationship(back_populates="casa")
    # ... demais relações

class RateioConta(Base):
    __tablename__ = "rateio_conta"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    conta_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("conta_compartilhada.id", ondelete="CASCADE"))
    casa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("casa.id"))
    pessoas_snapshot: Mapped[int]
    valor_centavos: Mapped[int]
    pago: Mapped[bool] = mapped_column(default=False)
    pago_em: Mapped[date | None]
    # UniqueConstraint(conta_id, casa_id)
```

(Os modelos completos e as migrações ficam em `app/models/` e `alembic/`.)

## Algoritmo de rateio (divisão por cabeça)

Ponto central do sistema (Requisito 6). Implementado como **função pura** em
`app/domain/rateio.py`, sem dependência de banco ou HTTP.

```python
def calcular_rateio(valor_total_centavos: int,
                    casas: list[CasaParticipante]) -> list[FatiaRateio]:
    total_pessoas = sum(c.pessoas for c in casas)
    if total_pessoas == 0:
        raise ValueError("Total de pessoas é zero; não é possível ratear.")
    # 1) piso proporcional
    fatias = []
    soma = 0
    restos = []
    for c in casas:
        bruto = valor_total_centavos * c.pessoas
        base = bruto // total_pessoas
        resto = bruto % total_pessoas
        fatias.append(base); soma += base; restos.append((resto, c))
    # 2) distribuir centavos restantes pelos maiores restos
    sobra = valor_total_centavos - soma
    for _, c in sorted(restos, key=lambda r: (-r[0], str(r[1].casa_id)))[:sobra]:
        # +1 centavo para as 'sobra' casas de maior resto
        ...
    # garante: sum(valor_centavos) == valor_total_centavos
```

**Regras:**
1. Snapshot de `pessoas` por casa no momento do lançamento. _(Req 6.3)_
2. `valor = floor(total × pessoas / total_pessoas)` em centavos. _(Req 6.2)_
3. Distribuir o resto (centavos) pelos maiores restos para somar exato. _(Req 6.4)_
4. `total_pessoas == 0` → erro de validação (HTTP 422). _(Req 6.5)_

**Exemplo:** R$ 300,00 (30000), casas com 4/1/1 (total 6) → 20000 / 5000 / 5000. ✔
**Resto:** R$ 100,00 (10000), 1/1/1 (total 3) → 3334 / 3333 / 3333 (soma 10000). ✔

## Contrato da API (REST)

Base: `/api`. Autenticação via header `Authorization: Bearer <token>` (ver abaixo).
Documentação automática em `/docs` (Swagger) e `/openapi.json`.

| Método | Rota | Descrição | Requisito |
|---|---|---|---|
| POST | `/auth/login` | Recebe senha, devolve token de sessão | 1 |
| POST | `/auth/logout` | Invalida sessão (cliente descarta token) | 1.4 |
| GET/POST | `/terrenos` | Listar / criar terreno | 2 |
| GET/PUT/DELETE | `/terrenos/{id}` | Detalhe / editar / excluir (c/ checagem de vínculos) | 2 |
| GET/POST | `/casas` | Listar / criar casa | 3 |
| GET/PUT/DELETE | `/casas/{id}` | Detalhe / editar / excluir | 3 |
| GET/POST | `/casas/{id}/moradores` | Listar / adicionar morador | 4 |
| PUT/DELETE | `/moradores/{id}` | Editar / remover morador | 4 |
| GET/POST | `/contas` | Listar / **lançar conta + calcular rateio** | 6 |
| GET | `/contas/{id}` | Detalhe da conta com rateios | 6 |
| PUT/DELETE | `/contas/{id}` | Editar (recalcula rateio) / excluir | 6.7 |
| PATCH | `/rateios/{id}/pagamento` | Marcar/desmarcar pago | 7 |
| GET/POST | `/alugueis` | Listar / **registrar manualmente** cobrança (casa, competência, valor, vencimento) | 5.1, 5.2 |
| PUT/DELETE | `/alugueis/{id}` | Editar valor (desconto pontual) / excluir | 5.4 |
| PATCH | `/alugueis/{id}/pagamento` | Marcar/desmarcar pago | 5.3, 7 |
| GET/POST | `/despesas` | Listar / criar despesa | 8 |
| PUT/DELETE | `/despesas/{id}` | Editar / excluir despesa | 8 |
| GET | `/relatorio?competencia=YYYY-MM` | Resumo mensal por casa e totais | 9 |
| GET | `/dashboard` | Visão geral (em aberto, atrasados) | 10 |

**Convenções:**
- Erros retornam JSON com `detail` (mensagem em pt-BR) e status HTTP adequado (400/404/409/422).
- Validações com Pydantic (valores ≥ 0, competência `YYYY-MM`, enums válidos).
- Datas em ISO 8601 (`YYYY-MM-DD`); valores monetários em centavos (int).

## Estrutura do projeto (backend)

```
backend/
  app/
    main.py                # cria o app FastAPI, inclui routers, CORS
    core/
      config.py            # settings (Pydantic) — DATABASE_URL, APP_SENHA, SECRET
      db.py                # engine async + session
      security.py          # hash/comparação de senha, criação/validação de token
    domain/
      rateio.py            # função pura de divisão por cabeça
      money.py             # helpers de centavos / formatação
      competencia.py       # helpers de competência YYYY-MM
    models/                # modelos SQLAlchemy
    schemas/               # schemas Pydantic (entrada/saída)
    routers/               # auth, terrenos, casas, moradores, contas, alugueis, despesas, relatorio, dashboard
    deps.py                # dependências (sessão de DB, usuário autenticado)
  alembic/                 # migrações
  tests/                   # pytest (domínio + API)
  pyproject.toml           # dependências
  .env.example             # DATABASE_URL, APP_SENHA, APP_SESSION_SECRET
  README.md
```

> O frontend (a definir) ficará em uma pasta separada (ex.: `frontend/`) ou repositório próprio.

## Autenticação (senha compartilhada)

- `APP_SENHA` define a senha; `APP_SESSION_SECRET` assina o token.
- `POST /auth/login`: compara a senha; se correta, emite um **token JWT (HS256)** com validade (ex.: 30 dias).
- Endpoints protegidos usam uma **dependency** do FastAPI que valida o token (header `Authorization: Bearer`).
- Senha guardada apenas em variável de ambiente; comparação feita de forma segura.
- **Decisão:** senha única compartilhada (sem contas por usuário), por simplicidade.
  Estrutura permite evoluir para múltiplos usuários (ou Supabase Auth) depois.

## Validação e tratamento de erros
- Entrada validada por schemas Pydantic; mensagens de erro em pt-BR.
- Regras críticas: `total_pessoas > 0` ao lançar conta (422); valores ≥ 0;
  unicidade (conta, casa) e (casa, competência) → conflito 409;
  recursos inexistentes → 404; confirmação/cheagem antes de excluir com vínculos.
- Exceções de domínio mapeadas para respostas HTTP claras, sem expor stack trace.

## Estratégia de testes
- **Unitários (prioridade):** `domain/rateio.py` (soma exata, total ímpar, 1 casa, distribuição de centavos), `money.py`, `competencia.py`. _(Req 6.4)_
- **Integração de API:** `pytest` + `httpx`/`TestClient` para endpoints de login, lançamento de conta (rateio correto + snapshot), pagamento e relatório, usando banco de teste.
- **Manual/E2E (mínimo):** via Swagger (`/docs`) — login, cadastrar casa/moradores, lançar conta, conferir rateio, marcar pago, ver relatório.

## Deploy
1. Criar projeto no **Supabase** e copiar a `DATABASE_URL` (com SSL/pooler).
2. Provisionar o serviço Python no **Render** com as variáveis: `DATABASE_URL`, `APP_SENHA`, `APP_SESSION_SECRET`.
3. Rodar migrações com Alembic (`alembic upgrade head`).
4. Subir o FastAPI com Uvicorn; validar via `/docs`.
5. (Depois) publicar o frontend apontando para a URL da API.

## Decisões definidas
- **Token de sessão:** JWT (HS256).
- **Aluguéis:** apenas **registro manual** de cobranças e do status de pagamento.
  Sem geração automática nem cobrança automática (fica como possível evolução futura).
- **Moradores:** com **histórico** (datas de entrada e saída); cabeças atuais = sem data de saída.
- **Hospedagem do backend:** **Render** (plano gratuito).
- **Banco:** PostgreSQL no **Supabase**.

## Decisões em aberto
- **Frontend:** tecnologia a definir (React/Next.js, etc.) — a API já fica pronta para consumo (Fase 12 do `tasks.md`).
