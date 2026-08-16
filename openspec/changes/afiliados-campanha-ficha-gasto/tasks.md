## 1. API de snapshot manual

- [x] 1.1 Criar `POST /api/afiliados/campanhas/[id]/snapshots` autenticado: body Zod (`dataSnapshot` date opcional default hoje, `gasto` number ≥ 0); 404 se campanha inexistente; 422 se gasto negativo
- [x] 1.2 Upsert por unique `(campanhaId, dataSnapshot)` (cria ou substitui o dia); atualizar `Campanha.dataUltimaAtualizacao`; chamar `recomputeProdutoRollups(produtoId)`
- [x] 1.3 Testes: primeiro gasto cria snapshot e rollup; regravação do mesmo dia substitui; datas distintas preservam histórico e rollup usa o latest

## 2. Ficha da campanha

- [x] 2.1 Page server `src/app/(dashboard)/afiliados/campanhas/[id]/page.tsx`: fetch campanha + produto pai + snapshots; 404 se não existir
- [x] 2.2 Client da ficha: formulário PATCH (nome Ads, geo, estratégia, papel, status, budgets, conta/nome conta, datas, link painel, moeda) + breadcrumb/link do produto no catálogo
- [x] 2.3 Bloco de gasto: label “acumulado até [data]”, input gasto + data (default hoje), POST snapshots, lista somente leitura dos snapshots (data, gasto) desc
- [x] 2.4 Incluir `AfiliadosMainNav` na ficha; marcar aba Catálogo ativa quando `pathname` começa com `/afiliados/campanhas`

## 3. Catálogo como índice

- [x] 3.1 Na linha expandida do `CatalogoClient`, cada campanha é `Link` para `/afiliados/campanhas/[id]`
- [x] 3.2 Após `+ Campanha` com sucesso, navegar para a ficha da campanha criada (usar o `id` do POST)

## 4. Navegação

- [x] 4.1 Reordenar `MAIN_TABS` em `afiliados-main-nav.tsx`: Contas (`/afiliados`), Radar, Catálogo
- [x] 4.2 Sidebar item Afiliados: `href: "/afiliados"` (lista de contas); `activePrefix` continua `/afiliados`

## 5. Verificação

- [x] 5.1 `npm test` passando (incluir os testes de snapshot)
- [ ] 5.2 Smoke manual: criar campanha no catálogo abre ficha; gravar gasto atualiza gasto do produto e widget; sidebar abre Contas com essa aba à esquerda
