# 20 — Upload de conversões offline para o Google Ads via Ads Scripts

Type: grilling
Status: closed
Blocked by: 04, 15
Assignee: claude

## Question

Achado do ticket 03 que abre um caminho não previsto no charting:
`AdsApp.bulkUploads().newCsvUpload(cols, {timeZone}).forOfflineConversions()` — **Ads Scripts fazem
upload de conversões offline**, sem developer token e sem a API oficial. Como Scripts já é o caminho
primário de ingestão, o mesmo mecanismo serve na direção contrária.

Se adotado, muda a arquitetura de forma substancial: checkout e venda confirmada viram **conversion
actions nativas do Google Ads**, e voltam para o Creator Engine pelo mesmo caminho dos outros grãos —
em vez de existirem como entidade paralela. O ticket 04 fica mais simples, o ticket 15 ganha um
consumidor, e o Google Ads passa a otimizar contra a conversão que realmente importa (venda
confirmada da rede) em vez de contra o pixel da bridge.

### A pergunta de escopo, que vem primeiro

O mapa travou: *"o sistema recomenda, nunca escreve no Google Ads"*. Isso foi decidido sobre
**ajustes de lance, budget e pausa de termo** — o loop de controle. Enviar conversão **é** escrita,
mas de natureza diferente: não decide nada pelo operador, alimenta dado. Antes de qualquer coisa,
confirmar com o operador se a fronteira travada cobre este caso ou não. Se cobrir, este ticket vira
Out of scope inteiro.

### Se estiver em escopo, decidir

- **O que é enviado**: só checkout, só venda confirmada, ou os dois como conversion actions distintas?
  ClickBank já empurra três actions nativamente (Order Form Impression, Initial Purchase, Upsell) —
  para essa rede o upload seria redundante e possivelmente duplicaria conversão.
- **Deduplicação contra o que a rede já envia.** A tripla natural é (click ID, conversion_date_time,
  conversion_action). Redes com integração nativa precisam ser excluídas do upload — decidir se isso
  é config por rede ou detecção.
- **A janela de 90 dias após o último clique é dura.** Venda confirmada que chega depois disso
  simplesmente não sobe. Definir o que acontece: perde silenciosamente, ou registra a lacuna?
  Isso interage com o atraso checkout→venda, que o ticket 03 estabeleceu ser **propriedade observada**
  e não configurável — se o atraso medido de uma rede se aproximar de 90 dias, o upload é inviável
  para ela e isso precisa ser visível.
- **Retratação por reembolso**: `RETRACTION` prefere `order_id` a `gclid`+timestamp. Depende de
  gravar `order_id` desde o início (ticket 15). CartPanda não expõe order id — decidir o que fazer lá.
- **Onde o CSV é montado**: o Creator Engine gera e o Script busca, ou o Script monta a partir de um
  endpoint de leitura? Colunas obrigatórias: `Google Click ID`, `Conversion Name`, `Conversion Time`,
  mais a linha `Parameters:TimeZone=`.
- **Risco de otimização**: alimentar o Google Ads com conversão confirmada muda o comportamento do
  Smart Bidding. Isso é desejado durante escala, mas durante teste pode atrapalhar (volume baixo
  demais para o algoritmo aprender). Decidir se o upload é ligado por fase da campanha.

### Contexto que reforça o caminho por Scripts

Desde **15/06/2026** — data já passada — requisições `UploadClickConversion` da **API oficial** falham
se o developer token nunca tiver enviado uploads offline antes; a doc manda migrar para a Data Manager
API. Ou seja, a via da API oficial ficou mais estreita, não mais larga, e o caminho por Scripts é hoje
o de menor atrito.

## Answer

**Escopo: fica dentro do ticket, não é Out of scope.** A fronteira "o sistema recomenda, nunca escreve
no Google Ads" travada no charting cobre o loop de controle (ajustes de lance/budget/pausa que decidem
algo pelo operador). Enviar conversão confirmada é dado, não decisão — mesma natureza do envelope de
ingestão do ticket 14, só na direção contrária. Confirmado com o operador antes de prosseguir, como o
ticket exigia.

