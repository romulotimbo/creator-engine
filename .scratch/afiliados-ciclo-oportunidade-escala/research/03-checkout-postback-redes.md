# Evento de checkout, postback e conversão importada — por rede de afiliado

Pesquisa contra documentação oficial das redes e do Google Ads. Data: 2026-08-20.

## Resumo executivo

O evento de checkout existe e é acessível ao afiliado em **cinco** das redes investigadas
(ClickBank, BuyGoods, MaxWeb, CartPanda e — no nível de plataforma — as redes Everflow: GuruMedia,
Mediascalers, SmartADV), mas por três mecanismos diferentes e com graus de confirmação muito
distintos. **ClickBank é o único caso em que a documentação pública fecha o ciclo inteiro sem
nenhuma lacuna**: expõe "Order Form Impression" (= Initiate Checkout) e "AddPaymentInfo" como
eventos de primeira classe para o papel afiliado, aceita `gclid` como parâmetro nomeado no HopLink,
e empurra esses eventos de volta ao Google Ads por API própria (server-to-server), fazendo o
checkout aparecer como conversão no relatório do Google Ads. **BuyGoods e MaxWeb** têm checkout como
evento ("Checkout Visit" / slot de Funnel Pixel "Checkout") e um pixel externo Google Ads via API
com captura de gclid por script próprio (`&ga=1`), mas a documentação pública **só nomeia "Purchase"
(e "Page View", no MaxWeb) como Event type do pixel Google** — o mapeamento checkout→Google Ads
não está confirmado. **CartPanda** é a surpresa positiva do grupo brasileiro: o S2S Postback do
afiliado tem `initiate_checkout` como evento nomeado e um placeholder `{cid}` desenhado para
carregar click ID. **Digistore24 não tem evento de checkout** — o IPN cobre pagamento, reembolso e
chargeback e nada antes disso — mas tem o melhor contrato de click ID de todos (`cid` + `sid1..sid5`
no promolink, `{cid}` no postback), o que o torna ideal para importação offline por gclid **da
venda**, não do checkout. **Hotmart** separa os dois papéis com clareza: o webhook de carrinho
abandonado é do produtor (o campo `affiliate` é um booleano, não identifica qual afiliado), mas o
afiliado pode configurar **pixel próprio** com evento Initiate Checkout, inclusive em modo API.
Do lado Google, a importação por gclid é bem documentada, roda **via Google Ads Scripts** sem exigir
a API oficial (`CsvUpload.forOfflineConversions()`), e a janela dura é de **90 dias após o último
clique**. Nenhuma rede documenta publicamente o atraso típico checkout→venda aprovada; isso só sai
de observação no painel logado.

---

## Tabela comparativa

| Rede | Evento de checkout? | Como chega | Carrega gclid/subid? | Conversão importada p/ Ads? | Confiança da fonte |
|---|---|---|---|---|---|
| **BuyGoods** | Sim — "checkout visits" em Offer Pixels; slot "Checkout" em Funnel Pixels | Postback S2S por oferta (não no global) + pixel JS/HTML | subid1–5 (sem token gclid; gclid vai dentro de um subid). Global postback: `{SUBID}`…`{SUBID5}`, `{ORDERID}`, `{COMMISSION_AMOUNT}`, `{EMAILHASH}`, `{CONV_TYPE}`, `{FLAG_UPSELL}`, `{UPSELL_PARENT}` | Sim, "External Pixels" tipo Google Ads via API + OAuth; gclid capturado por `google_link_manager.js` + `&ga=1`. **Event type documentado: Purchase** | Alta p/ postback e pixel Google; **checkout→Google Ads NÃO CONFIRMADO** |
| **GuruMedia** | Plataforma suporta (Everflow: postback de tipo "Event"); se as ofertas expõem checkout, desconhecido | Postback S2S (Conversion / Event / CPC), global ou por oferta | `sub1`…`sub10`, `adv1`…`adv10`; gclid mapeado tipicamente em `sub1`/`sub2` | Sim no nível de plataforma: "Google Ads Integration For Partners" (OAuth, mapeia eventos → conversion actions) | Média — nenhuma doc própria da GuruMedia é pública; só a doc do Everflow + a afirmação da própria GuruMedia de que roda Everflow |
| **Mediascalers** | Idem GuruMedia (Everflow) | Postback S2S, global ou por oferta | Idem Everflow; a doc própria diz que o gclid chega "em um sub-parâmetro específico" sem nomeá-lo | Sim — artigo próprio "Google Ads Integration For Partners", com gclid obrigatório | Média-alta — help center público próprio, mas sem lista de eventos |
| **MaxWeb** | **Sim** — FAQ oficial nomeia dois eventos: Purchase e **Checkout Visit** | Postback S2S (Account > Postback Pixels) + pixel externo por API | `{SUBID}`…`{SUBID5}`, `{ORDERID}`, `{PRODUCT_CODENAME}`, `{COMMISSION_AMOUNT}` | Sim, pixel Google Ads por API; gclid via `&ga=1` + snippet JS. **Event types documentados: Purchase e Page View** | Alta p/ o evento e o pixel; **checkout→Google Ads NÃO CONFIRMADO** |
| **ClickBank** | **Sim, explicitamente** — "Order Form Impression" (= Initiate Checkout) e "AddPaymentInfo" | Pixel (ISR) **e** postback S2S custom **e** INS v8 | `gclid` é parâmetro nomeado. Além dele: `extclid`, `fbclid`, `unique_aff_sub1..5`, `tid`, `campaign`, `traffic_source`, `adgroup`, `ad`, `creative`, `aff_sub1..5` | **Sim, nativo e para o papel afiliado** — 3 conversion actions: Order Form Impression, Initial Purchase, Upsell Purchase; envio em tempo real | **Alta** — documentação oficial cobre tudo |
| **Digistore24** | **Não** — IPN não tem evento de visualização/abandono de order form | Postback S2S do afiliado (Sales & partners > Integrations); eventos = payment / refund / chargeback / rebill | **Sim, desenhado para isso**: `cid` (Click-ID) + `sid1`…`sid5` no promolink; `{cid}`, `{campaignkey}` no postback | Não documentado nativamente; viável só construindo você mesmo a importação offline a partir do postback | **Alta** — doc oficial completa e explícita |
| **SmartADV** | Plataforma suporta — doc própria cita "Checkout" e "Add to Cart" como exemplos de Event postback | Postback S2S tipo Conversion **ou** Event (mutuamente exclusivos por postback) | `sub1`…`sub10`; a doc **recomenda passar o click ID em `sub3`** | Não há artigo público; roda Everflow (portal.smartadv.com, docs.everflow.io), então a integração de partner provavelmente existe | Média — doc própria pública, mas sem lista real de eventos por oferta |
| **AdCombo** | Não no sentido de CC-submit. O modelo é COD: `lead` (formulário enviado) → confirmação por call center → `sale` | Postback S2S com `{status}` | Click ID chamado **`esub`**; `subacc`/`subacc2..4` | Não documentado publicamente | **Baixa — só fontes secundárias.** `adcombo.com/faq` retorna 403 sem login |
| **Hotmart** | Sim, mas com papéis separados: webhook `PURCHASE_OUT_OF_SHOPPING_CART` é do **produtor**; o **afiliado** tem "Initiate Checkout" no Pixel de Rastreamento próprio | Webhook (produtor) / pixel próprio Web ou API (afiliado) | Pixel Google Ads da Hotmart usa **ID de conversão + rótulo**, não gclid | Sim, no sentido de pixel/API do Google Ads — mas por conversion label, **não** por importação offline com gclid | Alta p/ ambos os pontos |
| **Braip** | Evento `abandoned_cart` citado apenas em docs de terceiros | Postback por produto (Ferramentas > Postback) | Não confirmado | Não documentado | **Baixa — nenhuma fonte primária pública encontrada** |
| **Monetizze** | Sim, existe status de checkout abandonado no postback | Postback (Menu > Ferramentas > Postback) | Não confirmado publicamente | Não documentado | Média — help center público confirma que **afiliado só recebe postback se o produtor autorizar** |
| **Eduzz** | Sim — webhook "Sun / Carrinho / Carrinho Abandonado", com campos `lastStep` e `paymentMethod` | Webhook da conta | Não confirmado | Não documentado | Média — doc de dev pública, mas o webhook é da conta (produtor); acesso do afiliado NÃO CONFIRMADO |
| **CartPanda** | **Sim, explicitamente** — `initiate_checkout` | Postback S2S, configurável em visão **Afiliado** ou Vendedor | **`{cid}`** desenhado como click ID (`?cid=algum-click-id` no link), + `{campaignkey}`, `{afid}`, `{amount_affiliate}`, `{order_type}`, `{upsell_no}`, `{is_test}` | Não nativo; viável construindo a importação offline | **Alta** — doc oficial nomeia os três eventos |

