# Design: Radar & Decisão de Ofertas no Módulo Afiliados

## Context

O módulo de Afiliados no `creator-engine` gerencia Contas de Tráfego (`ContaTrafego`) e Produtos (`ProdutoAfiliado`). Atualmente, o cadastro de produtos exige que o usuário já tenha decidido qual produto rodar. Falta uma camada de decisão analítica pré-campanha (baseada em `docs/mapeamento-campos-decisao-campanha.md` e dados do `docs/afiliados/produtos.csv`) para comparar produtos de várias redes (BuyGoods, ClickBank, Mediascalers, Hotmart, Braip, etc.) e números de leilão do Google Ads.

## Goals / Non-Goals

**Goals:**
- Criar a entidade `OfertaDecisao` e `DecisionLogOferta` no Prisma com suporte a todas as 8 dimensões de dados.
- Implementar o parser CSV para importação em lote (`produtos.csv`) com higienização automática (`$`, `%`, números, listas de plataformas) e Upsert por nome da oferta.
- Implementar algoritmo transparente de **Score de Priorização (0-100)** e badge de `completudeDados`.
- Implementar fluxo de migração "Go! Criar Campanha" que cria o `ProdutoAfiliado` vinculado à `ContaTrafego` escolhida e atualiza o status para `EM_EXECUCAO`.
- Desenvolver a interface React do Radar em `/afiliados/radar` e integrar abas de navegação no `/afiliados`.

**Non-Goals:**
- Scraping automático em tempo real de redes de afiliados ( ClickBank, BuyGoods, etc.).
- Integração direta com API do Google Ads Keyword Planner (dados de CPC/Volume são inseridos via CSV ou formulário).

## Decisions

### 1. Modelo Separado (`OfertaDecisao`) vs Estender `ProdutoAfiliado`
- **Decisão**: Modelo separado `OfertaDecisao` para garimpo/análise, com relação opcional 1:N / FK `ofertaDecisaoId` em `ProdutoAfiliado` no momento do lançamento.
- **Razão**: Separa responsabilidades de análise de mercado/leilão pré-campanha da gestão de campanhas e vendas ativas. Preserva histórico mesmo se o produto em execução for alterado ou desativado.

### 2. Formato de Armazenamento de Plataformas
- **Decisão**: `plataformas` armazenado como `String[]` no Postgres (`String[]` no Prisma).
- **Razão**: O CSV traz ofertas presentes em múltiplas redes simultaneamente (ex: `"ClickBank, BuyGoods, ClicksAdv"`). Um array nativo facilita buscas e exibição de badges sem acoplar uma tabela relacional excessiva.

### 3. Parser de CSV & Upsert
- **Decisão**: Parser no servidor em TypeScript (`src/lib/afiliados/csv-parser.ts`) usando delimiter `;` ou `,`, limpando cifrões (`$`), percentuais (`%`) e convertendo nulos. Usa `prisma.ofertaDecisao.upsert` por `nome`.
- **Razão**: Garante resiliência ao importar arquivos brutos exportados de ferramentas externas, sem exigir formatação manual prévia pelo usuário.

### 4. Fórmula do Score de Priorização (0 - 100)
- **Decisão**:
  ```ts
  score = (
    w_epc * epc_norm +
    w_refund * (100 - refund_pct) +
    w_tendencia * tendencia_score +
    w_comissao * comissao_norm -
    w_penalidade_incompleto * penalidade_dados
  )
  ```
  `completudeDados` é derivado automaticamente: `COMPLETO` (dados de leilão + dados de rede), `PARCIAL` (apenas dados de rede), `INCOMPLETO` (faltando EPC ou comissão).
- **Razão**: Mantém a pontuação objetiva e comparável, punindo ofertas sem dados críticos para evitar falsos positivos.

## Risks / Trade-offs

- **[Risco]** Nomes de ofertas no CSV variando ligeiramente entre exportações (ex: "LipoBliss" vs "LipoBliss - BuyGoods") gerando duplicadas no Upsert.
  - *Mitigação*: Normalização de string no parser (trim, case-insensitive check opcional ou aviso visual de nomes similares).
- **[Risco]** Sobrescrever dados preenchidos manualmente (ex: Google Ads CPC) ao reimportar o CSV da rede.
  - *Mitigação*: O Upsert do CSV só atualiza os campos presentes na planilha, preservando campos de leilão/Google Ads já cadastrados.

## Migration Plan

1. Rodar `npx prisma db push` ou `npx prisma migrate dev` para criar as tabelas `oferta_decisao` e `decision_log_oferta` e adicionar `ofertaDecisaoId` em `produto_afiliado`.
2. Criar utilitários de parser e rotas API em `src/app/api/afiliados/radar`.
3. Adicionar componentes de UI do Radar e atualizar a página `/afiliados`.
