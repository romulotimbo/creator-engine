# deploy-qa-pipeline Specification

## Purpose
Pipeline de QA pré-deploy: testes unitários (Vitest), smoke E2E (Playwright), CI no GitHub Actions, script smoke local e verificação pós-deploy de colunas de schema em Credencial.
## Requirements
### Requirement: Suite de testes unitários
O sistema SHALL incluir testes Vitest para helpers críticos de produção: `apiUrl`, schemas Zod de credenciais, serialização de ferramentas e `formatCurrency`.

#### Scenario: Execução local
- **WHEN** desenvolvedor executa `npm test`
- **THEN** todos os testes unitários passam sem banco externo

### Requirement: Smoke E2E Playwright
O sistema SHALL incluir pelo menos um fluxo E2E automatizado: login → criar ferramenta com custo → verificar exibição → criar credencial global com serviço → verificar listagem.

#### Scenario: Smoke E2E local
- **WHEN** desenvolvedor executa `npm run test:e2e` com ambiente dev (Postgres + seed)
- **THEN** o fluxo smoke completa com sucesso

### Requirement: CI no GitHub
O sistema SHALL executar `npm run build` e `npm test` em todo push/PR via GitHub Actions.

#### Scenario: PR com regressão
- **WHEN** alteração quebra teste unitário
- **THEN** o workflow CI falha

### Requirement: Verificação pós-deploy de schema
O sistema SHALL incluir em `verify-prod.sh` ou `deploy-vps.sh` checagem de colunas obrigatórias em `creator_engine.Credencial` (`ferramentaId`, `servico`).

#### Scenario: Coluna ausente após deploy
- **WHEN** deploy conclui mas coluna esperada não existe
- **THEN** o script de verificação retorna erro explícito orientando `db push` ou SQL manual

### Requirement: Script smoke local pré-deploy
O sistema SHALL fornecer `scripts/smoke-local.sh` que executa `npm run build` e `npm test` (e opcionalmente E2E se `RUN_E2E=1`).

#### Scenario: Gate antes de push
- **WHEN** desenvolvedor roda `bash scripts/smoke-local.sh` antes de deploy
- **THEN** falhas de build ou teste impedem considerar o release pronto