---

## Detalhe por rede

### 1. BuyGoods

**Fontes primárias**
- FAQ oficial: <https://backoffice.buygoods.com/faq> (item 6)
- Help center oficial, "Setting Up Tracking Pixels": <https://buygoods.ticksy.com/article/19340/>
- Guia oficial de pixels: <https://buygoods.com/pixel-howto>

**1. Evento de checkout.** Sim, mas **fora do postback global**. O artigo oficial separa dois níveis:

- *Global Postback Pixel*: "Global Postbacks track Purchases and Refunds, for frontend and upsell
  conversions." Configurado em `Profile > Postback Pixels`.
- *Offer Pixels*: "See the next chapter on Offer Pixels to track offer-specific activity **or other
  events (e.g. checkout visits)**."
- *Funnel Pixels (js, html)*: três slots explícitos no dashboard do afiliado — **Conversion/Upsell**,
  **Lander/VSL**, e **Checkout** ("usually used for tracking checkout views").

Ou seja: o checkout é rastreável, mas via pixel de oferta / funnel pixel, e a documentação pública
não mostra a tela de seleção de evento do postback por oferta. **Quantos eventos exatamente estão
disponíveis no dropdown do postback por oferta é algo que exige login.**

**2. gclid / subid.** Não existe token `{GCLID}`. O gclid tem que viajar dentro de um subid. Tokens
do postback global:

```
{SUBID} {SUBID2} {SUBID3} {SUBID4} {SUBID5}
{ORDERID} {COMMISSION_AMOUNT} {EMAILHASH} {CONV_TYPE} {FLAG_UPSELL} {UPSELL_PARENT}
```

(o FAQ lista também `{PRODUCT_CODENAME}`). Regra de casing documentada: no link de oferta os
parâmetros vão em minúsculas (`?aff_id=123&subid=123`), no postback os tokens em maiúsculas
(`?cid={SUBID}`). `{CONV_TYPE}` = `frontend` ou `upsell` — útil para não contar upsell como venda
inicial. Comportamento de retry documentado: "Make sure your script echos something upon successful
completion. If we receive no output from your script, we will assume it failed and keep calling it
for up to three days."

**3. Conversão importada para o Google Ads.** Sim, existe e é nativa. Caminho oficial
(`buygoods.com/pixel-howto`): `Offer Admin > Settings > External Pixels > Add New > Type = Google
Ads`. Primeiro pixel usa botão "Connect to Google" (OAuth); a partir daí Token e Account ID são
preenchidos automaticamente e podem ser copiados para pixels seguintes. O guia é literal quanto ao
gclid:

> "For the Google Ads tracking to work properly, we also need to send the gclid. If you don't have
> an easy way of doing it yet, you can always use our method: 1. Paste the following code in your
> lander's footer `<script src="https://buygoods.com/js/google_link_manager.js">` 2. Add the
> following parameter to your promo link — `&ga=1`"

**Limitação importante:** o mesmo guia diz "select ... **the Event type as Purchase**". Não há
menção pública de um Event type "Checkout" para o pixel externo do Google Ads. **NÃO CONFIRMADO**
se dá para empurrar checkout (e não só compra) para o Google Ads por esse caminho.

**4. Atraso e reembolso.** Reembolso é exposto: o postback global cobre "Purchases and Refunds".
Comissão é creditada "instantly" segundo o FAQ; pagamento semanal (quarta-feira por padrão; duas ou
três vezes por semana acima de US$15k/US$30k mensais). **O atraso típico entre checkout e venda
confirmada não é documentado publicamente.**

---

### 2. GuruMedia

**Fontes**
- Site oficial: <https://gurumedia.com/> — declara "Everflow tracking on every click, automated
  payments on every sale"
- Página de recursos: <https://gurumedia.com/resources/> — lista Everflow como tracking da rede, e
  **não contém nenhuma documentação de afiliado, FAQ ou guia de postback**
- Doc da plataforma (Everflow, primária para a plataforma, não para a GuruMedia):
  <https://helpdesk.everflow.io/collaborator/managing-postbacks-as-a-partner>
  e <https://helpdesk.everflow.io/collaborator/google-ads-integration-for-partners>

