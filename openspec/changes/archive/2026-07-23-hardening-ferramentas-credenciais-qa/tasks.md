## 1. Fixes imediatos (prod)

- [x] 1.1 Criar `serializeFerramenta()` — `custoMensal` Decimal → number em page e APIs GET/POST/PUT
- [x] 1.2 Tornar `/ferramentas` resiliente: credenciais em bloco separado com fallback se query falhar
- [x] 1.3 Garantir `prisma/sql/03-credencial-ferramenta-id.sql` no repo e verificação em `deploy-vps.sh`

## 2. Campo servico (credencial global)

- [x] 2.1 Adicionar `servico String?` em `Credencial` + `db push`
- [x] 2.2 Estender API credenciais (POST/PUT/GET) e `credCreateSchema` com `servico`
- [x] 2.3 UI `CredenciaisPanel`: campo Serviço no modal + coluna na tabela global

## 3. Testes unitários (Vitest)

- [x] 3.1 Instalar Vitest + config (`vitest.config.ts`)
- [x] 3.2 Testes: `apiUrl` (com/sem basePath), `formatCurrency`, `credCreateSchema`, `serializeFerramenta`
- [x] 3.3 Script `npm test` no `package.json`

## 4. Smoke E2E (Playwright)

- [x] 4.1 Instalar Playwright + `playwright.config.ts` (baseURL com basePath)
- [x] 4.2 Teste smoke: login → ferramenta com custo → assert tabela → credencial global com servico
- [x] 4.3 Script `npm run test:e2e` + doc em `DEPLOY.md`

## 5. CI e gates de deploy

- [x] 5.1 Criar `.github/workflows/ci.yml` (build + test)
- [x] 5.2 Criar `scripts/smoke-local.sh` (build + test; E2E opcional)
- [x] 5.3 Estender `verify-prod.sh`: checar colunas `ferramentaId` e `servico` no Postgres
- [x] 5.4 Atualizar `CLAUDE.md` e `DEPLOY.md` com fluxo de testes pré-deploy

## 6. Verificação final

- [x] 6.1 `npm run build` + `npm test` + smoke E2E local
- [x] 6.2 Deploy VPS com `db push` + confirmar custo mensal e servico em prod
