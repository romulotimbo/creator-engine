# 03 — Evento de checkout e postback nas redes de afiliado

Type: research
Status: resolved
Blocked by: —

## Question

Metade das regras de teste depende de **contar checkouts** ("comissões até US$60 exigem ao menos
1 checkout"; "até US$80, 100% da comissão apenas com 2 checkouts"; "acima de US$100, o primeiro
checkout deve aparecer entre 50% e 60% da comissão gasta"). Hoje nada no sistema conta checkouts.

Levantar, para as redes efetivamente em uso (BuyGoods, GuruMedia, Mediascalers, MaxWeb, ClickBank,
Hotmart/Braip/Monetizze conforme o enum `PlataformaAfiliado`):

- Existe evento de **checkout / CC submit / initiate checkout** exposto ao afiliado, distinto da
  venda aprovada? Por postback S2S, por pixel, ou só no relatório do painel?
- O postback carrega **`gclid`** ou **subid/parâmetro customizado** que permita amarrar o evento à
  campanha de origem? Isso decide se `VendaAfiliado` consegue `campanhaId` automaticamente (ticket 15).
- É possível fazer a rede disparar conversão de volta para o **Google Ads** (conversão importada),
  de modo que o checkout apareça no próprio relatório de Ads e chegue via Ads Scripts?
- Qual o **atraso típico** entre checkout e confirmação de venda, e como cada rede expõe
  refund/chargeback.

Saída: para cada rede, se o checkout é obtenível automaticamente, semi-automaticamente ou só manual.
Insumo direto dos tickets 04 e 15.

## Asset

Achados da pesquisa, com URL em cada afirmação e marcação explícita de NÃO CONFIRMADO onde só havia
fonte secundária: `../research/03-checkout-postback-redes.md` (754 linhas, com tabela por rede e
seção de lacunas listando o que exige login).

## Answer

**A capacidade varia radicalmente entre redes — de "resolvido de fábrica" a "inexistente".** Nenhuma
regra de checkout pode assumir disponibilidade uniforme; o modelo precisa de degradação por rede.

**ClickBank é a única rede em que a documentação pública fecha o ciclo inteiro.** Tem *Order Form
Impression* (= initiate checkout) e *AddPaymentInfo* como eventos de primeira classe **para o papel
afiliado**, aceita `gclid` como parâmetro nomeado no HopLink, e tem integração nativa que empurra três
conversion actions de volta ao Google Ads via Conversions API em tempo real (Order Form Impression,
Initial Purchase, Upsell Purchase), exigindo auto-tagging ligado. É exatamente a regra de contagem
que o operador precisa, **sem construir nada**.

**CartPanda foi a surpresa positiva:** S2S Postback em visão Afiliado com exatamente três eventos —
`initiate_checkout`, `initial_sale`, `upsell` — e `{cid}` desenhado para click ID. O contrato de
placeholders é quase idêntico ao da Digistore24, então **um único adapter serve às duas**.

**MaxWeb** nomeia *Purchase* e *Checkout Visit* no FAQ oficial; **BuyGoods** confirma "checkout visits"
em Offer Pixels e um slot de Funnel Pixel chamado "Checkout". Ambas capturam `gclid` por script próprio
e têm pixel Google Ads via API com OAuth — **mas a doc pública só nomeia "Purchase" como Event type
do pixel Google**. Checkout chegando ao relatório do Ads por essa via ficou **NÃO CONFIRMADO**.

**Digistore24 não tem evento de checkout** — a tabela de eventos do IPN é fechada
(payment/refund/chargeback/rebill) e nada dispara na abertura do order form. Em compensação tem o
melhor contrato de click ID: `cid` + `sid1..sid5` no promolink, `{cid}` no postback.

**GuruMedia, Mediascalers e SmartADV rodam Everflow.** A capacidade da plataforma está confirmada
(postback tipo Event, sub1–sub10, integração Google Ads para partners com gclid); **se as ofertas
expõem evento de checkout, não** — depende do anunciante, não da plataforma. GuruMedia não publica
nenhuma documentação de afiliado.

**AdCombo é o pior caso**: `adcombo.com/faq` retorna 403 sem login, nenhuma fonte primária pública.
O modelo é COD com confirmação por call center, onde `lead` ocupa funcionalmente o lugar do checkout —
o que muda o significado da regra, não só a disponibilidade do dado.

**Hotmart** separa os papéis de forma útil: o webhook `PURCHASE_OUT_OF_SHOPPING_CART` é do **produtor**
e o campo `affiliate` é **booleano** (não identifica qual afiliado). Mas o afiliado pode configurar
pixel próprio com evento Initiate Checkout, inclusive em modo API — por conversion ID + label, não
por gclid.

### O achado do lado Google que mais muda o desenho

**Google Ads Scripts fazem upload de conversões offline.**
`AdsApp.bulkUploads().newCsvUpload(cols, {timeZone}).forOfflineConversions()` — descrição literal na
referência: *"Specifies that this upload is used for reporting offline conversions."* Como Scripts já
é o caminho primário de ingestão, **o mesmo mecanismo serve na direção contrária**, sem developer
token e sem API oficial. Isso abre a possibilidade de o checkout virar conversion action nativa do
Google Ads e chegar pelo mesmo caminho dos outros grãos — virou o ticket 20.

Restrições: janela dura de **90 dias após o último clique**; colunas obrigatórias `Google Click ID`,
`Conversion Name`, `Conversion Time`, mais a linha `Parameters:TimeZone=`; deduplicação natural pela
tripla (click ID, conversion_date_time, conversion_action).

**Correção de data:** a pesquisa registrou "a partir de 15/06/2026, requisições `UploadClickConversion`
da API oficial falham se o developer token nunca tiver enviado uploads offline antes". **Essa data já
passou** — hoje é 20/08/2026. Ou seja, não é prazo futuro: já está em vigor, e reforça o caminho por
Scripts em vez da API oficial.

### Duas coisas sinalizadas pela pesquisa

1. **A pergunta do atraso checkout→venda não tem resposta em nenhuma das treze redes.** Nenhuma
   publica atraso típico. Implicação de desenho: **não configurar atraso por rede** — medir o
   intervalo a partir dos próprios eventos ingeridos e tratá-lo como **propriedade observada**.
2. **Gravar `order_id` desde o início** é o que torna a retratação por reembolso possível depois
   (`RETRACTION` prefere `order_id` a `gclid`+timestamp, e é obrigatório em alguns casos). BuyGoods
   tem `{ORDERID}`, Digistore24 `{transaction_id}`, ClickBank `{receipt_id}` — **CartPanda não expõe
   order id nos placeholders documentados**, o que limita a retratação lá.

Nota metodológica: os "55 dias" de janela de ajuste de conversão que circulam em blogs aparecem na
doc oficial **apenas no contexto de Hotel Ads**; não foi encontrada sentença fixando o limite geral,
então não foi tratado como fato.
