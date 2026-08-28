# 01 — DataForSEO: cobertura, granularidade e custo

Type: research
Status: resolved
Blocked by: —

## Question

O híbrido "volume absoluto + índice relativo" pode ser servido por um fornecedor só?

Levantar contra a documentação oficial da DataForSEO:

- Quais endpoints entregam **volume de busca absoluto** por keyword por geo, com que profundidade
  histórica, com que atraso e com que arredondamento (faixas do Keyword Planner ou número real).
- Quais endpoints entregam **série relativa tipo Google Trends** (índice 0–100), com que resolução
  (diária/semanal/mensal) e que geos.
- Se os dois vêm da mesma conta/credencial ou exigem produtos separados.
- Modelo de cobrança (por chamada? por keyword? por task?), rate limits, e custo estimado para o
  volume de uso realista deste módulo: dezenas de produtos × alguns termos × poucos geos, atualizado
  semanalmente (série de aprendizado) e diariamente para campanhas vivas.
- Se existe endpoint de **CPC/competição** que substitua a consulta manual de `cpcMinimo`/`cpcMaximo`/
  `cpcMedioEsperado` que hoje é preenchida à mão no Radar.

Saída: ficha de fatos suficiente para decidir *um fornecedor vs dois* e para dimensionar o custo
mensal antes de abrir conta.

## Asset

Achados da pesquisa, com URL em cada afirmação: `../research/01-dataforseo.md` (421 linhas).

## Answer

**Um fornecedor resolve o híbrido.** Volume absoluto e índice 0–100 saem da mesma credencial Basic
Auth e do mesmo saldo pré-pago, em endpoints de famílias diferentes.

Cinco achados que passam a valer como restrição de desenho:

1. **Cadência diária no lado absoluto é ilusão.** `keywords_data/google_ads/search_volume` atualiza
   **uma vez por mês** e `date_to` não passa do mês anterior — pollar diariamente devolve o mesmo
   número por ~30 dias. O gatilho correto é o booleano `actual_data` de `keywords_data/google_ads/status`,
   que avisa quando o mês fechou. **Só o Trends tem cadência diária.** Isso resolve, de fora, parte da
   pergunta de cadência do ticket 05: as duas séries não são duas resoluções da mesma coisa, têm
   relógios diferentes por natureza da fonte.
2. **Batchear keywords no Trends corrompe a série.** Com 5 keywords numa task, o índice 100 passa a
   ser o pico **do conjunto**, não de cada termo — séries menores ficam achatadas silenciosamente.
   Nenhuma página da DataForSEO menciona isso (é comportamento do próprio Google Trends). Consequência
   dura: **1 keyword por task**, e uma série de termo só é comparável consigo mesma ao longo do tempo,
   nunca com a de outro termo. Isso limita o que a regra de curva ascendente (ticket 06) pode afirmar.
3. **Cobrança por task, não por keyword**, na Keywords Data API — "the price for 1 or 1000 keywords
   will be the same". As ~150 keywords do projeto cabem numa task só (limite 1000): volume absoluto
   para 3 geos custa ~**$0,27/mês**. O custo real é quase todo Trends, que tem teto de 5 keywords/task
   — e o achado 2 obriga a 1 por task. Faixa estimada: **$14,85/mês** (mínimo viável) a **$80,60/mês**
   (tudo live). Recomendado ~**$18/mês** (1 keyword/task no Trends, fila standard). Depósito mínimo
   **$50** = ~3 meses de runway.
4. **O preenchimento manual de CPC no Radar morre.** `low_top_of_page_bid` / `high_top_of_page_bid` /
   `cpc` já vêm **na mesma resposta do volume, sem custo extra**, e mapeiam direto em
   `cpcMinimo` / `cpcMaximo` / `cpcMedioEsperado`. Além disso apareceu capacidade não prevista no mapa:
   `ad_traffic_by_keywords` **projeta** impressões/cliques/CPC dado um lance e match type — permite
   reconstruir a curva lance→clique **antes** de gastar budget. Virou o ticket 19.
5. **"Idade da oferta" não tem endpoint dedicado, e o melhor proxy não é o esperado.** WHOIS é busca
   filtrada sobre base própria de 286M domínios, não lookup ao vivo — domínios de VSL de nutra
   recém-registrados podem simplesmente não estar lá. O sinal melhor é
   `backlinks/timeseries_summary` (desde 2019-01-30, granularidade day/week/month): a **forma da curva
   de aquisição de links** separa "novo" de "recuperação" melhor que data de registro, porque um
   domínio de 2019 relançado hoje tem data antiga e comportamento de produto novo. Anotado no ticket 06.

**Duas verificações pendentes, ambas resolvidas por chamada real** (passo 3 do ticket 17, não por
mais leitura de documentação):

- **Granularidade do Trends é indocumentada.** Nem DataForSEO nem Google publicam o mapeamento
  `time_range` → diária/semanal/mensal; a única evidência é a amostra oficial (1 ano → buckets de
  7 dias). Se `past_30_days` não devolver granularidade diária, o acompanhamento diário de campanha
  viva perde a base — e o ticket 08 (Trends como insumo de re-teste) muda de forma.
- **Preços das amostras da doc estão ~20% abaixo das pricing pages**, consistentemente, em cinco APIs.
  A estimativa usou as pricing pages (mais conservador); a discrepância segue sem explicação na doc.

13 lacunas adicionais listadas na seção final do arquivo de achados.