**1. Evento de checkout.** No nível de plataforma, sim: o Everflow separa postbacks em três tipos —
**Conversion** (o objetivo principal da oferta), **Event** ("secondary actions beyond the base
conversion") e **CPC**. Um checkout entraria como *Event*. **Se as ofertas da GuruMedia realmente
expõem um evento de checkout ao afiliado é impossível determinar sem login** — depende de o
anunciante ter definido esse evento na oferta.

**2. gclid / subid.** `sub1`–`sub10` e `adv1`–`adv10` (expandidos de 1–5 para 1–10). Macros de
postback documentadas: `{transaction_id}`, `{offer_id}`, `{payout}`, `{sub1}`–`{sub5}`,
`{adv1}`–`{adv5}`, `{source_id}`, `{event_id}`. O gclid não tem slot nomeado — vai num sub.

**3. Conversão importada para o Google Ads.** Sim no nível de plataforma. "Google Ads Integration
For Partners": `Company Settings > Integrations > Media Buying > Google Ads`, com quatro seções
(General Settings, Account Settings, Campaign Settings, Conversions). A doc do Everflow diz que ao
selecionar *Allow* "the default Google Ads tracking template will be updated to pass the necessary
parameters for Google Ads and Everflow to connect on every click", e que o gclid é "mandatory for
attribution — typically mapped to sub1 or sub2 or gclid parameter". A seção *Conversions* permite
mapear **múltiplos Events** (não só a conversão base) para conversion actions do Google Ads.
Ressalva oficial: "Each Google Ads account should only be connected to one Everflow instance".

**4. Atraso e reembolso.** Não documentado publicamente.

---

### 3. Mediascalers

**Fontes primárias**
- Help center público: <https://www.mediascalers.com/en/help-center/running-traffic/>
- <https://www.mediascalers.com/en/help-center/running-traffic/google-ads-integration-for-partners/>
- <https://www.mediascalers.com/en/help-center/running-traffic/meta-facebook-attribution-for-partners/>

**1. Evento de checkout.** A Mediascalers roda Everflow e o help center dela é essencialmente o do
Everflow reescrito. O artigo de Google Ads diz apenas "Choose which MediaScalers Event to track"
ao montar o mapeamento — **não enumera os eventos disponíveis**. Mesma situação da GuruMedia:
capacidade da plataforma confirmada, existência de um evento de checkout nas ofertas **não**.

**2. gclid / subid.** O artigo é explícito quanto à obrigatoriedade e vago quanto ao nome:
"it is required in order to receive the gclid in a particular sub-parameter, which ultimately allows
MediaScalers to associate a click with its future conversion in Google Ads". **O sub-parâmetro
específico não é nomeado na doc pública.** No artigo equivalente de Meta, o `fbclid` é passado no
campo `Fbc` no formato `fb.1.{timestamp}.{fbclid}` — o que mostra o padrão de integração.

**3. Conversão importada para o Google Ads.** Sim: "Pass conversion and event data back to Google
Ads for better optimization", com toggle *Override Linked Event Value* para custom values. Setup:
Connect Account (OAuth) → General Settings (Manager ID, Customer ID) → Account Settings (atualização
do tracking template) → Campaign Settings → Conversions.

**4. Atraso e reembolso.** Não documentado. A página institucional afirma que a rede "automatically
audits and adds any missing conversion data" — declaração de marketing, não contrato técnico.

---

### 4. MaxWeb

**Fontes primárias**
- FAQ oficial: <https://maxweb.com/faq>
- Guia oficial de pixels: <https://maxweb.com/pixel-tracking>
- Blog oficial: <https://maxweb.com/blog/post/how-to-set-up-postback-links-with-maxweb>

**1. Evento de checkout.** **Sim, e nomeado.** O FAQ oficial identifica dois eventos que disparam
postback: **Purchase** e **Checkout Visit**. Esse é o achado mais direto entre as redes do grupo
BuyGoods/MaxWeb — o evento de checkout é um evento de postback, não só um pixel de página.

**2. gclid / subid.** Mesma família de tokens do BuyGoods:
`{SUBID}`, `{SUBID2}`…`{SUBID5}`, `{ORDERID}`, `{PRODUCT_CODENAME}`, `{COMMISSION_AMOUNT}`.
Setup em `Account > Postback Pixels > Add New`. A orientação oficial para trackers é passar o click
ID do tracker num subid do link de oferta (ex.: `subid2={!subid!}`). Mesmo aviso de echo/retry de
três dias.

**3. Conversão importada para o Google Ads.** Sim: pixel externo por API em
`backoffice > oferta > Settings > External pixels`, com Google Ads, Meta e TikTok. Captura de gclid
igual à do BuyGoods — "capture the gclid URL parameter and pass it forward to the MaxWeb Inc traffic
link", com snippet JS e `&ga=1` no link. **Os Event types documentados para o pixel Google Ads são
"Purchase" (conversões) e "Page View" (visitas)** — não há um Event type "Checkout" documentado
publicamente. Ou seja: o checkout chega ao **seu** servidor por postback, mas empurrá-lo para dentro
do relatório do Google Ads pelo pixel nativo **não está confirmado** (o mais próximo seria abusar do
"Page View" apontando para uma conversion action de checkout — hipótese, não documentação).

**4. Atraso e reembolso.** Não documentado publicamente no FAQ nem no guia de pixels.

---

### 5. ClickBank

Rede com a melhor documentação pública das oito. Responde as quatro perguntas sem lacuna.

**Fontes primárias** (todas em `support.clickbank.com`)
- Integrated Sales Reporting: <https://support.clickbank.com/en/articles/10535141-integrated-sales-reporting>
- Instant Notification Service (INS): <https://support.clickbank.com/en/articles/10535147-instant-notification-service-ins>
- Affiliate Tracking Parameters: <https://support.clickbank.com/en/articles/10535262-affiliate-tracking-parameters>
- Postback/Pixels Integration Guide: <https://support.clickbank.com/en/articles/10535373-postback-pixels-integration-guide>
- Tracking Integration: Google Ads: <https://support.clickbank.com/en/articles/10535368-tracking-integration-google-ads>
- Google Ads and ClickBank Integration: <https://support.clickbank.com/en/articles/10535370-google-ads-and-clickbank-integration>
- Changelog jun/2024 (INS v8 + affiliate tracking parameters): <https://support.clickbank.com/en/articles/10535006-june-4-2024-new-affiliate-tracking-parameters-launched-common-request-data-added-to-analytics-ins-updated-to-version-8-and-more>

**1. Evento de checkout.** Sim, com nome próprio e disponível ao papel **Affiliate**:

- **Order Form Impression** — "fires for each visit to the ClickBank order form". A doc de ISR diz
  explicitamente que no Facebook esse evento se chama "Initiate Checkout".
- **AddPaymentInfo** — dispara quando "customer starts entering order form data". Esse é ainda mais
  próximo de um "CC submit" do que o order form impression.
- Além deles: Initial Purchase, Upsell Purchase, e um "Combined Conversion" que soma initial + upsell
  num único evento.

Três caminhos de entrega, todos abertos ao afiliado:
- **Pixel (ISR)** — `Vendor Settings > My Site > Add Tracking Code`, escolhendo role **Affiliate** e
  a página alvo (Order Form, Confirmation Page ou ambas). Tipos: Facebook Pixel, Google Analytics,
  Yahoo, Generic.
- **Postback custom** — `Integrations > Postback/Pixels`, com opção "Custom Postback/Pixel" para
  endpoint arbitrário e 60+ macros, incluindo `{account}`, `{role}`, `{affiliate}`, `{event_type}`,
  `{event_id}`, `{receipt_id}`, `{affiliate_earnings}`, `{total_transaction_amount}`, `{click_id}`,
  `{campaign}`, `{traffic_source}`, `{country}`, `{device_type}`, `{browser}`. Alguns macros são
  "Affiliate Only" (ex.: `{tid}`, `{campaign}`).
- **INS v8 (S2S)** — o papel na transação pode ser `VENDOR`, `AFFILIATE` ou `JV_UPSELL`; tipos de
  transação: `SALE`, `BILL`, `RFND`, `CGBK`, `CANCEL-REBILL`, `UNCANCEL-REBILL`, `SUBSCRIPTION-CHG`,
  `ABANDONED_ORDER`, `TEST`. Assinado/criptografado com CBC-AES-256 e secret key.
  **Ressalva:** `ABANDONED_ORDER` só é enviado se "Cart Abandonment" estiver habilitado, e os campos
  desse evento são marcados como destinados ao **vendor**. Tratar `ABANDONED_ORDER` como fonte de
  checkout do afiliado é **NÃO CONFIRMADO**; a via confirmada para o afiliado é Order Form Impression
  / AddPaymentInfo.

**2. gclid / subid.** ClickBank tem uma taxonomia formal de *Affiliate Tracking Parameters*,
appendáveis a HopLinks e Direct Tracking Links:

- Não-únicos: `traffic_type`, `traffic_source`, `offer`, `campaign`, `adgroup`, `ad`, `creative`,
  `aff_sub1`…`aff_sub5`, `network_aff`
- Identificadores de clique (únicos): `extclid`, `fbclid`, `contact_id`,
  `unique_aff_sub1`…`unique_aff_sub5`
- Legado/paralelo: `tid` — "Affiliates append the `&tid=[insert-value]` to the direct tracking link,
  which will be detected by the tracking script on the seller's offer page and stored on the Hop
  event"
- **`gclid`** — parâmetro nomeado, exigido pela integração com Google Ads (abaixo)

Semântica de persistência, na doc: "Data passed in affiliate tracking link parameters is captured at
the time the link is clicked, it's stored, and is tracked across any event the click resulted in."
Aparecem em Sales Analytics, Transaction Detail (visão do afiliado), INS v8, pixels e Orders API.
Os *common request data* auto-coletados na v8 incluem `clickId` e `clickTimestamp` — este último
descrito como "Timestamp of the initial hop **or order form impression** event".

**3. Conversão importada para o Google Ads.** **Sim, nativo, e é exatamente o que o operador
precisa.** A integração usa a Conversions API do Google e envia S2S em tempo real. Requisitos e
comportamento, conforme a doc:

- Papel: "Both affiliates and sellers who promote ClickBank products through Google Ads can use this
  feature" — o role é escolhido no setup.
- gclid obrigatório: "The Google Ads integration requires the Google Click ID (gclid) to be passed to
  ClickBank on the HopLink or the Direct Tracking Link" e "All conversion events sent to Google Ads
  must have a gclid otherwise Google will not accept the conversion event."
- Setup: criar **três** conversion actions no Google Ads (duas de compra, uma de carrinho/impressão)
  → habilitar auto-tagging → `Integrations > Postback/Pixels` → Google Ads → autorizar via login
  Google (escopo "See, edit, create, and delete your Google Ads account and data") → informar
  Customer ID e mapear os eventos.
- Eventos enviados: **ClickBank Order Form Impression**, **ClickBank Initial Purchase**,
  **ClickBank Upsell Purchase**.
- Caveats documentados: transações com cartão de teste não geram evento no Google; até 24h para as
  primeiras conversões aparecerem após criar a conversion action.
- **Reembolso/chargeback enviados como conversão negativa ao Google Ads: não documentado.** Ficam
  disponíveis no INS (`RFND`, `CGBK`) e na tabela de macros do postback, mas o artigo do Google Ads
  não menciona retração.

**4. Atraso e reembolso.** Reembolso e chargeback são eventos de primeira classe (INS `RFND`,
`CGBK`; macros de postback). **O atraso típico entre order form impression e venda aprovada não é
documentado** — em ClickBank a venda é aprovada em tempo real no cartão, então o intervalo relevante
é de segundos a minutos, mas isso é inferência, não documentação.

---

### 6. Digistore24

**Fontes primárias**
- Set up S2S postback: <https://help.digistore24.com/hc/en-us/articles/24293197806225-Set-up-S2S-postback>
- S2S Postback (conceito): <https://help.digistore24.com/hc/en-us/articles/24293288047761-S2S-Postback>
- IPN / Events (dev): <https://dev.digistore24.com/hc/en-us/articles/32480561422353-Events>

**1. Evento de checkout: não existe.** A tabela oficial de eventos do IPN é fechada:

| Evento | Significado |
|---|---|
| `on_payment` | pagamento bem-sucedido |
| `on_refund` | reembolso processado |
| `on_chargeback` | chargeback processado pela operadora |
| `on_payment_missed` | falha em cobrança recorrente |
| `payment_denial` | pagamento recusado (desmarcado por padrão) |
| `on_rebill_cancelled` / `on_rebill_resumed` | recorrência parada/retomada |
| `last_paid_day` | fim do período pago |
| `connection_test`, `on_affiliation`, `eticket`, `custom form` | eventos não-transacionais |

Nada dispara na abertura do order form. Atenção a um falso amigo: o campo `billing_status` tem o
valor `aborted`, mas ele descreve o estado de cobrança de uma assinatura/parcelamento, **não** um
checkout abandonado. Existe rastreamento de tráfego no order form (`Reports > Analytics`, seção
Visitors) e pixels de order form, mas isso é configuração de **vendor**.

**2. gclid / subid.** O melhor contrato de click ID entre todas as redes pesquisadas — e o único que
diz o nome do jogo na cara:

```
https://www.checkout-ds24.com/redir/[PRODUCT-ID]/[AFFILIATE-ID]/[CAMPAIGNKEY]?cid=[CLICK-ID]
   &sid1={v}&sid2={v}&sid3={v}&sid4={v}&sid5={v}
```

> "Add a GET parameter to your Digistore24 promo or content link to transmit the Click-ID.
> Digistore24 uses the parameter name **`cid`** for transmitting the Click-ID."

Limites documentados: campaign key ≤ 127 caracteres; `cid` + sub-IDs ≤ 1000 caracteres no total;
alfabeto restrito a letras (com trema), dígitos e `. , _ -`.

Placeholders do postback (lista completa da doc): `{cid}`, `{campaignkey}`, `{country}`,
`{amount_affiliate}`, `{amount_brutto}`, `{amount_netto}`, `{currency}`, `{product_id}`,
`{product_name}`, `{transaction_id}`, `{transaction_type}`, `{merchant_id}`, `{merchant_name}`,
`{billing_status}`, `{billing_type}`, `{order_type}` (`initial_sale` | `upsell`), `{upsell_no}`,
`{is_test}`, `{affiliate_id}`, `{affiliate_name}`, `{datetime_unix}` / `{datetime_full}` /
`{datetime_utc}`, `{random}`.

Setup do afiliado: `Sales & partners > Integrations > Add New Integration`, escolher parcerias,
escolher quais order events disparam, informar a URL, escolher a moeda, ativar. Log em
`Sales & partners > Integrations`, aba **Log**. Botão **Test Connection** simula uma compra.

**3. Conversão importada para o Google Ads.** **Não há integração nativa documentada.** Mas o
contrato `cid` torna trivial construir a importação offline por conta própria: gclid → `cid` no
promolink → `{cid}` de volta no postback → upload como conversão offline. Como não há evento de
checkout, o que se importa é **a venda**, não o checkout.

**4. Atraso e reembolso.** Reembolso e chargeback totalmente expostos ao afiliado (`on_refund`,
`on_chargeback`, `{transaction_type}` ∈ {payment, refund, chargeback}, `amount_fee` para taxa de
chargeback, `refund_days` no payload indicando a janela de reembolso do produto). Atraso
checkout→venda: não aplicável, já que não há evento de checkout.

---

### 7. SmartADV

**Fontes primárias**
- <https://support.smartadv.com/how-to-setup-postbacks-to-track-conversions>
- <https://support.smartadv.com/troubleshooting-postbacks>
- <https://support.smartadv.com/integrations>

**1. Evento de checkout.** A doc própria distingue os dois tipos e **nomeia checkout como exemplo**:

- *Conversion Postbacks*: "primary conversion point (e.g., a sale)"
- *Event Postbacks*: "optimization events (e.g., **'Checkout'**, 'Add to Cart', etc) and Pixel
  integrations"

Alerta operacional explícito na doc: "If you set up your postback to track events, it will not fire
when a conversion occurs, and vice versa." Ou seja, contar checkout e venda exige **dois postbacks
separados**. Quais eventos existem de fato em cada oferta: só no painel logado.

**2. gclid / subid.** `sub1`–`sub10` (plataforma Everflow). A recomendação oficial da SmartADV é
específica:

> "We recommend passing click ID in **sub3**": `https://www.example-trackinglink.com/2H8NUUW1/WT40ITW/?sub3={click_id}`
> e no postback: `https://example-postback-url.com/postback?cid={sub3}`

Setup: `Postback > Add Postback`, escolher Global ou oferta específica, delivery method "Postback",
colar a URL, salvar e ativar.

**3. Conversão importada para o Google Ads.** A seção Integrations do help center público lista
apenas quatro artigos (Using Postbacks and Tracking Pixels in Everflow; Tracking Integrations: Terms
and Definitions; How to Setup Postbacks to Track Conversions; How to Setup Pixel Tracking) — **nenhum
sobre Google Ads**. A rede roda Everflow (`portal.smartadv.com`, API documentada em
`https://docs.everflow.io/`, API key liberada pelo account manager), então a integração de partner do
Everflow provavelmente está disponível, mas isso é **NÃO CONFIRMADO** para a SmartADV.

**4. Atraso e reembolso.** Não documentado publicamente.

---

### 8. AdCombo

**Situação da documentação: ruim.** `https://adcombo.com/faq/` retorna **HTTP 403** para acesso não
autenticado. Não foi encontrada nenhuma página pública da AdCombo descrevendo macros de postback ou
eventos. Tudo abaixo vem de **fontes secundárias** (documentação de trackers de terceiros) e está
marcado como tal.

**1. Evento de checkout — NÃO CONFIRMADO.** O modelo de negócio da AdCombo é COD/CPA com confirmação
por call center, não checkout com cartão. O funil documentado por terceiros é
`lead` (formulário enviado) → confirmação telefônica → `sale`/`approved`, com estados intermediários
(`trash`, `rejected`, `hold`). Funcionalmente, o **lead** ocupa o lugar do "checkout" na regra do
operador — é o sinal de intenção anterior à comissão — mas a semântica é diferente o suficiente para
não transportar as faixas de decisão direto.

**2. gclid / subid — fonte secundária.** O click ID da AdCombo se chama **`esub`**; há também
`subacc`, `subacc2`…`subacc4`. Postbacks trazem `offer_id`, `trans_id`, `revenue`, `status`.
O status da conversão viaja no macro `{status}`.

**3. Conversão importada para o Google Ads — não documentado publicamente.**

**4. Atraso e reembolso.** O atraso aqui é estrutural e potencialmente longo (dias), porque depende
do call center ligar e confirmar — mas **o valor típico não é documentado publicamente**.

---

### 9. Hotmart

**Fontes primárias**
- Webhook de carrinho abandonado: <https://developers.hotmart.com/docs/en/2.0.0/webhook/cart-abandonment-webhook/>
- Configuração de webhook: <https://help.hotmart.com/en/article/360001491352/how-do-i-set-up-my-product-s-api-using-the-webhook-postback->
- Pixel do Google Ads: <https://help.hotmart.com/pt-br/article/115001310532/como-configurar-o-pixel-do-google-ads>
- Configurações avançadas do Pixel: <https://help.hotmart.com/pt-br/article/6565866201741/conheca-as-configurac-es-avancadas-do-pixel-de-rastreamento>

**1. Evento de checkout — sim, mas por dois caminhos com donos diferentes.**

*Caminho do produtor (não serve ao afiliado):* webhook `PURCHASE_OUT_OF_SHOPPING_CART`, v2.0.0.
Dispara "when the person fills in their information on the payment page, like name and/or email";
cobre também quem deixou a página aberta muito tempo, com verificação a cada 30 minutos. Payload:
`data.affiliate` (**boolean** — "If the lead comes from an affiliate, the value is true"),
`data.product.{id,name}`, `data.buyer.{name,email,phone}`, `data.offer.code`,
`data.checkout_country.{name,iso}`. **O campo de afiliado é um booleano, não uma identificação** —
mesmo que um afiliado tivesse acesso ao webhook, não conseguiria separar seus próprios abandonos.
E a doc define o dono do webhook como **Creator**: "the person with an account that has at least one
product registered within Hotmart".

*Caminho do afiliado (serve):* Pixel de Rastreamento próprio. A Central de Ajuda é explícita:

> "Sim. Tanto Produtores quanto Afiliados podem configurar seus próprios pixels para acompanhar os
> resultados das campanhas que realizam."

Caminho: `Ferramentas > Ver todas > Pixel de rastreamento > [produto] > Google Ads`. Eventos citados
na doc de configurações avançadas: **Initiate Checkout** (dispara ao carregar a página de pagamento),
**Purchase** (venda / página de obrigado), **PageView / página do produto**, e **Payment Generated**
(boleto ou Pix gerado — importante para separar pagamento não imediato). O envio pode ser **Web**
("diretamente a partir do navegador utilizado pelo comprador") ou **API** ("do servidor da Hotmart
para o servidor da plataforma de anúncios").

**2. gclid / subid.** O pixel do Google Ads da Hotmart pede **ID de conversão** e **Rótulo da
conversão (Conversion Label)** — ou seja, é o mecanismo padrão de conversion action do Google, não
importação por gclid. Os parâmetros de rastreamento da Hotmart (`src`, `sck`) existem para segmentar
origem, mas **a doc do pixel não menciona gclid nem auto-tagging**.

**3. Conversão importada para o Google Ads.** Sim no sentido de que o evento chega ao Google Ads e
aparece no relatório — mas por conversion ID + label (pixel/API), **não** por importação offline com
gclid. Consequência prática: a atribuição é feita pelo próprio Google, e você não controla o
casamento evento↔clique.

**4. Atraso e reembolso.** A Hotmart tem eventos de reembolso e chargeback no webhook (compra
reembolsada, chargeback, reembolso solicitado), mas de novo no nível do produtor. Histórico de
eventos guardado por 60 dias. Atraso checkout→aprovação não é documentado como número; na prática
depende do meio de pagamento (cartão imediato vs. boleto/Pix, para os quais existe o evento
*Payment Generated*).

---

### 10. Braip

**Nenhuma fonte primária pública encontrada.** As buscas retornaram somente documentação de
terceiros (Clint, Socialeads, Spedy, Notificações Inteligentes, EAD Plataforma, blogs). O que essas
fontes secundárias afirmam, **NÃO CONFIRMADO**: postback em `Ferramentas > Postback > Nova
configuração`, com seleção de produto e marcação de eventos, entre eles `abandoned_cart`.

Observação estrutural relevante: a configuração é **por produto**, o que sugere que quem configura é
quem é dono do produto (produtor). Se o afiliado consegue registrar postback próprio e receber
`abandoned_cart` dos produtos que promove **exige verificação no painel logado**.

---

### 11. Monetizze

**Fonte primária**
- <https://help.monetizze.com.br/books/gestao-da-venda-esf/page/postback>
- Referência de API citada pela própria Monetizze: `apidoc.monetizze.com.br/postback`

**1. Evento de checkout.** Existe status de **checkout abandonado** no postback, com uma condição
importante documentada: "para eventos de postback relacionados a abandono de checkout e status de
rastreio, o produtor precisa ter habilitado as permissões no cadastro do produto".

**2. Acesso do afiliado — condicional e documentado.** A Central de Ajuda é clara:

> "Habilitar essa função está condicionada a liberação prévia do produtor que deve autorizar o envio
> das informações para afiliados."

Ou seja: **por padrão, o afiliado não recebe postback na Monetizze.** É uma negociação com o produtor,
produto a produto. Caminho: `Menu > Ferramentas > Postback`.

**3. gclid / subid.** A página de ajuda não lista os campos enviados. **NÃO CONFIRMADO** quais
parâmetros de rastreamento (`src`, `chave_unica`, etc.) chegam ao postback do afiliado — exige a
apidoc e/ou o painel.

**4. Conversão importada para o Google Ads / atraso / reembolso.** Não documentado nessa página.

---

### 12. Eduzz

**Fontes primárias**
- <https://developers.eduzz.com/reference/webhook/sun-cart-abandonment>
- <https://developers.eduzz.com/docs/webhook>

**1. Evento de checkout.** Sim: webhook **"Sun / Carrinho / Carrinho Abandonado"**, enviado "quando o
usuário abandona um carrinho no checkout sem finalizar a compra". Dois campos úteis para granularidade:
**`lastStep`** ("é possível identificar em qual etapa o usuário abandonou o carrinho") e
**`paymentMethod`**.

**2. Acesso do afiliado.** O webhook da Eduzz é da **conta** ("receber requisições HTTP na sua
aplicação sempre que um novo evento acontecer **na sua conta**"), e os eventos são organizados por
aplicação (Sun/checkout, MyEduzz/faturas). **Se o afiliado recebe o carrinho abandonado dos produtos
que promove — e se consegue distinguir os seus — é NÃO CONFIRMADO** e exige o painel logado.

**3. gclid / subid.** Não confirmado publicamente.

**4. Atraso e reembolso.** Existem webhooks de fatura (`myeduzz-invoice-paid`,
`myeduzz-invoice-scheduled`, etc.), mas o mapeamento afiliado→reembolso não foi verificado.

---

### 13. CartPanda

Melhor caso do grupo brasileiro, e o segundo melhor de toda a pesquisa depois da ClickBank.

**Fonte primária**
- S2S Postback: <https://help.cartpanda.com/pt-br/article/s2s-postback-13wi92k/>

**1. Evento de checkout — sim, nomeado, e configurável pelo afiliado.** A doc lista exatamente três
eventos que podem ser ativados/desativados individualmente:

| Evento | Quando dispara |
|---|---|
| `initiate_checkout` | "Quando o cliente inicia o checkout" |
| `initial_sale` | "Quando o pedido é finalizado com sucesso" |
| `upsell` | "Quando uma oferta de upsell é aceita" |

A doc tem visões separadas "**Ver como Afiliado**" e "Ver como Vendedor", e afirma que a CartPanda
"envia postbacks separados para cada produto com afiliação, mesmo que tenham afids diferentes".

**2. gclid / subid.** Click ID de primeira classe, chamado **`cid`**:

> "você poderá inserir um link de checkout do seu produto na Cartpanda incluindo um click ID ao
> final: `?cid=algum-click-id`"

Placeholders disponíveis no postback: `{cid}`, `{campaignkey}`, `{country}`, `{amount_affiliate}`,
`{currency}`, `{product_id}`, `{product_name}`, `{order_type}`, `{upsell_no}`, `{shop_slug}`,
`{affiliate_slug}`, `{afid}`, `{is_test}`, `{datetime_unix}`, `{datetime_full}`, `{datetime_utc}`,
`{random}`, `{email}`, `{first_name}`, `{last_name}`, `{phone_number}`.

O padrão de nomes é idêntico ao da Digistore24 (`cid`, `campaignkey`, `amount_affiliate`,
`order_type`, `upsell_no`, `is_test`, `datetime_*`, `random`) — provavelmente a CartPanda copiou o
contrato. Vantagem prática: um único adapter de ingestão serve às duas.

**3. Conversão importada para o Google Ads.** Não há integração nativa documentada. Mas com
`initiate_checkout` + `{cid}` carregando gclid, a importação offline própria é direta — e essa é a
única rede brasileira em que dá para importar **o checkout** (não só a venda) como conversão no
Google Ads.

**4. Atraso e reembolso.** **O artigo não menciona eventos de reembolso, chargeback, pagamento
aprovado ou carrinho abandonado.** `initial_sale` é "pedido finalizado com sucesso" — se isso
significa pedido criado ou pagamento capturado **não está claro na doc**, e importa muito para a
regra do operador. Verificar no painel.

---

## Lado Google: importação de conversões offline por gclid

### Pré-requisitos e janela de tempo

**Fonte:** <https://support.google.com/google-ads/answer/7012522> (Set up offline conversions using
Google click ID) e <https://support.google.com/google-ads/answer/15081888> (Guidelines for importing
offline conversions).

- **Auto-tagging tem que estar ligado** na conta do Google Ads. Sem isso não há gclid.
- É preciso conseguir **capturar o gclid da URL** e armazená-lo junto do registro do lead/pedido.
- É preciso criar previamente uma ou mais **conversion actions de importação** (na API, tipo
  `UPLOAD_CLICKS`).
- **Esperar 4–6 horas** após criar a conversion action antes de subir conversões para ela. Subir
  antes disso pode fazer as conversões levarem até 2 dias para aparecer.
- **Janela máxima: 90 dias.** Texto da doc: *"Offline conversions that were uploaded more than 90
  days after the associated last click won't be imported into Google Ads."* (Exceção: enhanced
  conversions for leads usam 63 dias.) O Google só guarda o gclid por 90 dias.
