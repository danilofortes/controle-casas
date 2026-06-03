# Requisitos — Controle de Casas Alugadas

## Introdução

Sistema web (otimizado para celular) para ajudar a administrar o aluguel de casas
de uma família. Hoje todo o controle é feito no papel, o que é trabalhoso e sujeito
a erros, principalmente na divisão das contas de água e luz.

As casas alugadas ficam **no mesmo terreno** e **compartilham um único relógio de
água e um único relógio de luz**. Por isso, chega **uma conta só** de cada tipo, e o
valor precisa ser **dividido por cabeça** (número de pessoas) entre as famílias de
todas as casas. O aluguel, por outro lado, é um **valor fixo** combinado com cada
família.

### Objetivos
- Tirar o controle do papel e centralizar tudo num só lugar.
- Calcular automaticamente a divisão das contas de água/luz por cabeça.
- Saber rapidamente quem pagou e quem está devendo no mês.
- Ter um resumo mensal de quanto entrou e quanto saiu.

### Escopo (importante)
- O sistema é, nesta etapa, de **registro de informações**: o administrador lança
  os dados e atualiza manualmente o que foi pago ou não.
- **Não há cobrança automática** nem geração automática de aluguéis. Isso fica como
  possível implementação futura.
- A única automação desta etapa é o **cálculo do rateio** das contas de água/luz por
  cabeça (para não fazer a conta no papel).

### Glossário
- **Terreno (lote):** área onde ficam as casas; compartilha um relógio de água e um de luz.
- **Casa:** imóvel alugado por inteiro para uma família.
- **Morador:** pessoa que mora em uma casa. O número de moradores de uma casa é o número de "cabeças".
- **Conta compartilhada:** conta de água ou luz que chega para o terreno inteiro e é dividida por cabeça.
- **Rateio:** a fatia de uma conta compartilhada que cabe a cada casa.
- **Aluguel:** valor fixo mensal cobrado de cada casa/família.
- **Competência:** o mês/ano de referência de uma cobrança (ex.: 03/2026).

### Personas
- **Administrador (os pais):** cadastra casas, moradores e contas; registra pagamentos; consulta relatórios. Usuário não técnico, usa principalmente o celular.

### Estrutura de pastas do projeto
O projeto é organizado como um repositório único (monorepo), com o backend e o
frontend separados, além da pasta de especificações:

```
controle-casas/
├── specs/                  # Especificações (este documento e os demais)
│   ├── requirements.md     # Requisitos e critérios de aceitação
│   ├── design.md           # Arquitetura, modelo de dados e contrato de API
│   └── tasks.md            # Plano de implementação (checklist)
├── backend/                # API em Python (FastAPI) — etapa atual
│   ├── app/
│   │   ├── main.py         # App FastAPI (rotas, CORS, /docs)
│   │   ├── core/           # config, conexão com o banco, segurança/JWT
│   │   ├── domain/         # lógica pura: rateio, dinheiro, competência
│   │   ├── models/         # modelos SQLAlchemy (tabelas)
│   │   ├── schemas/        # schemas Pydantic (entrada/saída)
│   │   ├── routers/        # endpoints (auth, casas, contas, etc.)
│   │   └── deps.py         # dependências (sessão de DB, autenticação)
│   ├── alembic/            # migrações do banco
│   ├── tests/              # testes (pytest)
│   ├── pyproject.toml      # dependências do backend
│   ├── .env.example        # variáveis de ambiente (DATABASE_URL, APP_SENHA, ...)
│   └── README.md           # como rodar o backend
└── frontend/               # Interface mobile-first — definido na Fase 12 (futuro)
```

> Observação: a pasta `frontend/` será criada quando a tecnologia do frontend for
> definida (ver `tasks.md`, Fase 12). O banco de dados é gerenciado externamente no
> Supabase (não fica em pasta do projeto).

---

## Requisitos

### Requisito 1 — Acesso protegido por senha
**História:** Como administrador, quero entrar no sistema com uma senha simples
compartilhada, para que apenas a família tenha acesso aos dados.

**Critérios de aceitação:**
1. QUANDO um visitante não autenticado acessar qualquer página de dados, ENTÃO o sistema DEVE redirecioná-lo para a tela de login.
2. QUANDO o administrador informar a senha correta na tela de login, ENTÃO o sistema DEVE conceder acesso e mantê-lo logado por um período (sessão via cookie).
3. QUANDO o administrador informar uma senha incorreta, ENTÃO o sistema DEVE exibir uma mensagem de erro e negar o acesso.
4. QUANDO o administrador escolher "sair", ENTÃO o sistema DEVE encerrar a sessão e exigir senha novamente.
5. A senha NÃO DEVE ficar exposta no código; DEVE ser configurada por variável de ambiente.

