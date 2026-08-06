## MODIFIED Requirements

### Requirement: Score and scoreBreakdown are always computed, never directly editable
`OfertaDecisao.scoreCalculado` e `scoreBreakdown` SHALL ser sempre recalculados no servidor a cada update relevante do `OfertaDecisao` (qualquer campo que influencie o score: `epcRede`, `refundPct`, `tendenciaTrafego30d`, `comissaoValor`, `cpcMedioEsperado`, `volumeBuscaMensal`, `completudeDados`). Esses campos NUNCA são editáveis diretamente via API.

#### Scenario: Score recalculated on relevant field update
- **WHEN** o operador atualiza `epcRede` de uma oferta via formulário
- **THEN** o servidor recalcula `scoreCalculado` e `scoreBreakdown` antes de persistir, sem que o operador informe o score

#### Scenario: Score not recalculated on irrelevant field update
- **WHEN** o operador atualiza apenas `observacoes` de uma oferta
- **THEN** o score NÃO precisa ser recalculado — mas pode ser, por simplicidade, sem dano

#### Scenario: Direct score edit rejected
- **WHEN** uma request inclui `scoreCalculado: 99` no body
- **THEN** o campo é ignorado (stripped) antes de persistir — o valor calculado prevalece

### Requirement: Score clamped to [0, 100]
O `scoreCalculado` final SHALL sempre estar no intervalo [0, 100], mesmo que a soma bruta (`rawTotal`) seja negativa ou superior a 100.

#### Scenario: Negative raw score clamped to 0
- **WHEN** a soma bruta dos fatores resulta em -15 (ex: oferta com todos os indicadores ruins e dados incompletos)
- **THEN** `scoreCalculado = 0` (não -15)

#### Scenario: Raw score above 100 clamped to 100
- **WHEN** a soma bruta resulta em 105
- **THEN** `scoreCalculado = 100` (não 105)

### Requirement: Percentage fields use 0–100 scale
Todos os campos de porcentagem em `OfertaDecisao` SHALL usar escala 0–100 (não 0–1): `refundPct`, `tendenciaTrafego30d`, `tendenciaTrafego60d`, `tendenciaTrafego90d`, `bounceRate`, e quaisquer campos de `ctr`, `cvr`, `realRoi` futuros.

#### Scenario: refundPct stored as 0-100
- **WHEN** o operador informa `refundPct = 8.85` (representando 8,85%)
- **THEN** o valor `8.85` é persistido diretamente — sem multiplicação por 100 ou divisão por 100

#### Scenario: Score calculation uses 0-100 scale internally
- **WHEN** `refundPct = 8.85` e o score é calculado
- **THEN** a fórmula usa `(100 - 8.85) / 100 * peso` para normalizar o refund — não `(1 - 8.85) * peso`