- **O gclid é case sensitive.**
- Contar ~**3 horas** para as estatísticas importadas aparecerem no relatório após o upload.
- Conversões importadas dentro de ~1 dia do clique podem ainda não ter sido registradas — a prática
  recomendada é reenviar um dia extra de dados.

**Consequência direta para a regra do operador:** a janela de 90 dias é folgada para o ciclo de teste
(que é medido em gasto acumulado, não em tempo), mas ela é dura — checkout ou venda que só for
reconciliado depois de 90 dias do clique **não entra no Google Ads de jeito nenhum**. Isso importa
para redes com confirmação lenta (AdCombo/COD) e para reembolso tardio.

### Formato do arquivo (importação por arquivo/agendamento)

**Fonte:** <https://support.google.com/google-ads/answer/7014069>

Colunas obrigatórias: **`Google Click ID`**, **`Conversion Name`**, **`Conversion Time`**.
Colunas opcionais: `Order ID`, `Conversion Value`, `Conversion Currency`, `Ad User Data`,
`Ad Personalization`, `Attributed Credit`.

Linha de parâmetros obrigatória no topo: `Parameters:TimeZone=America/Sao_Paulo` (ou offset,
ex.: `-0300`).

Formatos aceitos de `Conversion Time`:

```
MM/dd/yyyy hh:mm:ss aa      08/14/2012 5:01:54 PM
MMM dd,yyyy hh:mm:ss aa     Aug 14, 2012 5:01:54 PM
MM/dd/yyyy HH:mm:ss         08/14/2012 17:01:54
yyyy-MM-dd HH:mm:ss         2012-08-14 13:00:00
yyyy-MM-ddTHH:mm:ss         2012-08-14T13:00:00
com offset GMT              2012-08-14 13:00:00+0500
com timezone ID             2012-08-14 13:00:00 America/Los_Angeles
```