### Requisito 2 — Gestão de terrenos
**História:** Como administrador, quero cadastrar o(s) terreno(s) onde ficam as
casas, para agrupar as casas que dividem o mesmo relógio de água e luz.

**Critérios de aceitação:**
1. QUANDO o administrador cadastrar um terreno com nome (e endereço opcional), ENTÃO o sistema DEVE salvá-lo.
2. O sistema DEVE permitir cadastrar mais de um terreno.
3. QUANDO o administrador editar ou remover um terreno, ENTÃO o sistema DEVE refletir a alteração.
4. IF um terreno possuir casas vinculadas, ENTÃO o sistema NÃO DEVE permitir excluí-lo sem confirmação/aviso.
5. Toda conta compartilhada (água/luz) DEVE estar vinculada a um terreno.

### Requisito 3 — Gestão de casas
**História:** Como administrador, quero cadastrar as casas alugadas, com o valor do
aluguel e o dia de vencimento, para controlar cada imóvel.

**Critérios de aceitação:**
1. QUANDO o administrador cadastrar uma casa, ENTÃO o sistema DEVE registrar: nome/identificação, terreno, valor do aluguel e dia de vencimento.
2. Cada casa DEVE pertencer a exatamente um terreno.
3. O sistema DEVE permitir marcar uma casa como ativa ou inativa (ex.: vaga, sem inquilino).
4. QUANDO o administrador editar o valor do aluguel, ENTÃO o novo valor DEVE valer para as próximas cobranças, sem alterar cobranças passadas já registradas.
5. O valor do aluguel DEVE ser exibido em Reais (R$).

### Requisito 4 — Gestão de moradores
**História:** Como administrador, quero cadastrar todos os moradores de cada casa,
para saber o número de pessoas (cabeças) usado na divisão das contas.

**Critérios de aceitação:**
1. QUANDO o administrador adicionar um morador a uma casa, ENTÃO o sistema DEVE registrá-lo (nome, telefone opcional e data de entrada).
2. O sistema DEVE permitir adicionar moradores a qualquer momento e registrar a saída de um morador informando a data de saída.
3. O sistema DEVE manter o **histórico** de moradores: quem já saiu permanece registrado com suas datas de entrada e saída, mas não conta mais como morador atual.
4. O sistema DEVE calcular o número de moradores atuais (cabeças) de cada casa automaticamente — considerando os moradores **sem data de saída** (ou com saída futura).
5. QUANDO o número de moradores de uma casa mudar, ENTÃO as contas já lançadas NÃO DEVEM ser recalculadas (o número de pessoas fica "fotografado" no momento da conta — ver Requisito 6).
6. O sistema DEVE indicar qual morador é o responsável/contato principal da casa (opcional).

### Requisito 5 — Registro de aluguéis e pagamentos
**História:** Como administrador, quero **registrar manualmente** o aluguel de cada
casa por mês e marcar se foi pago, para guardar essa informação no site (sem
qualquer cobrança ou geração automática).

**Critérios de aceitação:**
1. O sistema DEVE permitir **registrar manualmente** uma cobrança de aluguel para uma casa numa competência (mês/ano), informando valor e vencimento. O valor fixo da casa PODE ser sugerido/pré-preenchido, mas o registro é sempre manual.
2. O sistema NÃO DEVE gerar cobranças automaticamente (nem por casa, nem por mês); toda criação é feita pelo administrador.
3. QUANDO uma cobrança de aluguel for registrada, ENTÃO o sistema DEVE permitir marcá-la como paga (com data) e desmarcar em caso de engano.
4. O sistema DEVE permitir editar o valor de uma cobrança específica (ex.: desconto pontual) e excluí-la, sem alterar o valor padrão da casa.
5. O sistema DEVE exibir o status de cada aluguel: pago ou em aberto.
6. IF a data atual passou do vencimento E o aluguel está em aberto, ENTÃO o sistema DEVE sinalizar como atrasado.

### Requisito 6 — Contas de água e luz com divisão por cabeça
**História:** Como administrador, quero lançar a conta total de água ou luz do
terreno e ter a divisão por cabeça calculada automaticamente, para não precisar
fazer essa conta no papel.

