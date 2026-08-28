# 16 — Reconciliar as máquinas de estado (Oferta × Produto × Campanha)

Type: grilling
Status: resolved
Blocked by: —

## Question

O ciclo radar → teste → escala atravessa **três entidades com estados que se sobrepõem** e nenhuma
regra ligando-os:

- `OfertaDecisao.statusDecisao`: `GARIMPO | ANALISE | APROVADO_TESTE | EM_EXECUCAO | PAUSADO | DESCARTADO`
- `ProdutoAfiliado.status`: `ATIVO | PAUSADO | ARQUIVADO` **e** `ProdutoAfiliado.statusOperacional`:
  `TESTANDO | ESCALANDO | PAUSADO | ENCERRADO`
- `Campanha.status`: `TESTANDO | ESCALANDO | PAUSADO | ENCERRADO`

`EM_EXECUCAO` na oferta e `TESTANDO` no produto dizem coisas parecidas em lugares diferentes. Produto
tem dois campos de status. E `CONTEXT.md` já estabelece que Diagnóstico de Campanha e Viabilidade do
Produto são leituras distintas — o modelo precisa refletir isso em vez de duplicar enums.

Decidir:

- **Onde o ciclo de vida mora.** A campanha é o grão do keep/kill (`CONTEXT.md`) — então
  `statusOperacional` do produto é **derivado** das campanhas, não editável à mão? Ou os dois são
  independentes e significam coisas diferentes?
- **`ProdutoAfiliado.status` vs `statusOperacional`**: um deles é redundante? O que cada um responde?
- **Fim de linha da `OfertaDecisao`**: quando a oferta vira produto (`ofertaDecisaoId` já existe),
  o estado da oferta congela ou continua espelhando a execução?
- **Falha de Execução vs Falha de Mercado** (`CONTEXT.md`) não têm representação nenhuma hoje.
  Viram estado, campo de motivo no encerramento da campanha, ou entidade de diagnóstico? Essa
  distinção é o que impede uma campanha mal configurada de contaminar a Viabilidade do Produto —
  e também o que impede o prior do Radar de aprender lição errada.
- **Histórico**: `PersonaStatusLog` existe como precedente de log de transição. Vale um equivalente
  para campanha/produto?

## Answer

**Onde o ciclo de vida mora** — não reaberto aqui: já estava fechado no ticket 09
(`Campanha.status` é o grão canônico do corte teste↔escala; `ProdutoAfiliado.statusOperacional`
deprecado). Este ticket reconcilia o resto do quadro em cima dessa decisão.

**`ProdutoAfiliado.status` (`ATIVO | PAUSADO | ARQUIVADO`) não é redundante** — muda de papel.
Deixa de significar fase de teste (isso agora é 100% da campanha) e passa a significar só
**presença no catálogo operacional**, ortogonal ao estado de qualquer campanha individual:
`ATIVO` = produto sob acompanhamento do time (tem campanha viva ou é candidato a campanha nova),
`PAUSADO` = ninguém está tocando agora mas pode voltar, `ARQUIVADO` = fora do catálogo, não recebe
campanha nova. Um produto pode estar `ATIVO` com todas as campanhas atuais `ENCERRADO`, porque o
próximo teste ainda não começou.

**`OfertaDecisao.statusDecisao` congela na conversão.** Quando `ProdutoAfiliado.ofertaDecisaoId` é
setado, o status da oferta para de ser tocado — `EM_EXECUCAO` vira terminal de fato. `PAUSADO` e
`DESCARTADO` na oferta só são alcançáveis **antes** da conversão (radar descartou sem nunca virar
produto). Justificativa: `CONTEXT.md` já proíbe misturar vocabulário de oferta com o de
campanha/produto quando o assunto é keep/kill de teste em andamento — deixar a oferta espelhar a
execução duplicaria sinal que já vive em `ProdutoAfiliado.status`/`Campanha.status`.

**Falha de Execução vs Falha de Mercado vira campo estruturado, não anotação.** Novo campo
`Campanha.motivoEncerramento`, enum `FALHA_EXECUCAO | FALHA_MERCADO`, nullable — `null` em
`TESTANDO`/`ESCALANDO`, preenchido (na prática obrigatório) quando `status` entra em
`PAUSADO`/`ENCERRADO`. Vive na própria `Campanha` (não só no log de transição) porque é um fato
estável sobre aquela campanha específica e a leitura de Viabilidade do Produto precisa filtrar por
ele direto (excluir Falha de Execução do cálculo agregado), sem depender de join em histórico.

**Histórico: `CampanhaStatusLog`, só para `Campanha`.** Mesmo formato do `PersonaStatusLog`
(`campanhaId`, `status`, `motivoEncerramento?`, `data`) — carrega o motivo da entrada acima quando
presente. Sem log equivalente em `ProdutoAfiliado` (status virou bookkeeping de catálogo de baixa
frequência, `updatedAt` já cobre) nem em `OfertaDecisao` (congela na conversão; a única
movimentação de status relevante é pré-conversão, escopo do ciclo do radar, não deste).
