# 15 — Atribuição de VendaAfiliado à Campanha

Type: grilling
Status: closed
Blocked by: 03
Assignee: claude

## Question

ROI mora na Campanha (travado no charting). Mas `VendaAfiliado` liga em `contaTrafegoId` e
`produtoId` — **nunca em `Campanha`**. Hoje é literalmente impossível calcular ROI real por campanha
a partir de vendas confirmadas.

Decidir:

- **`campanhaId` em `VendaAfiliado`**: obrigatório ou opcional? Vendas antigas não têm como saber.
  Opcional com `onDelete: SetNull` segue o padrão já usado em `produtoId`.
- **Como a venda descobre a campanha.** Depende do ticket 03:
  - Se a rede aceita **subid/parâmetro customizado**, o tracking link carrega o id da campanha e a
    venda chega atribuída. Definir o formato do subid e onde ele é gerado
    (`ContaTrafegoProduto.linkTracking` já existe como campo).
  - Se não aceita, sobra **atribuição por inferência** (produto + conta + janela de data) ou
    **atribuição manual** na tela de vendas.
- **Produto com várias campanhas simultâneas**: se a inferência é ambígua, a venda fica não-atribuída
  ou é rateada? Ratear corrompe o ROI por campanha, que é justamente o número que decide keep/kill.
- **Impacto nos rollups**: `recomputeProdutoRollups` e `roiReal`/`cpaReal` hoje são do produto.
  Ganham versão por campanha, ou o rollup do produto passa a ser soma das campanhas?
- **Refund e estorno**: `StatusVendaAfiliado` já tem `CANCELADA`/`ESTORNADA`. Definir se o ROI da
  campanha conta apenas `APROVADA`, e o que acontece quando uma venda vira estorno depois da decisão
  de escalar já ter sido tomada.

## Notas herdadas do ticket 03

**A atribuição automática é viável na maioria das redes** — o contrato de click ID existe e é
documentado. O que varia é o nome do parâmetro, não a capacidade:

- **ClickBank** — aceita `gclid` como parâmetro nomeado no HopLink; devolve `{receipt_id}`.
- **Digistore24** — `cid` + `sid1..sid5` no promolink, `{cid}` no postback, com limites documentados.
  É o contrato mais completo. Devolve `{transaction_id}`.
- **CartPanda** — `{cid}` desenhado para click ID, contrato quase idêntico ao da Digistore24
  (**um adapter serve as duas**). Mas **não expõe order id** nos placeholders documentados.
- **BuyGoods / MaxWeb** — capturam `gclid` por script próprio (`google_link_manager.js` + `&ga=1`).
  BuyGoods devolve `{ORDERID}`.
- **Everflow** (GuruMedia, Mediascalers, SmartADV) — `sub1..sub10` disponíveis, integração Google Ads
  para partners com gclid confirmada no nível da plataforma.
- **Hotmart** — o webhook de carrinho é do **produtor**, e o campo `affiliate` é apenas **booleano**:
  não identifica qual afiliado. Atribuição do lado do afiliado só por pixel próprio, com conversion
  ID + label, **não por gclid**. É a exceção que provavelmente força atribuição manual ou inferida.
- **AdCombo** — nada público; COD com confirmação por call center.

Consequências para este ticket:

- O identificador que chega **não é sempre `gclid`** — às vezes é subid opaco gerado por você.
  Decidir se `VendaAfiliado` guarda um par `(tipoIdentificador, valor)` em vez de um campo `gclid`.
- **Gravar `order_id` desde o início**, mesmo sem uso imediato: é o que permite retratar a conversão
  no Google Ads quando vier reembolso. Sem ele, retratação só por `gclid`+timestamp, que é frágil.
- O formato do subid precisa caber nos limites de cada rede e ser **decodificável de volta** para
  `campanhaId` — decidir entre id opaco com tabela de lookup e string estruturada.

## Answer

**`VendaAfiliado` (comissão confirmada pela rede) vira a fonte de verdade de ROI para as regras de
decisão; `CampanhaSnapshot.receitaConfirmada` (Ads) fica só como referência/auditoria.** Achado que
motivou a pergunta: `recomputeProdutoRollups`/`computeProdutoRollups`
(`src/lib/afiliados/rollups.ts:69-83`) já calculam `roiReal`/`cpaReal` hoje, mas a partir do valor de
conversão **reportado pelo Google Ads** no `CampanhaSnapshot` — que, pelo ticket 04, pode nem ter
valor em dólar quando `ConversionPoint = VALID_CC_SUBMIT` (conversão é contagem, não valor). Isso não
reabre os tickets 07/09/10: o ticket 08 já registrou essa lacuna como **"dependência formal (não
bloqueante) do ticket 15"**, e o ticket 09 já usa `VendaAfiliado` com `status = APROVADA`
diretamente — este ticket só cumpre o que os dois já anteciparam.

