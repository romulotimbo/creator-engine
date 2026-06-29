## 1. Schema Prisma

- [x] 1.1 Adicionar `ferramentaId String?` em `Credencial` com FK → `Ferramenta` (`onDelete: SetNull`) e relação inversa `Ferramenta.credenciais`
- [x] 1.2 Adicionar `@@index([ferramentaId])` e rodar `prisma db push` + `prisma generate` local

## 2. API de credenciais

- [x] 2.1 Estender `GET /api/credenciais`: filtros `global=true`, `ferramentaId`; manter `personaId` para escopo persona; resposta sem `valorEnc`
- [x] 2.2 Estender `POST /api/credenciais`: aceitar `ferramentaId` opcional; validar escopo (`global=false` exige personaId; `global=true` proíbe personaId)
- [x] 2.3 Estender `PUT /api/credenciais/[id]`: permitir editar `ferramentaId`, `categoria`, `chave`, `notas`, `valor`; proibir mudança de escopo (`global`/`personaId`)
- [x] 2.4 Garantir queries da page persona filtram `global=false` exclusivamente

## 3. Componente compartilhado

- [x] 3.1 Extrair `CredenciaisPanel` de `CredenciaisClient` com props `escopo`, `personaId?`, `ferramentas?`, `credenciais`, `logs`
- [x] 3.2 Modal global: select opcional de ferramenta (`ferramentaId`); categorias sugeridas para tools (runpod, comfyui, api, etc.)
- [x] 3.3 Refatorar `CredenciaisClient` para wrapper fino que passa `escopo="persona"`

## 4. UI Ferramentas

- [x] 4.1 Estender `ferramentas/page.tsx`: carregar credenciais `global=true` + logs + lista de ferramentas para dropdown
- [x] 4.2 Integrar `CredenciaisPanel` com `escopo="global"` abaixo do dashboard existente em `FerramentasClient` ou page
- [x] 4.3 Audit log compacto (últimos 15) na seção de credenciais globais

## 5. Verificação

- [x] 5.1 Smoke test: criar credencial global vinculada a ferramenta, reveal, editar, excluir — audit log ok
- [x] 5.2 Smoke test: credencial global NÃO aparece em `/personas/{slug}/credenciais`
- [x] 5.3 Smoke test: credencial de persona NÃO aparece em `/ferramentas`
- [x] 5.4 `npm run build` sem erros TypeScript
- [x] 5.5 Atualizar `CLAUDE.md` — documentar credenciais globais em Ferramentas e campo `ferramentaId`
