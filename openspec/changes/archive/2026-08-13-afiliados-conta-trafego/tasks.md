## 1. Schema e persistência

- [x] 1.1 Adicionar models/enums no `schema.prisma`: `ContaTrafego`, `ContaVinculadaTrafego`, `ProdutoAfiliado`, `ContaTrafegoProduto`, `VendaAfiliado` (+ enums de status/plataforma/origem conforme design)
- [x] 1.2 Estender `Credencial` com `contaTrafegoId` opcional (FK, índice, SetNull/Cascade alinhado ao design)
- [x] 1.3 Criar SQL idempotente `prisma/sql/` para banco existente + `db push` local e `prisma generate`
- [x] 1.4 (Opcional) Seed mínimo: 1 ContaTrafego + 1 produto exemplo sem credenciais reais

## 2. Credenciais — terceiro escopo

- [x] 2.1 Atualizar Zod/`src/lib/credenciais.ts` para escopos mutuamente exclusivos persona | ContaTrafego | global
- [x] 2.2 Estender `GET/POST/PUT` `/api/credenciais` com filtro e validação `contaTrafegoId`
- [x] 2.3 Garantir isolamento nas listagens de persona e Ferramentas (não vazar credenciais de ContaTrafego)
- [x] 2.4 Testes unitários do schema Zod de escopo (casos mistos → 422)

## 3. API ContaTrafego e contas vinculadas

- [x] 3.1 `GET/POST /api/afiliados` e `GET/PUT/DELETE /api/afiliados/[slug]` (CRUD ContaTrafego, slug único)
- [x] 3.2 API de contas vinculadas sob ContaTrafego (CRUD + isolamento por `contaTrafegoId`)
- [x] 3.3 Auth guard consistente com demais rotas do dashboard

## 4. API Produtos e vínculos

- [x] 4.1 CRUD `/api/produtos-afiliados` (catálogo: slug, plataforma, preço, comissão, links, status)
- [x] 4.2 Endpoints de associação/desassociação ContaTrafego ↔ Produto (junção + metadados de vínculo: tracking, ativo)
- [x] 4.3 Validar N:N (mesmo produto em duas ContaTrafego)

## 5. API Vendas/comissões

- [x] 5.1 CRUD `/api/vendas-afiliados` com `contaTrafegoId` obrigatório, produto opcional, `origem=MANUAL`, `externalId` opcional
- [x] 5.2 Agregação de totais (comissões aprovadas / período) para o hub
- [x] 5.3 Isolamento de listagem por ContaTrafego

## 6. UI — módulo Afiliados

- [x] 6.1 Sidebar: item **Afiliados** → `/afiliados`
- [x] 6.2 Página lista + `/afiliados/nova` (criação ContaTrafego)
- [x] 6.3 Hub `/afiliados/[slug]` com overview (totais) e section header (Contas | Produtos | Credenciais | Vendas)
- [x] 6.4 Seção Contas vinculadas (CRUD modal, padrão visual do app)
- [x] 6.5 Seção Produtos (listar associados, associar/criar, editar vínculo)
- [x] 6.6 Seção Credenciais reutilizando painel existente com escopo ContaTrafego
- [x] 6.7 Seção Vendas (lançamento manual + tabela + edição de status)
- [x] 6.8 Lista/CRUD de catálogo de produtos (`/afiliados/produtos` ou equivalente)

## 7. Analytics e fechamento

- [x] 7.1 Bloco mínimo em `/analytics`: totais de comissão afiliada (separado de métricas de persona)
- [x] 7.2 Smoke/Vitest cobrindo Zod de credenciais + happy path API ContaTrafego (conforme padrão do repo)
- [x] 7.3 Atualizar `.env.example`/docs só se houver variável nova (provável: nenhuma)