**`campanhaId` em `VendaAfiliado`: opcional, `onDelete: SetNull`** — mesmo padrão de `produtoId` no
mesmo model. Obrigatório quebraria toda importação/webhook quando a atribuição falhar.

**Atribuição: subid como caminho primário, atribuição manual como único fallback — sem inferência
automática.** A inferência (produto + conta + janela de data) foi eliminada do desenho porque, em
produto com campanhas simultâneas, ratear uma venda ambígua corrompe o ROI por campanha — o número
que decide keep/kill. Sem inferência, a pergunta "várias campanhas simultâneas: rateia ou fica
não-atribuída?" desaparece: ou o subid aponta uma campanha específica, ou a venda fica sem campanha
até atribuição manual na tela de vendas (cobre as exceções documentadas no ticket 03: Hotmart não
devolve identificador de afiliado, AdCombo não tem contrato público). `VendaAfiliado` passa a guardar
um par **`(tipoIdentificador, valor)`** em vez de assumir `gclid` fixo, **mais `orderId`** separado
desde já (habilita retratação de conversão no Ads quando vier reembolso, via upload offline do ticket
20, mesmo sem uso imediato).

**Valor do subid = o próprio `Campanha.id` (cuid), sem tabela de lookup.** Já é opaco, único e
estável. O limite mais apertado documentado no ticket 03 é Digistore24/CartPanda (`campaign key ≤ 127
caracteres`) — um cuid (~25 caracteres) cabe folgado. Nenhuma entidade nova de lookup é necessária;
"decodificável de volta" é trivial porque o valor recebido no postback **é** o `campanhaId`.

**`Campanha` ganha rollups próprios: `gastoTotalAcumulado`, `receitaConfirmadaAcumulada`, `roiReal`,
`cpaReal`**, calculados por um novo `recomputeCampanhaRollups` — gasto = snapshot mais recente
daquela campanha (mesma convenção já usada em `computeProdutoRollups`, CSV tratado como acumulado até
a data); receita = **soma** de `VendaAfiliado.valorComissao` onde `status = APROVADA` e
`campanhaId` = a campanha. `ProdutoAfiliado.roiReal`/`cpaReal` e `recomputeProdutoRollups` **não
mudam** — continuam ad-based, papel de auditoria/referência no grão de produto, desacoplados do novo
cálculo por campanha (produto não vira soma dos rollups de campanha).

**Refund/estorno: só `APROVADA` conta na soma** (filtro já embutido no `recomputeCampanhaRollups`
acima). Estorno chegando depois de uma campanha já promovida a `ESCALANDO` **não** reverte a
promoção — a mão-única do ticket 09 (`ESCALANDO` só sai por `PAUSADO`/`ENCERRADO`) continua valendo.
O estorno só reduz o `roiReal` recalculado, que aparece naturalmente no próximo ciclo de mensuração
**mensal** do ticket 10 como um item de diagnóstico keep/kill — sem gatilho especial de reação a
estorno.

**Schema novo decidido aqui** (aplicar junto da redação da OpenSpec change, mesmo padrão dos tickets
05/11/14): `VendaAfiliado.campanhaId String?` + relação `onDelete: SetNull`;
`VendaAfiliado.tipoIdentificador`/`valorIdentificador` substituindo a suposição de `gclid` fixo;
`VendaAfiliado.orderId String?`; `Campanha.gastoTotalAcumulado`, `receitaConfirmadaAcumulada`,
`roiReal`, `cpaReal`.

**Fog de execução (não de domínio):** `ContaTrafegoProduto.linkTracking` virar template de URL com
placeholder do subid (`Campanha.id`) em vez de link fixo por conta+produto — é implementação, não
decisão de modelo, registrado em "Not yet specified".

Não desbloqueia nenhum ticket aberto — 17, 19, 23 seguem em outras frentes; **20 (upload de conversões
offline) estava bloqueado por 15 e agora está desbloqueado** (dependia também do 04, já fechado).