Métodos de upload: arquivo único do computador, **Google Sheets**, **HTTPS**, **SFTP** (os três
últimos agendáveis). O Data Manager também importa de GCS, Amazon S3, HTTP, SFTP e gSheets com
lookback de 90 dias por execução (Salesforce e HubSpot usam 14 dias).

### Via API oficial

**Fonte:** <https://developers.google.com/google-ads/api/docs/conversions/upload-clicks> e
<https://developers.google.com/google-ads/api/docs/conversions/upload-offline>

- Serviço: **`ConversionUploadService.UploadClickConversions`**.
- Campos do `ClickConversion`: `gclid` (ou `gbraid`/`wbraid` para app→web), `conversion_action`
  (resource name de uma ConversionAction do tipo `UPLOAD_CLICKS` e habilitada), `conversion_date_time`
  no formato `yyyy-mm-dd HH:mm:ss+|-HH:mm` **com timezone**, `conversion_value`, `currency_code`, e
  `order_id` (opcional, mas "strongly recommended").
- Fazer **batch**: "batch the conversions into one `UploadClickConversionsRequest`, rather than
  sending an import request per conversion".
- Erros relevantes: `CLICK_CONVERSION_ALREADY_EXISTS` quando a combinação (click ID,
  `conversion_date_time`, `conversion_action`) já foi enviada — ou seja, **a deduplicação natural é
  essa tripla**; `EXPIRED_EVENT` quando a conversão cai fora do
  `click_through_lookback_window_days` da conversion action.
