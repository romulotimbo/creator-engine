# personaforge-completion Specification

## Purpose
TBD - created by archiving change conclusao-creator-engine. Update Purpose after archive.
## Requirements
### Requirement: Funil de monetização editável
O sistema SHALL permitir criar e editar `FunilMonetizacao` por persona, incluindo URL landing, status deploy, link afiliado e faixas de preço.

#### Scenario: Configurar funil inexistente
- **WHEN** persona não tem funil e usuário clica "Configurar Funil"
- **THEN** o sistema abre formulário e cria registro ao salvar

#### Scenario: RN-05 bloqueia Bloco B2 sem disclosure
- **WHEN** usuário tenta concluir item do Bloco B2 (FanVue) com `disclosureIa = false`
- **THEN** o sistema exibe erro e impede a conclusão

### Requirement: Checklist interativo do funil
O sistema SHALL permitir alternar `concluido` de cada `ChecklistItem` via UI, persistindo imediatamente.

#### Scenario: Marcar item concluído
- **WHEN** usuário clica no checkbox de um item do checklist
- **THEN** o sistema atualiza `concluido` no banco e reflete visualmente

### Requirement: Discovery CRUD completo
O sistema SHALL permitir criar, editar e excluir `DiscoveryEntry` via modal com validação Zod.

#### Scenario: Nova entrada discovery
- **WHEN** usuário clica "+ Nova Entrada" e preenche título, tipo e status
- **THEN** o sistema cria `DiscoveryEntry` e atualiza a listagem

### Requirement: Discovery kanban por status
O sistema SHALL exibir entradas em colunas por status (EM_ABERTO, EM_ANDAMENTO, CONCLUIDO, DESCARTADO) com drag-drop para mudar status.

#### Scenario: Mover card entre colunas
- **WHEN** usuário arrasta entrada de EM_ABERTO para EM_ANDAMENTO
- **THEN** o sistema atualiza o status e reposiciona o card

### Requirement: Imagens IA com formulário de tentativa
O sistema SHALL permitir registrar nova tentativa de geração com ferramenta, prompt, parâmetros e URL resultado.

#### Scenario: Registrar tentativa
- **WHEN** usuário preenche formulário de nova imagem e salva
- **THEN** o sistema cria `ImagemGerada` e exibe na galeria

### Requirement: FluxoImagem por persona
O sistema SHALL permitir CRUD de `FluxoImagem` documentando workflow de geração vinculado a ferramenta.

#### Scenario: Criar fluxo de imagem
- **WHEN** usuário define nome, ferramenta e passos do fluxo
- **THEN** o sistema persiste `FluxoImagem` associado à persona

### Requirement: Status Log visual da persona
O sistema SHALL exibir histórico de `PersonaStatusLog` na página hub da persona com data, status anterior/novo e motivo.

#### Scenario: Visualizar transições
- **WHEN** usuário acessa hub da persona com logs existentes
- **THEN** o sistema exibe timeline ordenada por data decrescente

### Requirement: Destaque SHADOW_BAN no calendário global
O sistema SHALL destacar visualmente (cor vermelha) personas com status SHADOW_BAN em `/calendario` e no dashboard global.

#### Scenario: Persona shadow banned no calendário
- **WHEN** calendário global exibe posts de persona SHADOW_BAN
- **THEN** chips/posts dessa persona usam destaque vermelho conforme RN-04

