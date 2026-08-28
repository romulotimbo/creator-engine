# Mapa — Afiliados: ciclo oportunidade → teste → escala

Label: wayfinder:map

## Destination

Decisões travadas e uma **OpenSpec change escrita e pronta para implementar** que cobre o ciclo
completo do módulo de Afiliados — radar de oportunidade, fase de teste, fase de escala e a camada
de aprendizado cross-produto — em nível de **modelo de domínio, contratos de ingestão de dados e
regras de decisão codificadas**. Não é implementação: ao fim do mapa, `/openspec-propose` é mecânico.

## Notes

**Domínio.** `CONTEXT.md` (linguagem keep/kill: Diagnóstico de Campanha vs Viabilidade do Produto,
Falha de Execução vs Falha de Mercado) e `docs/mapeamento-campos-decisao-campanha.md` (8 blocos de
campos de decisão). Skill de domínio: `anthropic-skills:mentor-google-ads-afiliados`.

**Skills por sessão.** `/grilling` + `/domain-modeling` como padrão; `/research` para tickets AFK;
`/prototype` onde a pergunta for "como isso se parece".

**Tracker.** Local markdown — este mapa e `issues/NN-*.md`. Nenhum issue tracker está configurado
neste repo (`docs/agents/` não existe).

**Decisões travadas na sessão de charting** (valem para todo o mapa, não relitigar):

- O sistema **recomenda, nunca escreve** no Google Ads. Loop de controle automático está fora.
- **ROI mora na Campanha.** Métricas por termo são instrumento tático dentro da campanha viva —
  nunca base de ROI nem do aprendizado.
- **Plataforma = rede de afiliado** (BuyGoods, GuruMedia, ClickBank…), não plataforma de ads.
- Ingestão do Google Ads via **Google Ads Scripts** como caminho primário; CSV como fallback e
  backfill; API oficial como upgrade futuro sem trocar o modelo de domínio.
- Demanda de busca é **híbrida**: volume absoluto (escala) + índice relativo (timing), guardados
  como séries distintas com unidade explícita. **Fonte ainda não decidida** — DataForSEO foi
  descartada em 21/08/2026 por exigir depósito de US$50 para destravar o próprio crédito de trial
  (ver ticket 17). O stack Google de custo zero está em pesquisa no ticket 21. As restrições do
  dado, porém, **não dependem do fornecedor**: são propriedades do Google (volume mensal e
  arredondado; índice relativo normalizado intra-requisição).
- **Fila de decisão codificada** é o mecanismo canônico de "decida agora", estendendo o padrão
  `isReviewDue` / `nextReviewAt` já existente. Limiares: **padrões globais com override por produto**.
