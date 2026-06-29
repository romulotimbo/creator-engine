## Why

Três problemas recorrentes em produção bloqueiam confiança no deploy:

1. **Ferramentas:** após cadastrar uma ferramenta com custo mensal, o valor **não aparece na tabela** (embora esteja no banco) — sintoma típico de serialização `Decimal`, refresh RSC quebrado ou página falhando parcialmente (ex.: query de credenciais com coluna `ferramentaId` ausente).
2. **Credenciais globais:** categoria `proxy` não basta — falta campo **nome do serviço** (ex.: "IPRoyal") independente do vínculo opcional com registro `Ferramenta`.
3. **Qualidade:** erros chegam só em produção (404 de `apiUrl`, schema desatualizado, cache estático). Não há **gate automatizado** antes do deploy.

Esta change agrupa correções de produto + migração pendente + pipeline de testes mínimo viável.

## What Changes

- **Fix listagem de ferramentas:** garantir `custoMensal` serializado como número na API e na page; `router.refresh()` confiável; página `/ferramentas` resiliente (credenciais não derrubam a seção de ferramentas se migration pendente).
- **Campo `servico` em `Credencial`:** texto livre para nome do serviço (IPRoyal, RunPod, etc.); exibido na tabela global; independente de `ferramentaId`.
- **Migration `ferramentaId`:** script SQL idempotente (`03-credencial-ferramenta-id.sql`) integrado ao fluxo de deploy com verificação pós-push.
- **Testes automatizados (MVP):**
  - Vitest: helpers (`apiUrl`, validação credenciais, `serializeCredencial`, `formatCurrency`)
  - Playwright: smoke E2E login → ferramentas (criar + ver custo) → credencial global (criar + listar)
  - `scripts/smoke-local.sh` e extensão de `verify-prod.sh` (schema + APIs 401/200)
  - GitHub Actions: `build` + `test` em todo push/PR
- **Gate de deploy:** `deploy-vps.sh` falha se `db push` não aplicar ou smoke pós-deploy detectar regressão crítica

## Capabilities

### New Capabilities

- `ferramentas-display-fix`: Correção de exibição pós-save de ferramentas (custo mensal, refresh, Decimal)
- `credencial-servico-nome`: Campo `servico` em credenciais globais (UI + API + schema)
- `deploy-qa-pipeline`: Testes Vitest + Playwright smoke + scripts de verificação + CI

### Modified Capabilities

- `credenciais-ferramentas`: Estender requisitos com coluna `servico` e resiliência da page quando migration pendente

## Impact

- **Schema:** `Credencial.servico String?`; migration `ferramentaId` (já no schema, falta no banco prod)
- **UI:** `FerramentasClient`, `CredenciaisPanel`, `ferramentas/page.tsx`
- **API:** `/api/ferramentas`, `/api/credenciais`
- **DevOps:** `package.json` (vitest, playwright), `.github/workflows/ci.yml`, `scripts/smoke-local.sh`, `deploy-vps.sh`, `verify-prod.sh`
- **Sem breaking changes** em credenciais de persona
