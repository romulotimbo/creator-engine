# 04 — O que é um "checkout" no domínio

Type: grilling
Status: closed
Blocked by: 03
Assignee: claude

## Question

"Checkout" entrou nas regras de teste como unidade de contagem, mas não existe no domínio.
`ConversionPoint.VALID_CC_SUBMIT` existe no enum, e nada o conta.

Decidir:

- Checkout é uma **entidade própria** (evento contável com data, campanha e origem), um **contador
  derivado** de conversões-Ads, ou um **campo em `CampanhaSnapshot`**?
- Relação com `VendaAfiliado`: um checkout que vira venda é o mesmo registro em dois estados, ou
  dois registros distintos?
- Relação com `ConversionPoint`: para ofertas cujo conversion point **já é** `VALID_CC_SUBMIT`,
  checkout e conversão são a mesma coisa — as regras de teste ainda fazem sentido nesse caso, ou
  precisam de leitura diferente?
- O que significa **"checkout relevante"** na regra de alerta (comissões > US$100, primeiro checkout
  entre 50–60% da comissão gasta)? "Relevante" qualifica o quê — quantidade, recência, qualidade?
- Se a pesquisa do ticket 03 disser que alguma rede só entrega checkout manualmente: entrada manual
  na ficha da campanha é aceitável, ou a regra simplesmente não se aplica a essa rede?

## Notas herdadas do ticket 03

A pesquisa transformou este ticket: a pergunta deixou de ser "checkout existe?" e passou a ser
**"o que a regra faz quando a rede não tem checkout?"**.

- **A disponibilidade varia radicalmente.** ClickBank tem checkout como evento de afiliado *e* push
  nativo para o Google Ads. CartPanda tem `initiate_checkout` em postback S2S. MaxWeb e BuyGoods
  nomeiam checkout no postback, mas o caminho até o relatório do Ads ficou NÃO CONFIRMADO.
  Digistore24 **não tem** evento de checkout. Everflow (GuruMedia/Mediascalers/SmartADV) depende do
  anunciante. AdCombo não tem nada público — e é COD, onde `lead` ocupa o lugar funcional do checkout.
- **Portanto o domínio precisa de degradação explícita por rede**, não de um campo opcional. Decidir
  a hierarquia: a regra (a) não se aplica e a campanha usa outro critério de corte, (b) cai para
  entrada manual, ou (c) usa um substituto declarado (lead no COD, AddPaymentInfo no ClickBank).
  Uma quarta pergunta aparece: o **`ConversionPoint` da oferta** já distingue `SALE` de
  `VALID_CC_SUBMIT` — a degradação mora ali ou num campo novo por rede?
- **Nova opção arquitetural de peso:** Ads Scripts fazem upload de conversões offline, então o
  checkout pode ser empurrado para o Google Ads como conversion action nativa e voltar pelo **mesmo
  caminho de ingestão dos outros grãos** (ticket 20). Se isso for adotado, "checkout" talvez **não
  precise de entidade própria** no Creator Engine — vira apenas mais uma coluna de conversão no
  snapshot. Essa é provavelmente a decisão central deste ticket, e ela depende do ticket 20.
- **Atraso checkout→venda não é publicado por nenhuma rede.** Não modelar como configuração; medir
  como propriedade observada a partir dos eventos ingeridos.
- **Gravar `order_id` desde o primeiro dia**, mesmo sem uso imediato: é o que permite retratar a
  conversão quando vier reembolso (`RETRACTION` prefere `order_id`). Disponível como `{ORDERID}`
  (BuyGoods), `{transaction_id}` (Digistore24), `{receipt_id}` (ClickBank) — **e ausente na
  CartPanda**, o que limita retratação lá.

## Resolution (24/08/2026)

**Escopo travado primeiro:** resolvido **sem** depender do ticket 20 (upload de conversões offline
via Ads Scripts). O ticket 20 tem uma pergunta de fronteira anterior ("enviar conversão conta como
'escrever no Google Ads'?") que é do operador, não uma consequência técnica deste ticket — misturar
as duas sessões arriscava condicionar o modelo de checkout a uma resposta ainda não dada. Se o 20 for
aprovado depois, o pior caso é uma coluna redundante e fácil de deprecar, nunca uma migração.

1. **Forma do dado:** checkout é um **campo em `CampanhaSnapshot`** (`checkoutsCount`, contagem por
   campanha × dia) — não entidade própria, não apenas uma reinterpretação da métrica de conversão do
   Ads. A granularidade que as regras de teste exigem (campanha × dia) não pede atributos por evento
   individual; criar uma entidade só para contar linhas duplicaria o que `CampanhaSnapshot` já faz.
2. **Relação com `VendaAfiliado`:** contadores **independentes**. Sem tentativa de reconciliar
   checkout individual → venda individual (não há order_id nesta camada). Uma eventual taxa de
   conversão checkout→venda, se vier a interessar, seria leitura estatística cruzando as duas séries
   por período — não um join por evento. Reconciliação por order_id fica fora deste ticket; se virar
   necessária, é projeto à parte que pode reabrir o ticket 20.
3. **Relação com `ConversionPoint`:** quando a oferta já tem `ConversionPoint = VALID_CC_SUBMIT`,
   `checkoutsCount` **é** a mesma métrica de conversão já ingerida como conversão primária — sem
   segunda coleta. `VALID_CC_SUBMIT` como conversion point já significa, por definição, que a oferta
   trata isso como o evento final medido.
4. **"Checkout relevante" na regra de alerta (>US$100):** significa **presença** — `checkoutsCount > 0`
   até o ponto do gasto. Sem dimensão de qualidade ou recência: o dado (contagem diária sem detalhe de
   evento) não sustenta nada mais fino. Um piso maior que zero, se necessário, é parâmetro ajustável
   depois — não decidido aqui sem dado real para calibrar.
5. **Degradação por rede:** `checkoutsCount` suporta **três estados** por dia — valor real (ingestão
   automática quando a rede/Ads Scripts entrega), valor manual (operador digita na ficha da campanha),
   e "não coletado" (null, distinto de zero) — mesmo padrão de três estados que `SerieTermo` (ticket
   05) já usa. Este ticket só estabelece que o dado suporta os três estados; **como a regra de teste
   reage a "não coletado"** (trava a decisão, degrada para outro critério, ou ignora) fica para o
   ticket 07, que herda essa forma para codificar o comportamento.

Desbloqueia o ticket 07.
