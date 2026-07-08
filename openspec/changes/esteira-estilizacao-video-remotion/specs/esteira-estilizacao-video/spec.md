## ADDED Requirements

### Requirement: Ingestão de vídeo bruto por diretório
O sistema SHALL registrar vídeos brutos disponibilizados num diretório/volume compartilhado como `FonteVideo`, extraindo metadados técnicos (duração, dimensões, fps) e permitindo associação opcional a uma persona.

#### Scenario: Escanear pasta e registrar novas fontes
- **WHEN** o operador aciona "escanear pasta" e existem arquivos de vídeo novos no diretório de inbox
- **THEN** o sistema cria um registro `FonteVideo` por arquivo novo, com path relativo, duração, largura, altura e fps extraídos, e não duplica arquivos já registrados

#### Scenario: Arquivo inválido ou ilegível é ignorado com aviso
- **WHEN** o diretório contém um arquivo que não é um vídeo válido ou cuja leitura de metadados falha
- **THEN** o sistema NÃO cria uma `FonteVideo` para ele e reporta o arquivo como ignorado, sem interromper o registro dos demais

#### Scenario: Upload direto como caminho secundário
- **WHEN** o operador envia um vídeo pela UI em vez de usar a pasta
- **THEN** o sistema grava o arquivo no volume compartilhado e cria a `FonteVideo` equivalente

### Requirement: Enfileiramento de job de render
O sistema SHALL permitir criar um job de render a partir de `{fonte, roteiro de estilização, template, formato}`, validando os insumos antes de enfileirar.

#### Scenario: Criação de job válido
- **WHEN** o operador solicita render com uma fonte existente, um roteiro válido e um template/formato suportados
- **THEN** o sistema cria um `JobRender` com status inicial `FILA` e o associa à fonte, roteiro, template e formato

#### Scenario: Rejeição de job com roteiro fora da duração da fonte
- **WHEN** o roteiro contém um intervalo de tempo que excede a duração da `FonteVideo`
- **THEN** o sistema rejeita a criação do job e retorna erro de validação indicando o intervalo inválido

### Requirement: Processamento assíncrono do render pelo worker
O sistema SHALL processar jobs de forma assíncrona por um worker dedicado, sem bloquear a aplicação, transicionando o status de forma observável.

#### Scenario: Ciclo de vida do job até pronto
- **WHEN** o worker captura um `JobRender` em `FILA`
- **THEN** o status transiciona para `RENDERIZANDO`, depois pós-processamento, e ao final para `PRONTO` com `outputPath` preenchido

#### Scenario: Falha de render marca erro sem travar a fila
- **WHEN** o render de um job falha
- **THEN** o job recebe status `ERRO` com a mensagem da falha e o worker segue processando os próximos jobs

#### Scenario: Sem processamento concorrente do mesmo job
- **WHEN** há mais de um worker ou tentativa concorrente
- **THEN** cada `JobRender` é processado por no máximo um worker por vez (lock/skip locked)

### Requirement: Pós-processamento e limpeza de metadados
O sistema SHALL aplicar strip de metadados ao output final antes de marcá-lo como pronto.

#### Scenario: Output sem metadados sensíveis
- **WHEN** um render termina com sucesso
- **THEN** o arquivo final passa por remoção de metadados (sem GPS/datas/software) antes de o job ficar `PRONTO`

### Requirement: Acompanhamento de status na UI
O sistema SHALL exibir o estado dos jobs de render por persona na interface do Creator Engine.

#### Scenario: Operador vê progresso dos jobs
- **WHEN** o operador abre a tela de jobs da persona
- **THEN** cada job aparece com seu status atual (FILA, RENDERIZANDO, PRONTO, ERRO) e, quando pronto, acesso ao output

### Requirement: Gancho de saída para publicação futura
O sistema SHALL registrar, para cada output pronto, um registro estável com output, metadados e associação opcional a persona/post, sem executar publicação.

#### Scenario: Registro consumível por automação futura
- **WHEN** um `JobRender` chega a `PRONTO`
- **THEN** existe um registro estável (output + metadados + `personaId`/`postId` opcional) que uma automação futura pode consumir, e nenhuma chamada de publicação é feita nesta capability
