# 11 — Segmentos geo × dispositivo dentro da campanha

Type: grilling
Status: closed
Blocked by: 02
Assignee: claude

## Question

A otimização que precede o aumento de verba opera em segmentos que **não existem no modelo**:

- *"Se o Canadá está gerando vendas baratas e os EUA consomem verba com custo por conversão mais
  alto, faça ajuste de lance positivo de +10% a +30% no Canadá."*
- *"O computador costuma ter clique mais caro mas converter melhor e mais barato que o celular. Se
  esse padrão se confirmar nos seus dados reais, aumente o lance para Computador e reduza
  drasticamente a exposição no Smartphone."*

Estado atual: `Campanha.geo` é **uma string única** (o geo da campanha, não segmentos dentro dela) e
**dispositivo não existe** em lugar nenhum do schema. `CampanhaSnapshot` é agregado por campanha por
dia, sem dimensão.

Decidir:

- **Terceiro grão**: uma entidade de snapshot por segmento — chave `(campanha, dimensão, valor, período)` —
  ou duas entidades separadas para geo e dispositivo? Uma dimensão genérica facilita adicionar
  horário/audiência depois, e custa clareza agora.
- **Cadência**: o mesmo grão semanal dos termos, ou diário? Segmento tem menos cardinalidade que
  termo, então diário talvez caiba.
- **Relação com `Campanha.geo`**: uma campanha com `geo = "US"` pode ter segmentos de estado? Ou o
  segmento geo só existe quando a campanha roda multi-país? Reconciliar os dois sentidos de "geo".
- **O que a regra produz**: o sistema detecta o padrão e recomenda o ajuste (+10 a 30% no geo bom,
  reduzir smartphone), e o operador aplica. Qual o critério de detecção — diferença de CPA entre
  segmentos acima de quanto, com que volume mínimo por segmento para não perseguir ruído?
## Notas herdadas do ticket 02 (confirmado: Ads Scripts entrega os dois)

- **Existem dois recursos geo, e eles respondem perguntas diferentes.** `geographic_view` mistura
  presença física e área de interesse (distinguidos pelo campo `location_type`); `user_location_view`
  é só presença física e traz o booleano `targeting_location`. **O segundo é o que detecta vazamento
  de verba** — cliques vindos de fora do alvo. Escolher qual alimenta a regra, ou se ambos.
- **Dispositivo não é uma view, é `segments.device`** — disponível nos quatro recursos, então geo e
  dispositivo podem vir na mesma consulta cruzados.
- **`segments.device` tem 7 valores, não 3**: além de desktop/mobile/tablet, existem `CONNECTED_TV`,
  `OTHER`, `UNKNOWN`, `UNSPECIFIED`. A regra "subir lance no Computador, reduzir Smartphone" precisa
  dizer o que fazer com os outros quatro — ignorar, agrupar em "outros", ou tratar `UNKNOWN` como
  sinal de qualidade de dado.
- **Nomes geográficos vêm como resource names** (`geoTargetConstants/1001773`), não "Canadá". Exige
  cache local de `geo_target_constant`. Decidir se isso é tabela no banco ou lookup em memória.
- **Dinheiro vem em micros** em GAQL — normalizar na ingestão, não na leitura.
- **Dia sem métrica não retorna linha.** Um segmento que não gastou num dia simplesmente não aparece.
  Para segmento isso é mais frequente que para campanha (cauda longa de geos), então a materialização
  do calendário importa mais aqui.
- **Granularidade abaixo de país** existe via 11 segmentos `geo_target_*` — decidir se o modelo desce
  a estado/cidade ou para em país. O exemplo da regra é país (Canadá vs EUA), mas escalar dentro dos
  EUA vai querer estado.

## Observação de um export real (22/08/2026)

Um export de Forecasts da UI do Keyword Planner segmenta dispositivo em **exatamente 3 valores** —
`Desktop`, `Smartphone`, `Tablet` — contra os **7** de `segments.device` na API (que inclui
`CONNECTED_TV`, `OTHER`, `UNKNOWN`, `UNSPECIFIED`).

Ou seja, **UI e API não compartilham vocabulário de dispositivo**. Se o modelo espelhar a API (7
valores), telas e regras precisam mapear para o vocabulário de 3 que o operador reconhece; se
espelhar a UI, perde-se informação que a API entrega. Decidir de que lado fica a normalização — e
isso é caso concreto da mesma pergunta que já estava aberta sobre o que fazer com os 4 valores extras.

## Decision (27/08/2026)

Fechado por interview (`/grilling`). Onze decisões, nesta ordem:

1. **Grão da entidade: genérico, um dimensão por vez, sem cruzamento.** `SegmentoCampanhaSnapshot`
   com chave `(campanhaId, dimensao, valor, data)` — `dimensao` enum `GEO` | `DISPOSITIVO`. Cada linha
   é a marginal daquele eixo (soma sobre o outro eixo), não a interseção. A nota herdada do ticket 02
   ("geo e dispositivo podem vir cruzados na mesma consulta") descreve uma capacidade da API, não uma
   necessidade de regra hoje — as duas regras do charting são de eixo único. Ingestão roda duas
   queries agrupadas separadamente (por geo, por dispositivo), não uma cruzada. Cruzamento fica
   registrado em "Not yet specified" — migração aditiva se uma regra futura precisar.
