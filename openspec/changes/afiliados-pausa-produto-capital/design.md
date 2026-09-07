## Context

D8 (`afiliados-ciclo-teste-escala`) separou três máquinas: `OfertaDecisao.statusDecisao` (vale testar? `EM_EXECUCAO` terminal no Go!), `ProdutoAfiliado.status` (presença no catálogo) e `Campanha.status` (keep/kill). A spec só cobriu a seta campanha→produto (pausar campanha não pausa produto). O write-path inverso nunca existiu.

`getActiveCapitalAllocation` e `alertaOrcamentoEstourado` ainda leem `ProdutoAfiliado.statusOperacional` (deprecated). O copy “Orçamento estourado sem decisão” dispara com gasto > budget + campo legado `TESTANDO`, sem olhar catálogo, campanhas no ar nem `ItemFila`. O modal do Radar ainda oferece Pausado/Descartado numa oferta convertida — a API recusa.

O operador precisa de três situações distintas, todas reversíveis (exceto `ENCERRADO` / `DESCARTADO` pré-Go!):

1. Pausar/encerrar uma campanha e criar outras no mesmo produto `ATIVO`.
2. Pausar o produto ⇒ campanhas `TESTANDO`/`ESCALANDO` pausam; gasto histórico conta; pode reativar depois.
3. No Radar, a oferta convertida continua `EM_EXECUCAO` e mostra leitura: gasto real, se há tráfego, produto aberto vs pausado.

## Goals / Non-Goals

**Goals:**

- Seta assimétrica: campanha ↛ produto; produto → campanhas (`PAUSADO`).
- Reativar produto não religa campanha. Campanha nova só em produto `ATIVO`.
- Alerta “sem decisão” só com teste no ar + gasto > budget + sem `ItemFila` terminal de teto.
- Gasto de pausado entra em `totalSpent`; budget de pausado sai de `totalAllocated`.
- Leitura derivada no Radar; oferta intocada. Modal sem Pausado/Descartado pós-Go!.
- Cascade expira fila aberta das campanhas afetadas.

**Non-Goals:**

- Não escrever no Google Ads (pausa é registro). Sem Ads Script de pausa nesta change.
- Não reabrir `EM_EXECUCAO`. Não `DESCARTAR` oferta convertida.
- Não encerrar campanha no cascade (`ENCERRADO` + motivo continua keep/kill na ficha).
- Não religar campanhas ao reativar produto.
- Não unificar os dois tetos (budget alocado vs `min(comissão, 100)`). O alerta de capital continua no budget do produto.

## Decisions

### D1 — Cascade só na descida, via `mudarStatusCampanha`

**Decisão:** `PUT` `status` ∈ {`PAUSADO`,`ARQUIVADO`} numa transação: cada campanha `TESTANDO`/`ESCALANDO` → `PAUSADO` por `mudarStatusCampanha` (log com motivo `produto pausado` / `produto arquivado`). `ENCERRADO` fica. `ATIVO` de novo não toca campanha.

**Alternativas:** religar todas no ATIVO — interruptor perigoso. Encerrar no cascade — mistura pausa reversível com Falha de Mercado/Execução.

### D2 — Alerta “sem decisão” é conjunção, não gasto > budget

**Decisão:** `alertaOrcamentoEstourado` (produto) é true só se:

1. `ProdutoAfiliado.status = ATIVO`
2. existe `Campanha.status = TESTANDO` nesse produto
3. `gastoTotalAcumulado > budgetTesteAlocado` (budget > 0)
4. nenhuma dessas campanhas `TESTANDO` tem `ItemFila` terminal (`APLICADO`/`DISPENSADO`/`EXPIRADO`) com `regra = teste.tetoComissao`

`ESCALANDO` continua sem este alerta (já nas regras de mensuração). `statusOperacional` deixa de ser lido.

**Alternativas:** alertar sempre que gasto > budget — é o bug atual. Alertar só se existe item `ABERTO` — falha no intervalo em que o budget estourou e a regra de teto ainda não rodou. A cláusula 4 cobre “já respondi a fila”.

### D3 — Capital: gasto conta, alocado de pausado libera

**Decisão:** `totalAllocated` = soma de `budgetTesteAlocado` de produtos `ATIVO` com alguma campanha `TESTANDO` ou `ESCALANDO`. `totalSpent` = soma de `gastoTotalAcumulado` de **todo** produto que teve gasto no período de leitura atual (inclui `PAUSADO`/`ARQUIVADO`). Lista do widget: linhas ativas + linhas pausadas com gasto (sem triângulo de alerta), para o gasto continuar visível.

**Alternativas:** zerar gasto de pausado no widget — mente o orçamento. Manter budget reservado — trava capital em teste parado.

### D4 — Fila: cascade → `EXPIRADO`

**Decisão:** itens `ABERTO`/`ADIADO` com `tipoAlvo=CAMPANHA` e `alvoId` nas campanhas pausadas pelo produto → `EXPIRADO`. Dedup já permite novo item se a campanha voltar a `TESTANDO` e a regra disparar.

**Alternativas:** `DISPENSADO` — parece recusa explícita do operador. Deixar aberto — o cheiro do alerta que não some.

### D5 — Radar: leitura, não status

**Decisão:** payload da oferta convertida ganha leitura derivada (não coluna persistida), p.ex. `{ trafego: "NO_AR" | "SEM_TRAFEGO", produtoStatus, gasto, budget }`. Badge `EM_EXECUCAO` permanece. Select de status no modal fica somente leitura (ou sem Pausado/Descartado) quando já convertida. Atalhos para catálogo/ficha.

Não há `statusDecisao` novo.

### D6 — Campanha nova recusa produto não-ATIVO

**Decisão:** `POST /api/afiliados/produtos/[id]/campanhas` (e o `+ Campanha` do modal) retorna 422 se `produto.status ≠ ATIVO`. Situação 1 (produto aberto, irmãs pausadas) continua válida.

### D7 — Aviso Ads na UI, sem integração

Copy na pausa de produto e na ficha: o Creator Engine não pausa a campanha no Google Ads. Fora de escopo automatizar.

## Risks / Trade-offs

- **[Ads continua gastando]** → Mitigação: aviso explícito; não fingir que o cascade corta o gasto do dia seguinte.
- **[Arquivar vs pausar]** → Mesmo cascade. Arquivado também bloqueia campanha nova. Distinção é catálogo (sumir da lista ativa), não tráfego.
- **[Item expirado e operador queria só pausar uma campanha]** → Cascade só no PUT do produto. Pausar uma campanha na ficha não expira as irmãs.
- **[Spec de capital no main ainda fala OfertaDecisao]** → Esta change reescreve o requisito no delta; archive alinha o main.
- **[Dois tetos]** → Alerta de capital ≠ item `teste.tetoComissao`. Aceito; cláusula 4 só olha a regra de teto como “já houve decisão de keep/kill”.

## Migration Plan

1. Sem migration de schema. Campo legado `statusOperacional` permanece, sem consumidores novos.
2. Deploy do PUT transacional + GET de capital + UI.
3. Sem backfill. Produtos `PAUSADO` com campanhas `TESTANDO` passam a consistentes no **próximo** PUT de status (ou script opcional idempotente fora desta change).
4. Rollback: reverter API/UI; dados de campanha já pausados pelo cascade ficam `PAUSADO` (correto operacionalmente).

## Open Questions

Nenhuma bloqueante. Liberar alocado e expirar fila foram fechadas nesta exploração para não travar o apply.
