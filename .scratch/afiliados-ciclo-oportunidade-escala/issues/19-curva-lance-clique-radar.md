# 19 — Curva lance→clique projetada no Radar

Type: grilling
Status: open
Blocked by: 17

## Question

Capacidade que não estava no mapa e apareceu na pesquisa do ticket 01:
`keywords_data/google_ads/ad_traffic_by_keywords` **projeta** impressões, cliques, CTR e CPC médio
para um conjunto de keywords **dado um lance e um match type** — ou seja, permite reconstruir a curva
lance→clique de um termo **antes de gastar qualquer budget**.

Isso toca diretamente o pedido original ("noção clara de oportunidades" e "balizar futuros
investimentos"), e o Radar hoje não tem nada parecido: `cpcMedioEsperado` é um número solto,
preenchido à mão, sem noção de quanto tráfego aquele lance compra.

Decidir:

- **Isso entra na decisão de aprovar teste, ou só informa?** Uma projeção que diz "a US$1,20 você
  compra ~90 cliques/mês neste termo neste geo" permite estimar quantos cliques o teto de teste
  compra — e portanto se o teto tem chance estatística de produzir o checkout que a regra exige
  (ticket 07). Se sim, isso é um pré-requisito de teste, não um enfeite.
- **Confiabilidade**: é projeção do Google, não medição. Ela entra no `scoreBreakdown` como
  componente, aparece como informação lateral, ou fica só na tela de detalhe?
- **Quantos pontos de lance** coletar por termo para desenhar a curva, e com que frequência
  re-coletar (o leilão muda). Cada ponto custa chamada.
- **Relação com o dado real**: quando a campanha rodar, o CPC real vai divergir da projeção. Guardar
  a projeção permite medir o erro e calibrar — vale modelar isso, ou é complexidade prematura?
- **Interação com `cpaAlvoBreakeven`**: dado o CPA alvo e a CVR esperada da oferta (`cvrRede` já
  existe no Radar), a curva lance→clique diz se existe lance viável. Isso é uma regra de descarte
  antes do teste — mais barato que descobrir gastando.

Bloqueado pelo ticket 17 porque a decisão depende de ver a resposta real do endpoint: a documentação
não deixa claro a granularidade nem a confiabilidade da projeção por geo.

**Nota (21/08/2026):** o endpoint citado é o wrapper da DataForSEO, que foi descartada. A capacidade
subjacente é do **Google Ads Keyword Planner** (`KeywordPlanIdeaService`), então ela sobrevive à troca
de fornecedor — mas o acesso a ela passa a depender do resultado do ticket 21. Se o stack Google de
custo zero for viável, esta projeção sai de graça pelo mesmo caminho do volume absoluto.