2. **Cadência: diária**, mesmo grão de `CampanhaSnapshot` (`campanhaId`+`dataSnapshot`). A premissa
   original do ticket ("mesmo grão semanal dos termos") está **obsoleta**: o ticket 05 (fechado depois
   deste texto) resolveu que "termos de busca reais que geraram clique numa campanha" é conceito fora
   de `SerieTermo`, território deste ticket — e nunca fixou cadência nenhuma. Não havia precedente a
   espelhar; diário ganha por consistência com `CampanhaSnapshot` e porque materializar calendário
   (achado do ticket 02: dia sem métrica não retorna linha) já é custo obrigatório de qualquer forma.
3. **Fonte geo: `user_location_view` sozinho.** Só presença física (`targeting_location`), o recurso
   que detecta vazamento de verba — é a pergunta que a regra do ticket faz ("onde o dinheiro
   realmente está sendo gasto"), não `geographic_view` (área de interesse).
4. **Granularidade geo: só país.** Os 11 níveis `geo_target_*` abaixo de país (estado, cidade) ficam
   fora — nenhuma regra do mapa pede isso hoje, é antecipação textual do próprio ticket ("escalar
   dentro dos EUA vai querer estado"), não regra travada no charting. Extensão futura é aditiva
   (`geoTargetType` nulável), não retrabalho de chave.
5. **Relação com `Campanha.geo`: coleta incondicional, sem gate.** `Campanha.geo` continua string
   única (o alvo declarado); o segmento é a distribuição real observada, coletado para qualquer
   campanha com gasto no dia, campanha de país único incluída — é exatamente o caso que expõe
   vazamento. Os dois campos não se reconciliam por constraint: divergência é dado, não erro.
6. **Vocabulário de dispositivo: guarda os 7 valores crus da API**, sem normalizar na ingestão. A
   regra/UI filtra para os 3 acionáveis (`DESKTOP`/`MOBILE`/`TABLET` → Desktop/Smartphone/Tablet); os
   4 extras (`CONNECTED_TV`/`OTHER`/`UNKNOWN`/`UNSPECIFIED`) ficam como metadado — `UNKNOWN` alto pode
   sinalizar problema de tracking, informação que normalizar na ingestão perderia.
7. **Cache de nomes geográficos: lookup em memória**, não tabela no banco. Escopado só a países
   (consequência da decisão 4) — lista pequena (~250) e estática do Google, não justifica import
   batch + versionamento do arquivo de 40k linhas de `geo_target_constant`. Reabre junto se a decisão
   4 for revisitada.
8. **Fase de aplicação: só `ESCALANDO`.** Coincide com o gancho textual já deixado no ticket 10
   ("otimizar segmentos antes" do aumento de verba). Coleta de dado continua incondicional (decisão
   5) mesmo em `TESTANDO`; só a regra de recomendação fica restrita à fase de escala.
9. **Janela: mês calendário**, herdada do ticket 10 (janela canônica de decisão em `ESCALANDO`, nunca
   dia isolado). **Limiares em `LimiarGlobal`** (mecanismo genérico do ticket 07, chave+Json global +
   override por produto) — `segmento.volumeMinimoConversoes` e `segmento.diferencaCpaMinimaPct`, não
   bespoke.
10. **Defaults de partida: 3 vendas confirmadas / 25% de diferença de CPA** vs. o CPA médio da
    campanha no mês, acumulado no segmento. Números de partida ajustáveis pelo operador via
    `LimiarGlobal`, não constantes de arquitetura — mesma natureza dos limiares dos tickets 07/08/09.
11. **Um `ItemFila` por `Campanha` por mês**, `regra = "escala.otimizacaoSegmento"`,
    `tipoAlvo = CAMPANHA`. Geo e dispositivo disparando juntos no mesmo mês viram um item só —
    breakdown de qual(is) segmento(s) dispararam e a direção recomendada vai no `payload`, `resumo`
    junta as duas frentes numa frase quando ambas disparam. Dedup real precisa do mês embutido —
    `(regra, tipoAlvo, alvoId)` sozinho (contrato do ticket 18) não diferencia mês a mês; o
    `mesReferencia` entra como parte da chave ou como campo próprio consultado junto — detalhe de
    índice para a escrita da migração, mesma categoria do índice parcial já deixado em aberto no
    ticket 18.

**Forma resultante do modelo** (nomes de trabalho, redação final é da OpenSpec change):

```
SegmentoCampanhaSnapshot {
  id, campanhaId, campanha Campanha,
  dimensao (enum GEO | DISPOSITIVO), valor (string — código de país | valor cru de segments.device),
  data (Date),
  gasto, impressoes, cliques, conversoes, cpaReal, receitaConfirmada  // mesmas métricas de CampanhaSnapshot
  createdAt
  @@unique([campanhaId, dimensao, valor, data])
}
```

`LimiarGlobal` ganha duas chaves novas: `segmento.volumeMinimoConversoes` (default 3),
`segmento.diferencaCpaMinimaPct` (default 25).

**Desbloqueia o ticket 12** (registro de ajustes — já tinha o 10 fechado, faltava este).
