# Creator Engine — Afiliados (operação de teste)

Linguagem do módulo de afiliados para decisão de manutenção de teste depois que o dinheiro já está no ar. Não cobre o Radar (escolha da oferta) nem o restante do Creator Engine.

## Language

**OfertaDecisao**:
Candidata no Radar, antes de gastar tráfego. Responde “vale testar?”.
_Avoid_: campanha, produto (quando o assunto é keep/kill de teste em andamento)

**ProdutoAfiliado**:
Oferta já em execução no catálogo. Agrega uma ou mais Campanhas. Permanece testável mesmo se uma Campanha for diagnosticada como erro e substituída por outra.
_Avoid_: campanha, oferta, OfertaDecisao

**Campanha**:
Uma campanha do Google Ads ligada a um ProdutoAfiliado (geo, estratégia, conta). É o grão do diagnóstico keep/kill. Pausar ou encerrar uma Campanha não implica, por si, que o produto é inviável.
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
