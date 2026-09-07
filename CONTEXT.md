# Creator Engine — Afiliados (operação de teste)

Linguagem do módulo de afiliados para decisão de manutenção de teste depois que o dinheiro já está no ar. Não cobre o Radar (escolha da oferta) nem o restante do Creator Engine.

## Language

**OfertaDecisao**:
Candidata no Radar, antes de gastar tráfego. Responde “vale testar?”.
_Avoid_: campanha, produto (quando o assunto é keep/kill de teste em andamento)

**ProdutoAfiliado**:
Oferta já em execução no catálogo. Agrega uma ou mais Campanhas. Permanece testável mesmo se uma Campanha for diagnosticada como erro e substituída por outra. `status` é presença no catálogo (`ATIVO`/`PAUSADO`/`ARQUIVADO`): pausar o produto pausa campanhas `TESTANDO`/`ESCALANDO`; reativar o produto não religa campanhas; campanha nova só com produto `ATIVO`.
_Avoid_: campanha, oferta, OfertaDecisao; achar que pausar uma campanha pausa o produto

**Campanha**:
Uma campanha do Google Ads ligada a um ProdutoAfiliado (geo, estratégia, conta). É o grão do diagnóstico keep/kill. Pausar ou encerrar uma Campanha não implica, por si, que o produto é inviável. Pausa no Creator Engine não escreve no Google Ads.
_Avoid_: produto, oferta, “a campanha” como sinônimo do teste inteiro do produto

**Diagnóstico de Campanha**:
Leitura keep/kill/ajustar sobre uma Campanha a partir das métricas reais daquela campanha.
_Avoid_: status da oferta, score do Radar, viabilidade do produto

**Viabilidade do Produto**:
Leitura agregada: o produto continua fazendo sentido se existir Campanha lucrativa ou ainda em teste íntegro. Campanha em Falha de Execução não entra nessa leitura.
_Avoid_: misturar com Diagnóstico de Campanha; tratar “produto inviável” como sinônimo de “uma campanha pausada”

**Falha de Execução**:
Campanha cujo teste não foi íntegro (setup, tracking, LP, termo, configuração). Não é evidência contra a Viabilidade do Produto. Substituí-la por uma Campanha nova é o mesmo teste do produto, não um produto novo.
_Avoid_: teto excedido, “pausar” genérico, Falha de Mercado

**Falha de Mercado**:
Campanha cujo teste foi íntegro e não pagou o corte (teto atingido sem retorno suficiente). É evidência contra a Viabilidade do Produto.
_Avoid_: erro de campanha, Falha de Execução

**Fila de Decisão**:
Mecanismo canônico de decisão operacional pendente. O operador confirma, adia ou dispensa; nenhuma regra aplica keep/kill/escala sozinha.
_Avoid_: alerta, notificação, “decida agora” implícito, fila de publicação

**ItemFila**:
Unidade da Fila de Decisão. Aponta para uma Campanha (ou, no Radar, uma OfertaDecisao), com a regra que o gerou e um ciclo de vida (aberto, adiado, aplicado, dispensado, expirado).
_Avoid_: ticket, alerta, tarefa; misturar com Diagnóstico de Campanha (a leitura não é o pedido de ação)

**Não-Reconciliado**:
Linha de ingestão cujo par (conta Ads + nome da campanha) não casa com nenhuma Campanha. Fica na bandeja até o operador vincular — o sistema não cria Campanha.
_Avoid_: erro de ingestão, campanha órfã, auto-criar campanha

**Sem tráfego agora**:
Leitura derivada no Radar para oferta já convertida (`EM_EXECUCAO`): não há campanha `TESTANDO`/`ESCALANDO`. Não é `Descartado` e não mexe em `statusDecisao`.
_Avoid_: Descartado; pausar ou reabrir a oferta convertida

**Orçamento estourado sem decisão**:
Alerta do widget de capital (não é a Fila). Só vale com produto `ATIVO`, campanha `TESTANDO`, gasto > budget e sem `ItemFila` terminal `teste.tetoComissao`. Some depois de pausar, de não ter teste no ar, ou de responder a fila.
_Avoid_: tratar o alerta como item da Fila; manter o alerta depois de pausar ou dispensar

**Palavra-chave (índice de campanha)**:
Identidade de anúncio no Google Ads de uma `Campanha` (texto + correspondência `EXATA`/`FRASE`/`AMPLA`), com lance % e métricas acumuladas Ads. Não é demanda de busca.
_Avoid_: Termo, SerieTermo, “o termo da campanha”

**Termo**:
Demanda de busca do Radar (`Termo`/`SerieTermo`), ligada a `OfertaDecisao` ou `ProdutoAfiliado` — nunca a `Campanha`.
_Avoid_: palavra-chave da ficha; achar que volume de busca é métrica do índice

**Vigente**:
Última linha temporal de um índice (`ORDER BY capturadaEm DESC`). A ficha e o comparativo mostram só o vigente. Trocar +10% → +15% cria linha nova; a anterior permanece queryable.
_Avoid_: update in place; “histórico” como se a tela listasse todas as linhas

**Índice Ads**:
CPC, cliques, impressões, vendas/conversões e custo de conversão na linha do índice — acumulado do índice desde o início da campanha, reportado pelo Ads. Não substitui o rollup por `VendaAfiliado`.
_Avoid_: usar métrica do índice como ROI/CPA de keep/kill; fundir com `Campanha.roiReal`/`cpaReal`