- Gatilhos de teste são por **gasto acumulado, nunca por tempo** ("no Google Ads o tempo de
  veiculação não importa, importam os dados acumulados"). Tetos expressos em **múltiplos de comissão**,
  derivados e não armazenados.
- Escala inverte isso: variação diária **não** decide nada; a decisão é manual, em janela
  **semanal e mensal** — "estou ganhando muito mais do que perdendo no mês inteiro?".
- Aprendizado = **visão comparativa + prior explícito no Radar**. Prior **não aparece** quando o
  histórico é raso. ML está fora.
- Séries de busca são insumo do **ciclo inteiro**, não só do radar: queda no Trends muda o CPA alvo
  de uma campanha viva.
- **Entrega terminal em duas fases (decidido em 27/08/2026).** A redação da OpenSpec change **não
  espera 17/19/23 fecharem** — esses três são um fio só (automação de volume de busca via Google
  Keyword Planner API, preso à aprovação humana da Google, sem prazo). Fase 1 escreve a OpenSpec
  change com tudo que já está fechado (ingestão, `VendaAfiliado`→Campanha, fila de decisão,
  segmentos, ajustes, máquinas de estado, LP bridge, checkout, upload de conversão offline) —
  destrava implementação já. A automação de demanda de busca (17, 19) entra como seção/fase separada,
  redigida quando aquele fio fechar. Isso não é decisão de ticket, é escopo da entrega do mapa.

**Lacunas conhecidas no schema atual** (fatos, já verificados): `VendaAfiliado` não tem `campanhaId`;
não existe entidade de LP bridge; não existe grão de dispositivo; `geo` é string única na `Campanha`;
`criterioPausa`/`criterioEscala` são texto livre que não executa nada; "checkout" não existe como
evento contável.

## Decisions so far

<!-- uma linha por ticket fechado -->

- [DataForSEO: cobertura, granularidade e custo](issues/01-dataforseo-cobertura-custo.md) — um
  fornecedor resolve o híbrido (~$18/mês, depósito mínimo $50). Volume absoluto atualiza **mensalmente**
  (gatilho é `google_ads/status.actual_data`, não cron diário); só o Trends tem cadência diária.
  Batchear keywords no Trends corrompe o índice → **1 keyword por task**, e série de termo só é
  comparável consigo mesma. CPC do Radar deixa de ser manual (vem grátis com o volume). Duas
  verificações dependem de chamada real, não de doc: granularidade do Trends e discrepância de preço.
- [Google Ads Scripts: o que dá para extrair e com que cadência](issues/02-google-ads-scripts-extracao.md) —
  os três grãos cabem em Scripts, nenhum exige a API (o motor de relatórios *é* a API, via GAQL).
  Três consequências de modelo: **dia sem métrica não retorna linha** (ausência = zero, calendário
  tem que ser materializado); **soma dos termos nunca bate com o total da campanha** (omissão por
  limiar de privacidade, textual na doc, não é bug); **`segments.device` tem 7 valores, não 3**.
  Geo tem dois recursos distintos — `user_location_view` é o acionável. Dinheiro vem em micros.
  Ambiguidade a confirmar na UI: se agendamento horário existe (a Central de Ajuda e
  developers.google.com se contradizem). Registrado também que "a API exige aprovação" está
  parcialmente desatualizado (hoje há Explorer Access por padrão) — a escolha por Scripts segue
  válida pelos motivos operacionais, mas a premissa original não é mais exata.
- [Evento de checkout e postback nas redes de afiliado](issues/03-checkout-postback-redes.md) — a
  capacidade **varia radicalmente por rede**, de "resolvido de fábrica" (ClickBank: checkout como
  evento de afiliado + push nativo pro Google Ads) a "inexistente" (AdCombo, COD por call center).
  Nenhuma regra de checkout pode assumir disponibilidade uniforme. CartPanda e Digistore24 dividem
  o mesmo contrato de placeholders (um adapter serve as duas). GuruMedia/Mediascalers/SmartADV são
  Everflow — plataforma capaz, oferta a confirmar. Achado que muda o desenho: **Ads Scripts fazem
  upload de conversões offline** (`forOfflineConversions()`), então checkout pode virar conversion
  action nativa e chegar pelo mesmo caminho — virou o ticket 20. Atraso checkout→venda **não é
  publicado por nenhuma rede**: medir como propriedade observada, não configurar por rede.

- [Stack Google de custo zero: as três incógnitas](issues/21-stack-google-custo-zero.md) — **GO
  parcial, e o corte cai no meio do híbrido.** Volume absoluto é gratuito mas atrás de **duas
  aprovações humanas** da Google (Basic Access **e** permissible use "Researching keywords") — a
  restrição é do *token*, não da conta, então gasto real não ajuda. Índice relativo **não tem
  caminho gratuito oficial**: a API de Trends segue alpha inacessível (docs em 404) e `pytrends` foi
  arquivado. Scripts→Keyword Planner é impossível por **ausência de superfície**, não por cota:
  volume de busca não é campo GAQL em lugar nenhum — mas a ingestão de performance decidida no
  ticket 02 segue intacta, porque Scripts não usa developer token. Compensação não prevista:
  `monthly_search_volumes[]` traz **4 anos de série mensal na mesma chamada**. Alternativa gratuita
  e sem fila: **Bing Webmaster Tools** `GetKeywordStats`, que dá série temporal por geo e não exige
  `siteUrl`.
- [O híbrido sobrevive? Qual sinal de demanda o Radar usa de fato](issues/22-sinal-de-demanda-obtenivel.md) —
  **o híbrido original colapsa** (não há caminho oficial gratuito para o índice 0–100); volume
  absoluto (Keyword Planner) vira sinal único de escala e de tendência grosseira. Regra de re-teste
  sobrevive em base mensal; acompanhamento diário de campanha viva é **descartado**. Bing entra só
  como coleta silenciosa desde já (`fonte=BING`, `unidade=IMPRESSOES`), sem alimentar nenhuma regra
  ainda — acumula histórico para medir correlação com o Google no futuro. Plano B se a aprovação da
  Google falhar: Bing + export manual da UI, **sem** reabrir fornecedor pago. Série é **opcional** no
  modelo — Radar opera degradado sem ela, com um terceiro estado explícito "sem dado" ≠ "demanda
  zero". Desbloqueia o ticket 05.
- [Modelo de domínio: Termo e série de busca](issues/05-modelo-termo-serie-busca.md) — `Termo`
  pertence ao produto (não é global, sem tabela de ligação). `SerieTermo` é uma entidade só, chave
  `(termoId, geo, fonte, data)`, com os três estados (não coletado / sem dado / zero confirmado)
  resolvidos por ausência-de-linha + `valor` nullable, sem coluna extra. `Termo` liga a
  `OfertaDecisao` **ou** `ProdutoAfiliado` (nunca os dois, nunca `Campanha`), seguindo o padrão de
  herança-por-cópia que `ProdutoAfiliado` já usa para outros campos herdados da Oferta. Sem migração
  (`keywordsPrioritarias` vazio na base) — campos manuais antigos só marcados deprecated, sem drop de
  coluna. Cadência de coleta fica fora do modelo, é escopo do ticket 14. Desbloqueia o ticket 06.
- [Regra de oportunidade: o que é uma "curva ascendente"](issues/06-regra-curva-ascendente.md) —
  **busca é o portão, rede é modificador de prioridade**: busca caindo exclui sempre (sem bucket de
  "alerta" separado); busca subindo com rede caindo é prioridade máxima (janela pré-concorrência),
  busca e rede subindo juntas é prioridade média. Usa as duas janelas prontas do Keyword Planner
  (`Three month change` + `YoY change`), piso de magnitude **40%** (2 degraus da escada de
  quantização), exceção para saída-do-zero (`YoY=∞`) sujeita só ao piso de volume. "Novo" vs
  "recuperação" cai de graça da mesma mecânica. Sazonalidade **não é filtrada** — aceita falso
  positivo, mas a fila registra qual janela disparou. Piso de volume **300 buscas/mês**, default
  global com override por produto. Um item de fila por `OfertaDecisao` (não por termo), termos
  disparadores em breakdown estilo `scoreBreakdown`; Competition e Top of page bid entram como
  enriquecimento sem gate. Desbloqueia parcialmente o ticket 18 (ainda preso a 07, 08, 10).
- [O que é um "checkout" no domínio](issues/04-definicao-de-checkout.md) — resolvido sem depender do
  ticket 20 (upload offline via Ads Scripts); revisitar se o 20 for aprovado depois. Checkout é
  **campo em `CampanhaSnapshot`** (`checkoutsCount`, por campanha × dia), não entidade própria.
  Contador **independente** de `VendaAfiliado` (sem reconciliação por evento). Quando
  `ConversionPoint = VALID_CC_SUBMIT`, `checkoutsCount` é a própria métrica de conversão primária, sem
  segunda coleta. "Checkout relevante" no alerta >US$100 = presença (`> 0`), sem qualidade/recência.
  Suporta **três estados** (real / manual / não coletado), mesmo padrão de `SerieTermo`; como a regra
  reage a "não coletado" fica para o ticket 07. Desbloqueia o ticket 07.
- [Regras de teste inicial: teto por faixa de comissão e alerta de checkout](issues/07-regras-teste-inicial.md) —
  faixas de comissão são **cumulativas**: teto de gasto uniforme (**100% da comissão** em toda faixa
  ≤ US$100; US$100 fixo acima disso), gate de checkout cresce e herda faixa a faixa (0 → 1 → 2 → 2
  herdado), resolvendo de graça o buraco da faixa 80–100. Ausência de checkout **não** cria um segundo
  teto mais baixo — é evidência anexada ao item da fila de decisão no teto ("sistema recomenda, nunca
  escreve"). Alerta da faixa >US$100 (checkout entre 50–60% do teto) é **gatilho de fila próprio**,
  mais cedo que o teto final. Moeda: **tudo em USD, sem conversão** — pressuposto operacional
  explícito, `Campanha.moeda` não é lido por esta regra. Limiares moram em mecanismo **genérico
  reutilizável** (`LimiarGlobal` chave+Json global, `ProdutoAfiliado.limiaresOverride` Json por
  produto) — não bespoke, serve os próximos tickets de limiar (08, 09, 10). `criterioPausa` sobrevive
  como anotação humana livre, não deprecado. Desbloqueia o ticket 09.
- [Regras de re-teste e perfil de fôlego financeiro](issues/08-regras-reteste-folego.md) — árvore
  única, não duas somadas: teto batido + 1-3 vendas confirmadas (`VendaAfiliado`, nível **Campanha**,
  não Produto — dependência formal do ticket 15 pro `campanhaId`) + ROI empatando (±10%) é a
  pré-condição; dentro dela, Trends decide entre extensão de 1 comissão (default) ou 1-2 comissões
  (Trends estável/crescendo) vs. recomendar reduzir CPA 5-10% sem estender (Trends em queda). Correção
  de vocabulário: **"Trends" não é o índice do Google especificamente** — é nível de buscas por
  qualquer ferramenta (Glimpse/SEMrush/Flowspy/Google), inserido manualmente, em duas unidades
  possíveis (índice 0-100 ou volume absoluto), o que amplia o `SerieTermo` do ticket 05 (nova nota em
  "Not yet specified"). Fôlego financeiro é **teto absoluto em dólar por cima da extensão em
  comissões** (o menor dos dois vale): US$200 perfil inicial, US$600 caixa formado, acumulado **por
  produto** entre campanhas ligadas via `campanhaOrigemId` (nunca reseta ao trocar de conta — só o
  perfil caixa formado pode trocar de conta). Promoção de perfil é manual, sem fila. Desbloqueia
  parcialmente o ticket 18 (segue preso ao 10).
- [Gatilho de entrada em escala](issues/09-gatilho-entrada-escala.md) — promoção TESTANDO →
  ESCALANDO exige **volume mínimo de vendas confirmadas + ROI acumulado com folga real sobre
  breakeven** (não empate — isso é reservado ao re-teste do ticket 08); `cpaReal < cpaAlvoBreakeven`
  isolado não é gate, fica subsumido no corte de ROI. **Nunca automática** — generaliza "o sistema
  recomenda, nunca escreve" do ticket 07 para qualquer transição de estado interno, sempre item de
  fila confirmado pelo operador. **Mão única**: uma vez `ESCALANDO`, só sai por `PAUSADO`/`ENCERRADO`
  (diagnóstico do ticket 10), nunca de volta a `TESTANDO`. Gatilho é **por Campanha**, nunca por
  Produto — duas campanhas do mesmo produto podem estar em estados diferentes, coerente com
  `CONTEXT.md`; **`ProdutoAfiliado.statusOperacional` fica deprecado** (mesmo padrão de
  `criterioPausa`/`keywordsPrioritarias`, sem drop de coluna). Corte teste↔escala é o próprio
  `Campanha.status`, binário: regras do ticket 07 só rodam em `TESTANDO`, do ticket 10 só em
  `ESCALANDO`, sem período híbrido — mas alertas do ticket 07 podem seguir disparando em paralelo
  enquanto uma promoção já sinalizada aguarda confirmação do operador. Desbloqueia o ticket 10.
- [Regras de escala: mensuração semanal/mensal e ritmo de aumento](issues/10-regras-escala-mensuracao-ritmo.md) —
  janela canônica de decisão é o **mês calendário** (semana é leitura auxiliar, nunca gera item de
  fila própria); corte de continuidade é **ROI mensal via `LimiarGlobal`**, binário, sem zona
  intermediária — abaixo do limiar vira item de **diagnóstico** (keep/kill), nunca recuo automático.
  Acompanhamento frequente de gasto vira **alerta de ritmo de entrega** (gasto do dia × budget
  diário), puramente informativo — `alertaOrcamentoEstourado` não se aplica em `ESCALANDO` (não tem
  teto). Regra dos 5–10% é item de fila único (budget + CPA juntos); "otimizar segmentos antes"
  (ticket 11) é lembrete textual, não gate, até esse ticket fechar. **Tensão central resolvida**:
  "recuar imediatamente" usa janela de **3 dias pré/pós ajuste** (não o dia isolado, não o mês),
  gatilho = virada pra ROI negativo, item de fila escopado ao ajuste específico, pausa a sugestão de
  aumento enquanto ativo. Ambas as regras de ritmo (sugestão de aumento e recuo) herdam do ticket 12
  a necessidade de saber data/valor do último ajuste — não resolvido aqui, registrado lá. Nota
  herdada do ticket 02 (ambiguidade de agendamento horário) fecha como **moot**: nenhuma regra deste
  ticket precisa de grão intra-dia. Desbloqueia totalmente o ticket 18 (que já tinha 06, 07, 08
  fechados).
- [Modelo da fila de decisão](issues/18-modelo-fila-decisao.md) — `ItemFila`, tipo único com
  referência polimórfica fraca (`tipoAlvo` `OFERTA`|`CAMPANHA` + `alvoId` sem FK, mesmo padrão do
  Estúdio de Vídeo). Híbrido: condição de disparo pura em runtime, ciclo de vida persistido (5
  estados: `ABERTO`/`ADIADO`/`APLICADO`/`DISPENSADO`/`EXPIRADO`, dedup por `(regra, tipoAlvo,
  alvoId)` só enquanto não-terminal). Prioridade (`ALTA`/`MEDIA`/`BAIXA`) é atribuída por cada regra,
  nunca calculada pela fila — sem score cross-regra. Superfície dupla (fila própria canônica com
  ação + embed read-only nas fichas de campanha/oferta, mesma tabela). Contrato de push não pede
  campo dedicado: `resumo` textual + timestamps + prioridade bastam, push é leitor puro por cima.
  Não desenha `AjusteCampanha` (ticket 12, segue bloqueado por 11) — só deixa `APLICADO` como gancho.
- [Segmentos geo × dispositivo dentro da campanha](issues/11-segmentos-geo-dispositivo.md) —
  `SegmentoCampanhaSnapshot` genérico por dimensão (`GEO`|`DISPOSITIVO`), chave
  `(campanhaId, dimensao, valor, data)`, **sem cruzamento** geo×device (marginal por eixo, não
  interseção — nenhuma regra hoje pede o cruzamento que a API entrega de graça). Cadência **diária**
  (a premissa "mesmo grão semanal dos termos" estava obsoleta desde o fechamento do ticket 05). Geo
  usa só `user_location_view` (detecta vazamento), só nível país (sem os 11 `geo_target_*`), cache de
  nomes em memória (não tabela). Coleta de segmento é **incondicional**, mesmo campanha de país único
  — `Campanha.geo` (alvo declarado) e o segmento (real observado) não se reconciliam por constraint.
  Dispositivo guarda os 7 valores crus da API, UI/regra filtra os 3 acionáveis. Regra de recomendação
  roda só em `ESCALANDO` (gancho já deixado pelo ticket 10), janela **mês calendário**, limiares via
  `LimiarGlobal` (`segmento.volumeMinimoConversoes`=3, `segmento.diferencaCpaMinimaPct`=25, defaults
  de partida). Um `ItemFila` por campanha por mês (`escala.otimizacaoSegmento`), geo e dispositivo
  combinados no mesmo item. Desbloqueia o ticket 12.
- [Registro dos ajustes aplicados manualmente](issues/12-registro-de-ajustes.md) — `AjusteCampanha`,
  captura híbrida (confirmação de `ItemFila` **ou** registro manual na ficha, nunca detecção por
  diff). Campo `origem` (`FILA`|`MANUAL`) resolve de graça os ajustes fora da fila. `tipo` de três
  valores (`BUDGET`|`CPA_ALVO`|`LANCE_SEGMENTO`), `valorAnterior`/`valorNovo` homogêneos como
  `Decimal?` — para segmento guarda o percentual aplicado, sem lance-base conhecido pelo sistema.
  Confirmar um item de fila **exige digitar o valor real aplicado**, não assume a faixa recomendada.
  `data` é timestamp completo, editável (retroagir) só quando manual — fixo no instante da
  confirmação quando vem da fila. `itemFilaId` é 1-para-N: um item que empacota geo+dispositivo
  (ticket 11) pode gerar um `AjusteCampanha` por segmento confirmado. `motivo` opcional nos dois
  casos de origem. Não desbloqueia nenhum ticket aberto.
- [Reconciliar as máquinas de estado (Oferta × Produto × Campanha)](issues/16-maquinas-de-estado.md) —
  "onde mora o ciclo de vida" não foi reaberto (já fechado no ticket 09). `ProdutoAfiliado.status`
  muda de papel: de fase de teste para presença no catálogo (`ATIVO`/`PAUSADO`/`ARQUIVADO`),
  ortogonal ao estado de qualquer campanha. `OfertaDecisao.statusDecisao` **congela** na conversão
  pra produto — `EM_EXECUCAO` vira terminal, `PAUSADO`/`DESCARTADO` só valem pré-conversão. Falha
  de Execução vs Falha de Mercado vira campo estruturado `Campanha.motivoEncerramento` (enum,
  nullable, preenchido em `PAUSADO`/`ENCERRADO`) — direto na campanha, não só no log, porque a
  Viabilidade do Produto precisa filtrar por ele sem join. Histórico ganha `CampanhaStatusLog`
  (mesmo formato do `PersonaStatusLog`), só para `Campanha` — sem equivalente em produto ou oferta.
- [LP bridge como entidade categorizável](issues/13-lp-bridge-entidade.md) — **atributo da campanha,
  não entidade**: cada teste sobe bridge nova, sem reuso, então não há identidade a preservar. Enum
  fechado (`TSL`/`VSL`/`ADVERTORIAL`/`QUIZ`/`REVIEW`/`DIRECT_LINK`/`OUTRO`), não tabela editável — fica
  pra quando a sugestão automática existir de fato. Só `tipo` + `observacoes` texto livre, sem
  campos estruturados extra (idioma, tempo de carregamento…) até uma regra real pedir. Vínculo
  1-para-1 (A/B de bridge vira duas campanhas separadas, já comparável hoje). Campos novos em
  `Campanha`: `linkBridge`, `tipoBridge`, `bridgeObservacoes` — sem snapshot de HTML/tags, a URL já é
  gancho suficiente. Achado: `ProdutoAfiliado.linkLanding` fica ambíguo/desatualizado (é por produto,
  a bridge real agora é por campanha) — não deprecado aqui, só registrado.
- [Contrato de ingestão agnóstico de fonte](issues/14-contrato-ingestao.md) — **endpoint único
  genérico** (`{fonte, tipo, periodo, linhas[]}`, despacha por `tipo`), cobrindo `CAMPANHA_DIARIO`,
  `SEGMENTO` e `SERIE_TERMO` nesta rodada (search-term performance report fica fog, sem entidade nem
  consumidor). Idempotência é **upsert last-write-wins** sem histórico (mesmo padrão do CSV humano),
  só adiciona `updatedAt`. **Materialização do calendário é do endpoint, não da fonte**: envelope
  carrega `periodo` + escopo explícito de entidades cobertas, endpoint cria os snapshots zero que
  faltam — decisão mais consequente do ticket. Identidade via chave composta
  `(googleAdsCustomerId, nomeCampanhaGoogleAds)` — novo campo em `ContaTrafego`; linha que não casa
  vai pra bandeja `CampanhaNaoReconciliada`, nunca auto-cria (endpoint não tem `produtoId`).
  Autenticação por token novo e dedicado `AFILIADOS_INGEST_TOKEN`, não reaproveita
  `N8N_PUBLISH_TOKEN`. Agendamento por fonte sem orquestrador central: Ads Scripts empurra sozinho
  (trigger nativo), n8n puxa demanda (Bing/Keyword Planner) e entra pelo mesmo endpoint. Registro de
  coleta novo (`RegistroColeta`, chave `(fonte, tipo)`) grava última execução e período coberto;
  envelope aceita relato explícito de falha; detecção de silêncio fica fog. Não desbloqueia nenhum
  ticket aberto.
- [Atribuição de VendaAfiliado à Campanha](issues/15-venda-para-campanha.md) — **`VendaAfiliado` vira
  fonte de verdade de ROI para as regras de decisão**; `CampanhaSnapshot.receitaConfirmada` (Ads)
  fica só auditoria — cumpre a "dependência formal" que o ticket 08 já tinha registrado, não reabre
  nada. `campanhaId` **opcional** (`onDelete: SetNull`, mesmo padrão de `produtoId`). Atribuição por
  **subid como caminho primário, manual como único fallback** — inferência automática eliminada do
  desenho porque rateio corrompe ROI por campanha; resolve de graça a ambiguidade de campanhas
  simultâneas. `VendaAfiliado` troca suposição de `gclid` fixo por par `(tipoIdentificador, valor)` +
  `orderId` separado. **Valor do subid é o próprio `Campanha.id`** (cuid, ~25 chars, cabe no limite
  mais apertado documentado de 127 chars) — sem tabela de lookup. `Campanha` ganha rollups próprios
  (`gastoTotalAcumulado`/`receitaConfirmadaAcumulada`/`roiReal`/`cpaReal` via novo
  `recomputeCampanhaRollups`, receita = soma de vendas `APROVADA`); rollup de `ProdutoAfiliado` não
  muda, fica desacoplado. Estorno pós-`ESCALANDO` não reverte a mão-única do ticket 09, só reduz o
  ROI que aparece no próximo ciclo mensal do ticket 10. **Desbloqueia o ticket 20** (upload de
  conversões offline, que também já tinha o 04 fechado).
- [Upload de conversões offline para o Google Ads via Ads Scripts](issues/20-upload-conversoes-offline.md)
  — **fica em escopo**: enviar conversão é dado, não decisão de controle, então não cai na fronteira
  "recomenda, nunca escreve" travada no charting (essa cobria só o loop de ajuste de
  lance/budget/pausa). **Só venda confirmada (`VendaAfiliado` `APROVADA`) sobe** — checkout não sobe,
  já é conversão nativa tempo-real do lado do Ads (achado que confirma o ticket 04 ficar mais simples,
  como o próprio ticket previa). Redes com integração nativa (ClickBank) ficam excluídas do upload por
  **config declarativa**, nunca detecção automática de duplicata. Janela de 90 dias **nunca é
  silenciosa** — `VendaAfiliado.statusUploadAds` registra o resultado de cada tentativa
  (`ENVIADA`/`FORA_DA_JANELA`/`EXCLUIDA_REDE_NATIVA`/`PENDENTE`). Retratação usa `orderId` quando
  presente, senão `(tipoIdentificador, valorIdentificador)` + timestamp, sem exceção hardcoded por
  rede. **Creator Engine gera o CSV pronto**, Script só busca e repassa pra `newCsvUpload()` — mesma
  filosofia de centralizar formatação sensível do ticket 14. Toggle por fase da campanha (desligado em
  `TESTANDO`, ligado em `ESCALANDO`) reusa o mecanismo `LimiarGlobal`/`limiaresOverride` do ticket 07,
  sem campo booleano novo. Não desbloqueia nenhum ticket aberto.

## Not yet specified

- **Emenda de schema ao `SerieTermo` (ticket 05), achado pelo ticket 08.** Não é decisão em aberto —
  a forma da entidade (chave `(termoId, geo, fonte, data)`, três estados por ausência-de-linha +
  `valor` nullable) segue válida — é trabalho de migração pendente: `fonte` precisa aceitar `GLIMPSE`,
  `SEMRUSH`, `FLOWSPY` e um valor manual genérico além de `GOOGLE_KEYWORD_PLANNER`/`BING`; `unidade`
  precisa aceitar `INDICE_0_100` além de `ABSOLUTO`/`IMPRESSOES`; falta um flag `origem` manual vs.
  automatizado (mesmo padrão de `OrigemVendaAfiliado`). Aplicar junto da redação da OpenSpec change.
- **Detecção formal de sazonalidade.** A regra de curva ascendente (ticket 06) deliberadamente não
  filtra sazonal de estrutural agora — aceita o falso positivo e deixa o operador julgar pela janela
  que disparou. Se isso virar dor real, `monthly_search_volumes[]` traz 4 anos de série mensal
  (achado do ticket 21) que permitiria comparar o mesmo mês contra anos anteriores; não é regra
  automática hoje por cair em inferência estatística que o mapa já descartou como ML fora de escopo.
- **Correlação Bing↔Google.** A série do Bing (`GetKeywordStats`) já está sendo coletada desde o
  ticket 22, mas nenhuma regra a consome. Falta definir a ferramenta/critério que mede a correlação
  contra o Keyword Planner e decide se ela é promovida a sinal de aceleração formal.
- **Prior do Radar a partir do histórico próprio.** Como casar atributos de uma oferta candidata
  com campanhas passadas, qual o limiar de "histórico raso" que suprime o prior, e como isso entra
  no `scoreBreakdown`. A taxonomia de LP bridge (ticket 13, fechado) e o `motivoEncerramento` que
  classifica Falha de Execução vs Falha de Mercado (ticket 16, fechado) já dão dois candidatos
  concretos de chave de similaridade — mas o desenho do prior em si (quais atributos entram, como
  pesar, o limiar de "raso") ainda não está sharp o suficiente para virar ticket.
- **Visão comparativa de campanhas.** Protótipo de agrupamento/filtro por atributo com distribuição
  de ROI. A forma depende de quais atributos sobrevivem à modelagem.
- **Backfill e migração.** O que fazer com `CampanhaSnapshot`, `keywordsPrioritarias` e os produtos
  já cadastrados quando o novo modelo existir.
- **Cruzamento geo×dispositivo.** O ticket 11 modelou só marginais por eixo (geo sozinho, device
  sozinho) porque nenhuma regra hoje pede a interseção — mas a API entrega geo e dispositivo cruzados
  na mesma consulta de graça (achado do ticket 02). Se uma regra futura precisar de "Desktop no
  Canadá especificamente", o modelo estende com colunas nuláveis adicionais (aditivo).
- **Reconciliação de budget por diff.** O ticket 12 deixou a detecção automática de mudança de
  budget entre snapshots consecutivos (Ads Scripts reporta o corrente) fora do mecanismo de registro
  — não captura `motivo`. Pode voltar como *alerta* de divergência (budget observado no
  `CampanhaSnapshot` ≠ último `AjusteCampanha` registrado), não como fonte de verdade. Sem forma
  definida ainda.
- **Search-term performance report como entidade.** O ticket 14 deixou de fora o grão (b) do ticket
  02 (`search_term_view` — custo/cliques por termo efetivamente pesquisado dentro de uma campanha
  viva, diferente da demanda de `SerieTermo`/ticket 05): nenhuma regra fechada o consome hoje, e a
  doc já confirma que ele nunca reconcilia com o total da campanha. Entra quando uma regra real
  precisar dele (ex: mineração de keyword negativa) — aí sim ganha entidade e chave natural.
- **Detecção de silêncio na coleta (staleness).** O `RegistroColeta` do ticket 14 grava última
  execução e período coberto por `(fonte, tipo)`, mas nenhuma regra ainda compara isso contra a
  cadência esperada de cada fonte pra virar alerta ("Bing devia ter rodado hoje e não rodou"). Candidata
  a viver na fila de decisão (ticket 18, já fechado) quando desenhada.
- **`ContaTrafegoProduto.linkTracking` como template de URL.** O ticket 15 decidiu que o subid
  enviado às redes é o próprio `Campanha.id`, mas hoje `linkTracking` é um link fixo por
  conta+produto, preenchido manualmente. Virar template com placeholder do subid (montado por
  campanha na hora de gerar o link) é implementação, não modelo — fica pra quando a geração de link
  for desenhada de fato.
- **Redação da OpenSpec change — Fase 1.** Entrega terminal de tudo já fechado (todos os tickets
  exceto 17/19/23). Não espera o fio de demanda de busca — ver decisão em Notes (27/08/2026).
- **Redação da OpenSpec change — Fase 2 (demanda de busca).** Seção separada, escrita quando 17, 19 e
  23 fecharem (hoje presos esperando aprovação da Google no ticket 23).

## Out of scope

- **Execução automática de ajustes no Google Ads** (write-back de lance/budget/pausa de termo) —
  decidido no charting: o sistema recomenda, o operador aplica.
- **Inferência estatística / ML na camada de aprendizado** — volume de campanhas na casa das dezenas
  não sustenta significância; produziria número com aparência de ciência e conteúdo de ruído.
- **ROI por termo**, estimado ou não — ROI mora na campanha.
- **Push externo (n8n → Telegram/e-mail)** — adiado deliberadamente para esforço futuro; a fila de
  decisão é desenhada de modo que push seja transporte fino por cima dela, sem regra própria.
