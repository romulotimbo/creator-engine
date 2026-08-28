## ADDED Requirements

### Requirement: Snapshot de segmento por dimensão
O sistema SHALL manter `SegmentoCampanhaSnapshot` genérico por dimensão (`GEO`|`DISPOSITIVO`), chave `(campanhaId, dimensao, valor, data)`, sem cruzamento geo×dispositivo (marginal por eixo). A coleta SHALL ter cadência diária e SHALL ser incondicional — mesmo campanha com `Campanha.geo` de país único recebe segmento coletado, sem reconciliação por constraint entre o geo declarado e o observado.

#### Scenario: Coleta de geo
- **WHEN** o envelope de ingestão traz linhas de `tipo=SEGMENTO`, `dimensao=GEO` para uma campanha
- **THEN** o sistema faz upsert de `SegmentoCampanhaSnapshot` por `(campanhaId, GEO, valor, data)`, um por país por dia

#### Scenario: Dispositivo guarda os 7 valores crus
- **WHEN** a fonte reporta um dos 7 valores possíveis de dispositivo (incluindo `CONNECTED_TV`, `OTHER`, `UNKNOWN`, `UNSPECIFIED`)
- **THEN** o sistema grava o valor cru recebido — a filtragem para os 3 valores acionáveis é responsabilidade da UI/regra, não da coleta

### Requirement: Regra de otimização de segmento em ESCALANDO
O sistema SHALL rodar a regra de recomendação de segmento apenas para campanhas em `ESCALANDO`, na janela de mês calendário, usando limiares de `LimiarGlobal` (`segmento.volumeMinimoConversoes`, default 3; `segmento.diferencaCpaMinimaPct`, default 25). O sistema SHALL gerar no máximo um `ItemFila` por campanha por mês para essa regra (`escala.otimizacaoSegmento`), combinando achados de geo e dispositivo no mesmo item.

#### Scenario: Segmento com CPA divergente
- **WHEN**, no mês corrente, um valor de segmento (geo ou dispositivo) de uma campanha `ESCALANDO` tem volume de conversões ≥ 3 e CPA pelo menos 25% diferente da média da campanha
- **THEN** o sistema gera (ou atualiza) um único `ItemFila` do mês para aquela campanha, listando os achados de geo e dispositivo juntos

#### Scenario: Campanha em TESTANDO não roda a regra
- **WHEN** a campanha está `TESTANDO`
- **THEN** o sistema não avalia a regra de otimização de segmento para ela
