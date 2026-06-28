## ADDED Requirements

### Requirement: Importar prompts dos posts existentes
O sistema SHALL oferecer `POST /api/prompts/import` que cria `PromptGlobal` a partir de `Post.promptIa` não vazios, ignorando duplicatas.

#### Scenario: Importação inicial
- **WHEN** administrador aciona "Importar dos roteiros"
- **THEN** o sistema cria prompts globais para cada `promptIa` único e reporta contagem importada/skipped

#### Scenario: Re-importação idempotente
- **WHEN** import é executado novamente
- **THEN** o sistema não cria duplicatas

### Requirement: Usar prompt em post
O sistema SHALL permitir associar um `PromptGlobal` a um post de persona, preenchendo `promptIa`.

#### Scenario: Aplicar prompt a post pendente
- **WHEN** usuário seleciona prompt, persona e post PENDENTE via "Usar em post"
- **THEN** o sistema atualiza `Post.promptIa` com o texto do prompt global

### Requirement: Exportar SOP como Markdown
O sistema SHALL permitir download de um SOP ativo em formato Markdown com passos numerados.

#### Scenario: Export Markdown
- **WHEN** usuário clica "Exportar Markdown" em um SOP
- **THEN** o sistema gera arquivo `.md` com título, versão e passos

### Requirement: Exportar SOP como PDF
O sistema SHALL permitir download de um SOP ativo em PDF com layout legível.

#### Scenario: Export PDF
- **WHEN** usuário clica "Exportar PDF" em um SOP
- **THEN** o sistema gera arquivo PDF com conteúdo do SOP

### Requirement: Vínculo Ferramenta com FluxoImagem
O sistema SHALL permitir associar `Ferramenta` a `FluxoImagem` e exibir ferramenta vinculada na UI de ferramentas e imagens.

#### Scenario: Vincular ferramenta
- **WHEN** usuário seleciona ferramenta ao criar/editar FluxoImagem
- **THEN** o sistema persiste `ferramentaId` e exibe nome da ferramenta

### Requirement: Custo de ferramentas no P&L global
O sistema SHALL incluir soma de `custoMensal` de ferramentas com status ATIVA ou TRIAL no resumo financeiro global.

#### Scenario: P&L com ferramentas
- **WHEN** usuário acessa `/financeiro`
- **THEN** o sistema exibe linha de custo de assinaturas de ferramentas no P&L

### Requirement: Editor JSON de configuração de ferramenta
O sistema SHALL oferecer editor de `configuracaoPadrao` com validação JSON e destaque de sintaxe no modal de ferramenta.

#### Scenario: Salvar JSON inválido
- **WHEN** usuário insere JSON malformado no editor
- **THEN** o sistema exibe erro de validação e não salva
