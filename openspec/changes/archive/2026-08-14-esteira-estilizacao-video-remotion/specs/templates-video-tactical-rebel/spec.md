## ADDED Requirements

### Requirement: Brand kit Tactical Rebel como fonte única de tokens
O sistema SHALL expor os tokens visuais da identidade Tactical Rebel (cores, tipografia, safe zones, tokens de animação) num módulo único consumido pelas composições de vídeo.

#### Scenario: Tokens de cor e tipografia disponíveis
- **WHEN** uma composição de vídeo é construída
- **THEN** ela obtém do módulo de tokens as cores (preto `#000000`, branco-gelo `#F2F2F2`, dourado `#C5A059`) e a hierarquia tipográfica (impacto: Bebas Neue/Anton caixa alta; convicção: Cinzel/Cormorant itálico, ~40% menor)

#### Scenario: Safe zone por formato aplicada
- **WHEN** uma composição renderiza num formato específico
- **THEN** o posicionamento respeita a safe zone definida nos tokens para aquele formato

### Requirement: Templates parametrizados por props
O sistema SHALL fornecer templates de vídeo Remotion cujo conteúdo é definido por props/JSON derivados do roteiro de estilização, sem exigir alteração de código por peça.

#### Scenario: Mesmo template gera variações por props
- **WHEN** o mesmo template recebe props diferentes (textos, tempos, assets)
- **THEN** o resultado renderizado varia conforme as props, sem mudança de código

#### Scenario: Estilos de texto mapeiam a hierarquia da marca
- **WHEN** uma track de texto declara estilo `impacto` ou `conviccao`
- **THEN** o template renderiza o texto com a fonte, cor e escala correspondentes na identidade Tactical Rebel

### Requirement: Suporte multi-formato
O sistema SHALL suportar renderização do mesmo conteúdo em múltiplos formatos (9:16, 1:1, 4:5) a partir da mesma composição base.

#### Scenario: Render em 9:16 e 1:1
- **WHEN** um roteiro é renderizado no formato `9x16` e depois em `1x1`
- **THEN** ambos os outputs usam o mesmo conteúdo/identidade, ajustando canvas e safe zone ao formato escolhido

### Requirement: Animações assinadas da identidade
O sistema SHALL implementar as animações características da identidade (ex.: write-on rápido do texto de impacto e corte seco) como comportamentos reutilizáveis pelos templates.

#### Scenario: Texto de impacto com write-on
- **WHEN** uma track de texto de impacto usa animação `write-on`
- **THEN** o texto aparece com o efeito write-on rápido definido nos tokens de animação
