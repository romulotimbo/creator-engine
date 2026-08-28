## ADDED Requirements

### Requirement: Modelo Termo e SerieTermo
O sistema SHALL manter `Termo`, pertencente a um produto — ligado a `OfertaDecisao` **ou** `ProdutoAfiliado`, nunca aos dois, nunca a `Campanha`. O sistema SHALL manter `SerieTermo` como entidade única, chave `(termoId, geo, fonte, data)`, com três estados resolvidos por ausência-de-linha + `valor` nullable: não coletado (sem linha), sem dado (linha com `valor = null`), zero confirmado (linha com `valor = 0`).

#### Scenario: Termo de oferta candidata
- **WHEN** um termo é cadastrado para uma `OfertaDecisao` ainda em análise
- **THEN** o sistema persiste `Termo` ligado a `ofertaDecisaoId`, com `produtoId` nulo

#### Scenario: Ausência de coleta não é zero
- **WHEN** não existe nenhuma linha de `SerieTermo` para `(termoId, geo, fonte, data)`
- **THEN** o sistema trata esse ponto como "não coletado", distinto de zero confirmado

#### Scenario: Fonte e unidade suportadas
- **WHEN** uma série é gravada com `fonte` em `{GOOGLE_KEYWORD_PLANNER, BING, GLIMPSE, SEMRUSH, FLOWSPY, MANUAL}` e `unidade` em `{ABSOLUTO, IMPRESSOES, INDICE_0_100}`
- **THEN** o sistema aceita e persiste sem rejeitar por fonte/unidade fora da lista original

### Requirement: Regra de curva ascendente no Radar
O sistema SHALL priorizar `OfertaDecisao` no Radar combinando a variação de busca (Three month change e YoY change do Keyword Planner) como portão — busca caindo exclui sempre a oferta da priorização — com a variação de rede como modificador: busca subindo e rede caindo é prioridade máxima; busca e rede subindo juntas é prioridade média. O sistema SHALL aplicar piso de magnitude de 40% (via `LimiarGlobal`, override por produto) e piso de volume de 300 buscas/mês, exceto para saída-do-zero (`YoY = ∞`), que fica sujeita só ao piso de volume. O sistema SHALL gerar no máximo um `ItemFila` por `OfertaDecisao`, com os termos disparadores registrados em formato `scoreBreakdown`.

#### Scenario: Busca caindo exclui
- **WHEN** a série de busca de uma oferta mostra queda acima do piso de magnitude
- **THEN** o sistema não gera `ItemFila` de priorização para essa oferta, independente da rede

#### Scenario: Busca subindo, rede caindo
- **WHEN** a busca sobe acima do piso e a rede (tráfego/tendência da oferta) cai
- **THEN** o sistema gera `ItemFila` de prioridade `ALTA`

#### Scenario: Saída do zero
- **WHEN** `YoY change = ∞` (termo saiu de zero buscas) e o volume absoluto atinge o piso de 300/mês
- **THEN** o sistema considera a oferta elegível para priorização, sem aplicar o piso de magnitude de 40%
