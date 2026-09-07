## Why

Depois do Go!, a oferta fica `EM_EXECUCAO` (fóssil correto), mas o widget do Radar ainda grita “Orçamento estourado sem decisão” com base em `ProdutoAfiliado.statusOperacional` legado — mesmo com o produto `PAUSADO` no catálogo, a fila já respondida ou nenhuma campanha no ar. Pausar o produto hoje não para as campanhas; o operador não tem um “parei o tráfego por agora, gasto conta, posso reativar”.

## What Changes

- Manter `OfertaDecisao.statusDecisao = EM_EXECUCAO` terminal. Não voltar a oferta para `PAUSADO`/`DESCARTADO`. O Radar deixa de oferecer essa edição e passa a mostrar uma **leitura derivada** (gasto real, se há tráfego, produto aberto vs pausado).
- Pausar uma campanha continua **não** pausando o produto (já especificado). Pausar o **produto** (`PAUSADO` ou `ARQUIVADO`) **SHALL** pausar campanhas `TESTANDO`/`ESCALANDO`. Reativar o produto **não** religa campanhas. Criar campanha em produto pausado/arquivado é rejeitado.
- O alerta “Orçamento estourado sem decisão” só dispara quando o teste **está no ar** (produto `ATIVO` + alguma campanha `TESTANDO`) **e** gasto > budget **e** não há `ItemFila` terminal da regra de teto para essas campanhas. Produto pausado, campanhas paradas ou fila já respondida **não** geram o alerta.
- Gasto histórico de produto pausado **continua** em `totalSpent` (implica no orçamento do período). `budgetTesteAlocado` de produto pausado/arquivado **sai** de `totalAllocated` (não reserva capital). `getActiveCapitalAllocation` deixa de filtrar por `statusOperacional` legado.
- Itens de fila `ABERTO`/`ADIADO` das campanhas pausadas no cascade do produto passam a `EXPIRADO` (a decisão foi pausar; a regra pode gerar de novo se o teste voltar).
- O Creator Engine **não** escreve no Google Ads — a pausa é registro operacional. A UI deixa isso explícito.

## Capabilities

### New Capabilities

- (nenhuma)

### Modified Capabilities

- `produtos-afiliados`: cascade produto→campanhas; reativar sem religar; bloquear campanha nova em produto pausado/arquivado.
- `capital-allocation-panel`: alocado/alerta passam a ler presença no catálogo + `Campanha.status` + fila; gasto histórico de pausado conta; copy do alerta só quando “sem decisão”.
- `afiliados-radar-decisao`: leitura derivada na linha convertida; modal sem Pausado/Descartado pós-Go!.
- `afiliados-fila-decisao`: expirar itens não-terminais no cascade de pausa do produto.
- `campanha-ficha`: log de status no cascade; criar campanha recusa produto não-`ATIVO`.

## Impact

- **API:** `PUT` de `ProdutoAfiliado.status` vira transação (campanhas + logs + fila). `POST` de campanha valida `produto.status`. `GET /api/afiliados/capital-allocation` muda critério de `allocations`/`alerts` (**BREAKING** semântico do payload do widget).
- **UI:** `CapitalAllocationWidget`, `RadarTabela` / `modal-oferta-form`, Catálogo (copy do status comercial), ficha de campanha (aviso Ads).
- **Lib:** `alertaOrcamentoEstourado`, `getActiveCapitalAllocation`, `mudarStatusCampanha`.
- **Docs:** `CONTEXT.md` — seta produto→campanhas; “sem tráfego agora” ≠ Descartado.
- **Fora:** Ads Scripts, ingestão, rollups de gasto, máquina `EM_EXECUCAO`.