- Esperar **≥6 horas** após criar a conversion action antes de reenviar conversões que falharam.
- **Mudança importante e datada:** a partir de **15 de junho de 2026**, requisições
  `UploadClickConversion` falham se o developer token nunca tiver enviado antes uploads de conversões
  offline ou enhanced conversions for leads; a doc orienta migrar para a **Data Manager API**. Isso
  fecha a porta da API oficial para quem for começar do zero depois dessa data — e reforça a opção
  Scripts abaixo.

### Via Google Ads Scripts (sem API oficial) — **sim, dá**

**Fonte:** <https://developers.google.com/google-ads/scripts/docs/concepts/bulk-upload> e
<https://developers.google.com/google-ads/scripts/docs/reference/adsapp/adsapp_csvupload>

Os Scripts fazem upload de conversões offline por **bulk upload**. A referência da API de Scripts
lista o método com essa descrição literal:

> **`forOfflineConversions(): AdsApp.CsvUpload`** — "Specifies that this upload is used for reporting
> offline conversions."

É obrigatório chamá-lo: por padrão o upload é interpretado como *Campaign Management*
(`forCampaignManagement()` é o default). O esqueleto é:

```js
const columns = ['Google Click ID', 'Conversion Name', 'Conversion Time',
                 'Conversion Value', 'Conversion Currency'];
const upload = AdsApp.bulkUploads()
    .newCsvUpload(columns, { timeZone: '-0300' })
    .forOfflineConversions();
upload.append({ 'Google Click ID': gclid, 'Conversion Name': 'Checkout BuyGoods', /* ... */ });
upload.apply();   // em preview mode, apply() apenas pré-visualiza
```

