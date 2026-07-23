# workflow-n8n-publicacao-instagram Specification

## Purpose

Contrato dos workflows n8n (piloto manual e produção cron) que publicam posts Instagram via Zernio usando a API de publicação do Creator Engine.

## Requirements

### Requirement: Workflow piloto manual — Story roteiro 523
O operador SHALL poder publicar o post ordem 523 como Instagram Story via workflow n8n manual, sem aguardar o cron de produção.

#### Scenario: Publicação imediata do piloto
- **WHEN** o operador dispara manualmente o workflow "Instagram Story — Piloto 523" no n8n
- **THEN** o workflow consulta a fila CE, publica via Zernio com `contentType=story` e confirma sucesso no CE

### Requirement: Autenticação nos nós HTTP do Creator Engine
Todo nó HTTP que chama a API do Creator Engine SHALL incluir header `X-Publish-Token` com o valor da credencial `N8N_PUBLISH_TOKEN` (variável de ambiente do container n8n ou credencial HTTP Header Auth).

#### Scenario: Chamada autenticada à fila
- **WHEN** o n8n executa `GET https://romulohub.cloud/creator-engine/api/publicacao/fila`
- **THEN** a requisição inclui `X-Publish-Token` e recebe 200 com lista de posts

### Requirement: Estrutura do workflow piloto (manual)
O workflow piloto SHALL conter os seguintes nós, nesta ordem:

1. **Manual Trigger** — disparo pelo operador
2. **HTTP Request — Fila CE** — `GET /api/publicacao/fila?plataforma=INSTAGRAM&limite=1`
3. **IF** — verificar se `items.length > 0`; senão, parar com mensagem "fila vazia"
4. **HTTP Request — Marcar enviando** — `POST /api/publicacao/posts/{{postId}}/enviando` (opcional se endpoint existir; senão pular)
5. **HTTP Request — Zernio Create Post** — `POST https://api.zernio.com/v1/posts` (confirmar URL na conta)
6. **IF** — status HTTP 2xx do Zernio
7. **HTTP Request — Confirmar CE** — `POST /api/publicacao/posts/{{postId}}/confirmar`
8. **Ramificação erro** — `POST /api/publicacao/posts/{{postId}}/erro` com body `{ "mensagem": "{{error}}" }`

#### Scenario: Payload Zernio para Story
- **WHEN** o item da fila tem `zernioContentType=story`
- **THEN** o body enviado ao Zernio é:
```json
{
  "mediaItems": [{ "type": "image", "url": "{{mediaUrl}}" }],
  "platforms": [{
    "platform": "instagram",
    "accountId": "{{ZERNIO_INSTAGRAM_ACCOUNT_ID}}",
    "platformSpecificData": { "contentType": "story" }
  }],
  "publishNow": true
}
```

### Requirement: Credenciais necessárias no n8n
O ambiente n8n SHALL configurar:

| Credencial / Env | Uso |
|---|---|
| `ZERNIO_API_KEY` | Header `Authorization: Bearer ...` nos nós Zernio (já existe para DMs) |
| `ZERNIO_INSTAGRAM_ACCOUNT_ID` | `accountId` do @veesemfiltro no painel Zernio |
| `N8N_PUBLISH_TOKEN` | Header `X-Publish-Token` nos nós Creator Engine |
| `CE_PUBLICACAO_BASE_URL` | `https://romulohub.cloud/creator-engine/api/publicacao` |

#### Scenario: Credencial Zernio reutilizada
- **WHEN** o workflow piloto chama a API Zernio
- **THEN** usa a mesma credencial Bearer já configurada nos workflows de DM

### Requirement: Workflow produção — cron automático
O workflow de produção SHALL executar a cada 5 minutos via **Schedule Trigger**, processando todos os itens da fila (não apenas um).

#### Scenario: Cron publica posts vencidos
- **WHEN** o cron dispara e existem 3 posts elegíveis na fila
- **THEN** o workflow itera (Split In Batches ou Loop) publicando cada um sequencialmente com intervalo mínimo de 30s entre posts (rate limit Instagram)

#### Scenario: Fila vazia
- **WHEN** o cron dispara e a fila está vazia
- **THEN** o workflow termina sem erro em menos de 5 segundos

### Requirement: Tratamento de erros e notificação
O workflow SHALL capturar erros HTTP do Zernio e do CE, registrar `publicacaoErro` no post e opcionalmente enviar notificação (email/Telegram — configurável no n8n).

#### Scenario: Zernio retorna 4xx
- **WHEN** o Zernio rejeita a mídia (URL inacessível, formato inválido)
- **THEN** o n8n chama `POST .../erro` no CE com a mensagem da resposta e NÃO chama confirmar

#### Scenario: CE confirma mas Zernio já publicou
- **WHEN** o Zernio retorna sucesso mas o CE falha na confirmação
- **THEN** o workflow registra erro no n8n execution log com `zernioPostId` para reconciliação manual

### Requirement: Pré-check de mídia acessível
Antes de chamar o Zernio, o workflow SHOULD executar `GET {{mediaUrl}}` (HTTP Request) e verificar status 200 e `Content-Type` image/* ou video/*.

#### Scenario: URL de mídia inacessível
- **WHEN** o pré-check da `mediaUrl` falha
- **THEN** o workflow chama `POST .../erro` com mensagem "mediaUrl inacessível" e não chama Zernio

### Requirement: Checklist operacional pré-piloto 523
Antes do primeiro disparo, o operador SHALL:

1. Executar script piloto no CE (mídia + status PRONTA + AGENDADO)
2. Confirmar `GET /api/publicacao/fila` retorna post 523 com `mediaUrl`
3. Testar `curl -I "{{mediaUrl}}"` retorna 200
4. Confirmar `ZERNIO_INSTAGRAM_ACCOUNT_ID` no n8n
5. Disparar workflow manual e verificar story no Instagram + `status=PUBLICADO` no CE

#### Scenario: Checklist completo
- **WHEN** todos os passos do checklist passam
- **THEN** o piloto é considerado bem-sucedido e o workflow cron pode ser ativado

### Requirement: Não implementar workflow neste repositório
A implementação dos workflows n8n SHALL ocorrer exclusivamente na instância `https://n8n.romulohub.cloud/`. Este repositório contém apenas a especificação e os endpoints CE.

#### Scenario: Documentação como contrato
- **WHEN** um desenvolvedor implementa o workflow no n8n
- **THEN** ele segue este spec e os payloads documentados em `design.md` sem alterar o Creator Engine além dos endpoints definidos
