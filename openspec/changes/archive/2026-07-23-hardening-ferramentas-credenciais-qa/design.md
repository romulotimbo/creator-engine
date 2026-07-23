## Context

Produção em `romulohub.cloud/creator-engine` com Traefik, Postgres `creator_engine`, deploy via `scripts/deploy-vps.sh`. Bugs recentes: `apiUrl` sem basePath, cache RSC em credenciais, coluna `ferramentaId` ausente no banco.

`Ferramenta.custoMensal` é `Decimal` no Prisma. A page já faz `Number(f.custoMensal)`, mas a API GET `/api/ferramentas` retorna Decimal bruto (objeto) se usada pelo client — e falhas na seção de credenciais (query com coluna inexistente) podem impedir re-render da página inteira após `router.refresh()`.

Credenciais globais têm `categoria` + `ferramentaId` opcional, mas operador precisa rotular serviços não cadastrados em `Ferramenta` (IPRoyal como proxy, sem registro CE-01).

Não há testes no `package.json` hoje.

## Goals / Non-Goals

**Goals:**

- Ferramenta recém-cadastrada exibe `custoMensal` na tabela e no card de dashboard após save
- Credencial global com campo **Serviço** (ex.: IPRoyal) visível na listagem
- `ferramentaId` aplicado no banco prod via deploy verificável
- Pipeline: `npm test` + smoke E2E local + CI no GitHub; gate básico antes de considerar deploy OK

**Non-Goals:**

- Cobertura 100% E2E de todos os módulos
- Testes de carga ou segurança automatizados (pen test)
- Substituir `ferramentaId` pelo campo `servico` — são complementares

## Decisions

### D1 — Campo `servico` em Credencial (não renomear `chave`)

**Decisão:** Adicionar `servico String?` — label do provedor/serviço. `chave` continua sendo login/token/user; `categoria` continua sendo tipo (proxy, api).

**Alternativa rejeitada:** Usar só `notas` — sem estrutura, não filtrável na tabela.

### D2 — Resiliência da page Ferramentas

**Decisão:** Carregar ferramentas e credenciais em queries separadas com try/catch ou `Promise.allSettled`; se credenciais falharem (schema), exibir banner de migration pendente mas **manter tabela de ferramentas funcional**.

### D3 — Serialização Decimal centralizada

**Decisão:** Helper `serializeFerramenta()` em `src/lib/ferramentas.ts` — converte `custoMensal` → `number | null` em page e respostas JSON da API.

### D4 — Stack de testes (MVP)

| Camada | Ferramenta | Escopo |
|--------|------------|--------|
| Unit | **Vitest** | `apiUrl`, `credCreateSchema`, `serializeFerramenta`, `formatCurrency` |
| E2E smoke | **Playwright** | Login → criar ferramenta com custo → assert tabela → criar cred global com servico |
| Pré-deploy local | `scripts/smoke-local.sh` | `npm run build`, `npm test`, opcional `npm run test:e2e` com compose dev |
| Pós-deploy VPS | `verify-prod.sh` | + check coluna `ferramentaId`, + `servico` após migration, rotas API |

**Alternativa rejeitada:** só testes manuais — já falhou em prod repetidamente.

### D5 — CI GitHub Actions

**Decisão:** Workflow `.github/workflows/ci.yml`:
- `npm ci` → `prisma generate` → `npm run build` → `npm run test`
- Playwright em job separado (opcional `continue-on-error` inicialmente) com `docker compose -f docker-compose.dev.yml up -d` + seed

### D6 — Gate em deploy-vps.sh

**Decisão:** Após `db push`, rodar SQL de verificação:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema='creator_engine' AND table_name='Credencial'
AND column_name IN ('ferramentaId','servico');
```
Falhar deploy se colunas esperadas ausentes após push.

## Risks / Trade-offs

- **[Risk] Playwright flaky em CI** → Mitigação: smoke mínimo (3 cenários), retries=1, rodar contra DB seed fixo
- **[Risk] E2E lento no VPS** → Mitigação: E2E só local/CI; VPS usa `verify-prod.sh` HTTP-only
- **[Trade-off] `servico` + `ferramentaId` redundantes** → Aceitável: servico para label rápido; ferramentaId para link CE-01

## Migration Plan

1. `03-credencial-ferramenta-id.sql` (se ainda não aplicado)
2. `db push` para `Credencial.servico`
3. Deploy app
4. Rodar `npm run test` + smoke local antes de push
5. `deploy-vps.sh` com verificação de schema

## Open Questions

- _(Nenhuma bloqueante)_ — prioridade: fix ferramentas + servico + Vitest/Playwright smoke
