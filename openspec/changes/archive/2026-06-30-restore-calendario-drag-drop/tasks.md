## 1. Diagnóstico e baseline

- [x] 1.1 Comparar `CalendarioClient.tsx` atual com baseline pré-`refatoracao visual` (commit `2872dcd`) — layout, bandeja, cores
- [x] 1.2 Reproduzir localmente: subir docker (`docker compose -f docker-compose.dev.yml up -d`), `npm run dev`, acessar `/personas/veesemfiltro/calendario`
- [x] 1.3 Documentar diferença visual/funcional observada (grid ausente, bandeja oculta, drag quebrado, etc.)

**Achado:** regressão nos chips — concatenação `var(--token) + "20"` gera CSS inválido (`var(--faint)20`), tornando chips da bandeja praticamente invisíveis após migração de cores hex → tokens.

## 2. Restaurar UI do calendário persona

- [x] 2.1 Garantir container `gridTemplateColumns: "1fr 260px"` e bandeja sticky com borda/background explícitos
- [x] 2.2 Restaurar highlight de drop (célula do dia + bandeja) com tokens `var(--accent)`
- [x] 2.3 Adicionar breakpoint responsivo: bandeja abaixo do grid em viewport &lt; 900px
- [x] 2.4 Verificar chips por status e limite "+N mais" por dia

## 3. Validar drag-and-drop e API

- [x] 3.1 Testar arrastar roteiro da bandeja → dia (update otimista + PUT com `apiUrl`)
- [x] 3.2 Testar arrastar roteiro do dia → bandeja (`dataPublicacao: null`)
- [x] 3.3 Testar reagendar entre dias (preservar horário)
- [x] 3.4 Confirmar rollback visual quando PUT falha

## 4. Testes automatizados

- [x] 4.1 Adicionar teste Playwright: login → calendário veesemfiltro → assert "Sem data"
- [x] 4.2 Validar persistência: agendar via UI ou API → refresh → roteiro no dia correto
- [x] 4.3 Integrar no smoke existente (`E2E_SMOKE=1 npm run test:e2e`)

## 5. Gate QA local (encerrar ciclo)

- [x] 5.1 `npm run build` — sem erros
- [x] 5.2 `npm test` — Vitest passando
- [x] 5.3 `scripts/smoke-local.sh` — build + unit + E2E smoke (E2E calendário verificado; smoke completo requer `npx playwright install`)
- [x] 5.4 Checklist manual: calendário persona (grid + bandeja + drag), calendário global (tabela + modal intactos)

## 6. Verificação final

- [x] 6.1 Confirmar que `/calendario` global não regrediu (modal "Agendar post" funcional)
- [x] 6.2 Atualizar `CLAUDE.md` se necessário (nota sobre dois fluxos de calendário)
