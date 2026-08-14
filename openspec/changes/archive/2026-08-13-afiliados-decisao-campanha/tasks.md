## 1. Banco de Dados & Schema Prisma

- [x] 1.1 Adicionar modelos `OfertaDecisao`, `DecisionLogOferta`, os enums `StatusDecisaoOferta` e `CompletudeDados` ao `prisma/schema.prisma`
- [x] 1.2 Adicionar o campo `ofertaDecisaoId` no modelo `ProdutoAfiliado` no `prisma/schema.prisma`
- [x] 1.3 Executar migração do banco (`npx prisma db push`) e gerar client Prisma (`npx prisma generate`)

## 2. Lógica de Negócio, Parser CSV & Algoritmo de Scoring

- [x] 2.1 Criar utilitário de cálculo de Score de Priorização e classificação de completude de dados em `src/lib/afiliados/scoring.ts`
- [x] 2.2 Criar parser robusto de CSV em `src/lib/afiliados/csv-parser.ts` para sanitizar símbolos de moeda (`$`), porcentagens (`%`), converter nulos e realizar Upsert por nome da oferta
- [x] 2.3 Criar schemas Zod de validação em `src/lib/afiliados/schemas.ts`

## 3. Endpoints de API (Backend)

- [x] 3.1 Criar rotas GET e POST para gestão de ofertas em `src/app/api/afiliados/radar/route.ts`
- [x] 3.2 Criar rota PATCH/DELETE por ID em `src/app/api/afiliados/radar/[id]/route.ts`
- [x] 3.3 Criar rota de upload de CSV para importação em lote em `src/app/api/afiliados/radar/importar-csv/route.ts`
- [x] 3.4 Criar rota de transição "Go!" (aprovar e migrar para ContaTrafego) em `src/app/api/afiliados/radar/[id]/migrar-campanha/route.ts`

## 4. Componentes de Interface (UI Frontend)

- [x] 4.1 Atualizar navegação por abas (`Radar de Ofertas`, `Contas de Tráfego`, `Catálogo de Produtos`) no cabeçalho do módulo Afiliados
- [x] 4.2 Criar componente de Tabela do Radar com ordenação por Score/EPC/CPC e badges visuais em `src/components/afiliados/radar-tabela.tsx`
- [x] 4.3 Criar widget de Alocação de Capital para Testes em `src/components/afiliados/capital-allocation-widget.tsx`
- [x] 4.4 Criar modal de Upload de CSV com preview e opção de Upsert em `src/components/afiliados/modal-importar-csv.tsx`
- [x] 4.5 Criar modal de Ação "Go! Criar Campanha" para selecionar a `ContaTrafego` e gerar o `ProdutoAfiliado` em `src/components/afiliados/modal-migrar-campanha.tsx`
- [x] 4.6 Criar formulário de criação/edição manual de `OfertaDecisao` (incluindo bloco de dados do Google Ads)

## 5. Validação & Testes

- [x] 5.1 Testar importação real do arquivo `docs/afiliados/produtos.csv` garantindo que os 18 produtos sejam lidos, sanitizados e salvos com score correto
- [x] 5.2 Testar o fluxo de ponta a ponta: Importar CSV ➔ Editar dados de Google Ads ➔ Aprovar oferta ("Go!") ➔ Verificar criação de `ProdutoAfiliado` na `ContaTrafego` e alteração de status