**Critérios de aceitação:**
1. QUANDO o administrador lançar uma conta compartilhada informando terreno, tipo (água ou luz), competência (mês/ano), valor total e vencimento, ENTÃO o sistema DEVE calcular o rateio entre as casas do terreno.
2. O sistema DEVE dividir o valor proporcionalmente ao número de moradores de cada casa: `valor_da_casa = valor_total × (pessoas_da_casa / total_de_pessoas)`.
3. QUANDO a conta for lançada, ENTÃO o sistema DEVE **fotografar (snapshot)** o número de moradores de cada casa naquele momento e guardar junto ao rateio, de modo que mudanças futuras de moradores não alterem essa conta.
4. O sistema DEVE garantir que a soma dos rateios seja exatamente igual ao valor total da conta (tratando os centavos de arredondamento).
5. IF o total de pessoas no terreno for zero, ENTÃO o sistema NÃO DEVE permitir o lançamento e DEVE avisar o administrador.
6. O sistema DEVE permitir incluir ou excluir uma casa específica de um rateio (ex.: casa vaga não entra na divisão).
7. QUANDO o administrador editar o valor total de uma conta já lançada, ENTÃO o sistema DEVE recalcular os rateios mantendo o snapshot de pessoas.

### Requisito 7 — Controle de pagamentos
**História:** Como administrador, quero registrar e visualizar os pagamentos de
aluguel e das contas rateadas, para saber a situação de cada casa.

**Critérios de aceitação:**
1. O sistema DEVE permitir marcar como pago/em aberto cada item devido por uma casa: o aluguel e cada rateio de conta.
2. QUANDO um item for marcado como pago, ENTÃO o sistema DEVE registrar a data do pagamento.
3. O sistema DEVE mostrar, por casa e por competência, o total devido (aluguel + rateios) e o total já pago.
4. O sistema DEVE listar de forma destacada quem está devendo (itens em aberto).
5. O sistema DEVE permitir desfazer a marcação de pago (caso de engano).

### Requisito 8 — Despesas e manutenção
**História:** Como administrador, quero registrar despesas (manutenção, reparos,
etc.), para acompanhar quanto sai além das contas rateadas.

**Critérios de aceitação:**
1. QUANDO o administrador registrar uma despesa com descrição, valor e data, ENTÃO o sistema DEVE salvá-la.
2. O sistema DEVE permitir vincular a despesa a uma casa específica ou ao terreno (despesa geral).
3. O sistema DEVE permitir categorizar a despesa (ex.: manutenção, reparo, imposto, outros).
4. As despesas DEVEM aparecer no resumo mensal como saídas.

### Requisito 9 — Relatório e resumo mensal
**História:** Como administrador, quero ver um resumo do mês, para saber quanto
entrou, quanto está em aberto e quanto saiu em despesas.

**Critérios de aceitação:**
1. QUANDO o administrador selecionar uma competência (mês/ano), ENTÃO o sistema DEVE exibir, por casa: aluguel, rateios de água/luz, total devido, total pago e saldo em aberto.
2. O sistema DEVE exibir totais consolidados do mês: total a receber, total recebido, total em aberto e total de despesas.
3. O sistema DEVE permitir navegar entre meses.
4. O sistema DEVE exibir todos os valores em Reais (R$) no formato brasileiro.

### Requisito 10 — Painel inicial (dashboard)
**História:** Como administrador, quero uma tela inicial com a visão geral, para
saber rapidamente o que precisa de atenção.

**Critérios de aceitação:**
1. QUANDO o administrador abrir o sistema autenticado, ENTÃO o sistema DEVE exibir um painel com: total em aberto do mês, quantidade de itens atrasados e atalhos para as principais ações.
2. O sistema DEVE destacar pendências (aluguéis e contas em aberto/atrasados).
3. O painel DEVE ser legível e funcional no celular.

---

## Requisitos não-funcionais

1. **Mobile-first:** a interface (frontend, a ser definido) DEVE ser pensada primeiro para o celular, com botões e textos confortáveis ao toque.
2. **Idioma e moeda:** todo o sistema DEVE estar em português do Brasil e exibir valores em Reais (R$), datas no formato dd/mm/aaaa.
3. **Stack e hospedagem:** o backend DEVE ser uma API em **Python (FastAPI)**; o banco DEVE ser **PostgreSQL gerenciado no Supabase**. O backend DEVE poder ser publicado em plano gratuito (ex.: Render/Railway/Fly). O frontend será definido posteriormente e DEVE consumir a API.
4. **Persistência:** os dados DEVEM ser armazenados em banco de dados relacional (não em planilha/papel), com integridade entre casas, moradores, contas e pagamentos.
5. **Consistência financeira:** os cálculos de rateio e somas DEVEM ser exatos em centavos (sem perda por arredondamento).
6. **Simplicidade de uso:** fluxos comuns (lançar conta, marcar pago) DEVEM ser feitos em poucos toques, adequados a usuários não técnicos.
7. **Segurança básica:** acesso protegido por senha; dados não acessíveis publicamente.
8. **Escala:** otimizado para poucas casas (até ~5), mas sem impedir crescimento.
9. **API:** o backend DEVE expor uma API REST em JSON, documentada automaticamente (OpenAPI/Swagger do FastAPI), independente de frontend.