**O que é enviado: só venda confirmada (`VendaAfiliado`, `status = APROVADA`) — checkout não sobe.**
Achado que resolve isso de graça: o ticket 04 já estabeleceu que, quando `ConversionPoint =
VALID_CC_SUBMIT`, `checkoutsCount` é **lido de volta** do Ads via o envelope de ingestão (ticket 14)
— "sem segunda coleta" só faz sentido porque o checkout já é conversão nativa, tempo real, do lado do
Ads (tag na página). Venda confirmada é o oposto: só existe pro Creator Engine depois do webhook da
rede, dias depois do clique, evento que o Ads nunca teria visibilidade sem upload offline. Confirma a
observação do próprio ticket de que o ticket 04 fica "mais simples" — checkout não muda em nada.

**Exclusão por rede é config declarativa, nunca detecção automática de duplicata.** Redes com
integração nativa (ClickBank empurra três actions nativamente — Order Form Impression, Initial
Purchase, Upsell) ficam marcadas como excluídas do upload por config, consistente com o princípio já
travado nos tickets 02/14 de não tentar reconciliar entre fontes depois do fato.

**Janela de 90 dias: nunca silenciosa.** `VendaAfiliado` ganha `statusUploadAds`
(`ENVIADA`/`FORA_DA_JANELA`/`EXCLUIDA_REDE_NATIVA`/`PENDENTE`), gravado no resultado de cada tentativa
de upload — reusa o padrão já estabelecido nos tickets 03/13/14 de tornar fato observado e visível em
vez de comportamento invisível. Se `FORA_DA_JANELA` se acumular numa rede específica, fica visível
olhando as vendas dela, sem precisar de regra de alerta nova agora.

**Retratação por reembolso: `orderId` quando presente, senão `(tipoIdentificador, valorIdentificador)`
+ timestamp.** Sem exceção hardcoded por rede — o mecanismo só reage ao que está preenchido em cada
venda (CartPanda, que não expõe order id, cai automaticamente no fallback).

**Onde o CSV é montado: Creator Engine gera pronto, Script só busca e repassa.** Endpoint de leitura
serve o CSV já formatado (colunas `Google Click ID`/`order_id`, `Conversion Name`, `Conversion Time`,
mais a linha `Parameters:TimeZone=`); o Script chama `AdsApp.bulkUploads().newCsvUpload()` direto com
o texto recebido. Centraliza a formatação sensível a detalhe (mesma lição do achado do CSV do Keyword
Planner no ticket 14: encoding/separador/locale quebram fácil) em TypeScript testável, em vez de
montar string dentro do Apps Script.

**Toggle por fase da campanha: desligado em `TESTANDO`, ligado em `ESCALANDO` por padrão.** Evita
alimentar o Smart Bidding com sinal ruidoso quando o volume de vendas confirmadas ainda é baixo demais
pra ser útil; liga na fase em que o volume já existe e o objetivo é otimizar contra a conversão real.
Guardado no mesmo mecanismo genérico já decidido no ticket 07 — `LimiarGlobal` (chave+Json global) com
override em `ProdutoAfiliado.limiaresOverride` — não um campo booleano hardcoded.

**Schema novo decidido aqui** (aplicar junto da redação da OpenSpec change): `VendaAfiliado.statusUploadAds`
(enum `ENVIADA`/`FORA_DA_JANELA`/`EXCLUIDA_REDE_NATIVA`/`PENDENTE`); chave nova em `LimiarGlobal` para
o toggle de fase; flag de exclusão nativa por rede (provável campo em `ContaTrafego` ou tabela de
redes, forma exata fica pra implementação).

Não desbloqueia nenhum ticket aberto — 17 segue preso a 23; 23 já estava livre. Nenhum ticket fechado
precisa reabrir; confirma o que o ticket 04 já antecipava (fica mais simples, não muda).
