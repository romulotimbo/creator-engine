# credencial-servico-nome Specification

## Purpose
Campo opcional `servico` em credenciais globais para nomear o provedor (ex.: IPRoyal), independente do vínculo com registro `Ferramenta`, com coluna Serviço na UI de Ferramentas.
## Requirements
### Requirement: Campo serviço em credencial global
O sistema SHALL persistir e exibir campo opcional `servico` (nome do provedor/serviço, ex.: IPRoyal) em credenciais com `global=true`.

#### Scenario: Criar credencial com serviço
- **WHEN** usuário cria credencial global com categoria `proxy` e serviço `IPRoyal`
- **THEN** o sistema persiste `servico` e exibe na coluna Serviço da tabela

#### Scenario: Serviço sem vínculo Ferramenta
- **WHEN** usuário não seleciona `ferramentaId` mas preenche `servico`
- **THEN** a credencial é listada com o nome do serviço informado

#### Scenario: API aceita servico
- **WHEN** cliente envia POST `/api/credenciais` com `global=true` e `servico`
- **THEN** o sistema persiste e retorna o campo na resposta (sem `valorEnc`)

### Requirement: Coluna Serviço na tabela global
O sistema SHALL exibir coluna **Serviço** na seção de credenciais globais em `/ferramentas`, priorizando `servico` preenchido; se vazio, exibir nome da `Ferramenta` vinculada; senão "—".

#### Scenario: Exibição com servico e ferramentaId
- **WHEN** credencial tem `servico=IPRoyal` e `ferramentaId` vinculado a outro nome
- **THEN** a coluna Serviço exibe `servico` (label explícito do operador)