Também há `setFileName(fileName)`, `preview()`, e a opção `fileLocale` no `newCsvUpload`. Fonte
alternativa para o CSV de exemplo, indicada pela própria doc: baixar o template pela UI em
`Tools and settings > BULK ACTIONS > Uploads`.

**Isso é o achado operacionalmente mais importante do lado Google para este projeto**: como o mapa já
decidiu Google Ads Scripts como caminho primário de ingestão, o **mesmo** mecanismo serve para a
direção contrária (empurrar checkout/venda de volta como conversão), sem developer token, sem API
oficial e sem a restrição de 15/06/2026 acima.

### Reembolso / retração

**Fonte:** <https://developers.google.com/google-ads/api/docs/conversions/upload-adjustments> e
<https://support.google.com/google-ads/answer/7686447>

- Serviço: **`ConversionAdjustmentUploadService`**. Tipos: **`RETRACTION`** (remove a conversão),
  **`RESTATEMENT`** (altera o valor), **`ENHANCEMENT`**.
- Identificação: **`order_id`** é o caminho preferido ("more durable ... and thus `gclid_date_time_pair`
  is not recommended"). `order_id` é **obrigatório** quando a conversion action é do tipo `WEBPAGE`
  ou quando a conversão original teve `order_id`. Se a original usou `gbraid`, só `order_id` serve.
- Esperar 4–6h após criar a conversion action; a orientação de ajudas é subir o ajuste **pelo menos
  24 horas depois** da conversão original.
- Irreversibilidade documentada: se a conversão for retraída (ou o valor cair a 0), ela sai dos
  relatórios e o Google **não processa mais nenhum ajuste subsequente** sobre ela. Para "desfazer",
  é preciso reenviar como conversão nova com timestamp levemente diferente.
- **Janela máxima do ajuste: NÃO CONFIRMADO.** O artigo oficial afirma 7 dias de "autobidding
  readability" e cita explicitamente **55 dias apenas no contexto de Hotel Ads**; não encontrei na
  doc oficial uma sentença fixando o limite geral para conversões não-hoteleiras. O número "55 dias"
  circula em fontes secundárias como se fosse geral — **não tratar como fato**.

**Implicação de desenho:** se o sistema for importar checkout e venda como conversões distintas,
gravar `order_id` desde o começo (BuyGoods `{ORDERID}`, Digistore24 `{transaction_id}`, ClickBank
`{receipt_id}`, CartPanda não expõe order id nos placeholders documentados) é o que torna a retração
por reembolso possível depois.

---

## Lacunas — o que exige login na conta da rede

Várias dessas documentações são acessíveis apenas a afiliados logados. Abaixo, o que **não** foi
possível confirmar publicamente, separado do que foi.

**Bloqueios de acesso encontrados nesta pesquisa**
- `https://adcombo.com/faq/` → **HTTP 403** sem autenticação. Nenhuma doc pública da AdCombo sobre
  postbacks/macros foi localizada.
- A tela de seleção de eventos do postback por oferta (BuyGoods, MaxWeb) não aparece em nenhuma doc
  pública — só o texto que confirma que "checkout visits" existe como evento rastreável.
- GuruMedia não publica **nenhuma** documentação de afiliado; o site só confirma que a rede roda
  Everflow.

**Por rede, o que precisa ser verificado no painel**

| Rede | O que confirmar logado |
|---|---|
| BuyGoods | Se o dropdown "Event type" do External Pixel do Google Ads oferece **Checkout** além de Purchase. Se o postback por oferta permite selecionar checkout como gatilho, e quais tokens vêm nele. |
| MaxWeb | Idem BuyGoods. A doc pública nomeia "Purchase" e "Page View" como Event types do pixel Google — confirmar se há um terceiro. |
| GuruMedia | Se as ofertas realmente expõem um **Event** de checkout/CC-submit ao partner, e o nome exato desse evento. Se a integração "Google Ads Integration For Partners" do Everflow está habilitada na instância deles. |
| Mediascalers | Mesma coisa, mais: **o nome do sub-parâmetro** em que o gclid é entregue (a doc pública se recusa a nomeá-lo). |
| SmartADV | Se existem eventos "Checkout"/"Add to Cart" reais nas ofertas (a doc só os cita como exemplos genéricos) e se a integração de partner com Google Ads existe na instância deles. |
| ClickBank | **Nada crítico.** Único ponto: se `ABANDONED_ORDER` do INS chega ao papel Affiliate (a doc marca os campos como do vendor e condiciona a "Cart Abandonment enabled"). Não é bloqueante, porque Order Form Impression e AddPaymentInfo já resolvem. |
| Digistore24 | Nada crítico — a doc pública é completa. Confirmar apenas a lista de "order events" selecionáveis na tela de integração do afiliado (a doc diz "choose which order events" sem enumerar naquele ponto; a tabela de eventos do IPN é a referência). |
| AdCombo | Tudo: macros, eventos, se existe algo entre `lead` e `sale`, e a janela típica de confirmação do call center. |
| Hotmart | Se o Pixel do Google Ads do **afiliado** aceita o evento Initiate Checkout (a doc de configuração do pixel Google não lista os eventos; a de configurações avançadas lista Initiate Checkout mas sem dizer para quais plataformas). Se o modo "API" está disponível para afiliado. |
| Braip | **Tudo.** Se afiliado pode registrar postback próprio, se `abandoned_cart` existe de fato, e quais macros. Nenhuma fonte primária pública. |
| Monetizze | Quais campos vêm no postback do afiliado e se algum carrega um click ID livre. Lembrar que a autorização é **por produtor**, produto a produto. |
| Eduzz | Se o afiliado recebe o webhook de carrinho abandonado dos produtos que promove e se consegue distinguir os próprios. |
| CartPanda | O que exatamente `initial_sale` significa — pedido criado ou pagamento capturado. E se existe algum evento de reembolso/chargeback fora dos três documentados. |

**Lacuna transversal que nenhuma doc responde**

A **pergunta 4 — atraso típico entre checkout e confirmação de venda — não é documentada por nenhuma
das treze redes.** Nenhuma publica SLA, distribuição ou mediana. Isso é observável apenas nos dados
do próprio operador (ou no painel logado, comparando timestamps de checkout e de venda aprovada).
Consequência de desenho: o sistema não deve assumir um atraso fixo por rede; deve **medir** o
intervalo checkout→venda a partir dos próprios eventos ingeridos e tratá-lo como propriedade
observada da rede/produto, não como constante configurada.

**Aviso sobre fontes secundárias**

Toda a primeira página de resultados de busca para "postback + [rede]" é dominada por documentação de
**trackers de terceiros** (Voluum, RedTrack, BeMob, AnyTrack, wecantrack, CPV Lab, Keitaro, Maxconv,
Cometly). Essas páginas frequentemente afirmam capacidades que a rede não documenta (ex.: "BuyGoods
supports InitiateCheckout added via script"). Elas costumam estar certas — os integradores testaram —
mas **não são fonte de fato** e não foram usadas como tal aqui. Onde a única evidência veio delas, o
ponto está marcado NÃO CONFIRMADO.
