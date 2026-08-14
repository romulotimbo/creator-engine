## Why

O Creator Engine administra personas digitais e redes sociais, mas a operação de **marketing de afiliados** (ex.: Power Energi na Braip) não tem lugar próprio: o funil atual é 1:1 com persona e um único `linkAfiliado`. Contas de anúncio, produtos de várias plataformas afiliadas, credenciais desse contexto e tracking de vendas/comissões ficam fora do sistema ou forçados em personas fantasma.

O hub operacional do dia a dia é a **conta de tráfego/anúncios** — nela concentram-se vários produtos, de várias plataformas afiliadas, e contas vinculadas (como as contas de plataforma numa persona). Personas permanecem intactas; Ferramentas global continua sendo o escopo compartilhado.

## What Changes

- Novo módulo **Afiliados** (UI hub por conta de tráfego), paralelo a Personas — sem clonar schema/UX de conteúdo (roteiros, calendário, métricas de seguidores)
- Entidade central **ContaTrafego** (slug, nome, plataforma de ads, status, observações) como hub contextual
- **Contas vinculadas** à ContaTrafego (afiliado Braip/Monetizze/etc., e-mail, proxy, pixel, etc.) — padrão análogo a `ContaPlataforma` da persona
- Catálogo de **ProdutoAfiliado** (oferta, plataforma afiliada, preço, comissão %, links) com vínculo N:N a ContaTrafego (mesmo produto em mais de uma conta de tráfego é permitido — testes de estratégia/mercado)
- **Credenciais** com terceiro escopo: `contaTrafegoId` (além de persona e global/ferramenta); o que é só da conta fica nela; o compartilhado permanece em `/ferramentas`
- **Tracking manual** de vendas/comissões (valor, data, produto, conta de tráfego, plataforma afiliada, status); automação n8n/webhooks fica fora desta change (gancho futuro)
- P&L / listagens financeiras e analytics passam a enxergar receitas/comissões de ContaTrafego sem quebrar o eixo Persona
- Sidebar: entrada **Afiliados** (ou equivalente) na seção Creator Engine / nova seção operacional
- Personas, FunilMonetizacao atual e Ferramentas global **não são removidos**; funil de persona continua como está (monetização da persona), sem migração obrigatória nesta change

## Capabilities

### New Capabilities

- `afiliados-conta-trafego`: CRUD e hub de ContaTrafego, contas vinculadas, vínculo com produtos e navegação do módulo
- `produtos-afiliados`: catálogo de produtos/ofertas afiliadas, multiplataforma (Braip, Monetizze, etc.), associação a uma ou mais ContaTrafego
- `vendas-comissoes-afiliados`: registro manual de vendas/comissões por ContaTrafego (± produto), com resumo no hub; automação adiada

### Modified Capabilities

- `credenciais-ferramentas`: terceiro escopo de credencial amarrado a ContaTrafego (isolado de persona e de global)
- `analytics-reports`: incluir eixo ContaTrafego / comissões afiliadas nos alertas ou agregações relevantes sem confundir com seguidores de persona

## Impact

- **Schema Prisma:** novos models (`ContaTrafego`, contas vinculadas, `ProdutoAfiliado`, junção ContaTrafego↔Produto, `VendaAfiliado`/`ComissaoAfiliado`); `Credencial.contaTrafegoId` opcional; possível extensão de `Receita`/`Custo` ou série financeira própria do módulo
- **UI:** `/afiliados`, `/afiliados/nova`, `/afiliados/[slug]` (+ seções contas, produtos, credenciais, vendas); sidebar
- **API:** `/api/afiliados/*`, `/api/produtos-afiliados/*`, `/api/vendas-afiliados/*`; extensão de `/api/credenciais` para escopo conta de tráfego
- **Lib:** validação Zod de escopos em `src/lib/credenciais.ts`; utils de labels/status
- **Deploy:** SQL idempotente em `prisma/sql/` + `db push` no VPS; Personas e Ferramentas inalterados no comportamento atual
- **Fora de escopo:** webhooks Braip/n8n, clone de Personas, posts/calendário no módulo afiliados, migração automática do `FunilMonetizacao` existente
