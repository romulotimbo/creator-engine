## Why

O módulo de Radar & Decisão de Ofertas (`OfertaDecisao`) foi lançado com o core de scoring e migração. No entanto, seis dimensões de governança identificadas no documento de mapeamento de campos (`docs/mapeamento-campos-decisao-campanha.md`, seções 5.1–5.7) ainda não foram implementadas: confiabilidade da rede, revisão obrigatória por prazo, rastreio histórico de domínios, painel agregado de alocação de capital, versionamento de termos de afiliado e origem da descoberta da oferta. Sem essas peças, o operador toma decisões com contexto incompleto (risco de pagamento da rede desconhecido, domínios queimados reutilizados, termos desatualizados, capital pulverizado sem visibilidade).

## What Changes

- **`Network.paymentReliabilityScore`**: Novo campo `Int?` (0–100) na entidade `Network` (a ser criada como tabela de apoio). Exibido como badge contextual ao lado do nome da rede na tela de oferta — não entra no cálculo de `scoreCalculado` do `OfertaDecisao`.
- **`Offer.nextReviewAt`**: Novo campo `DateTime?` em `OfertaDecisao`. Rotina diária (`isReviewDue`) identifica ofertas que precisam de revisão (`approvalStatus = "pending"` ou `nextReviewAt <= today`) e as destaca em view/filtro dedicado "Precisa de revisão".
- **`DomainUsageLog`**: Nova entidade de auditoria. A cada mudança de `domainUsed` em `OfertaDecisao`, o registro anterior é fechado (`usedUntil = now`) e um novo aberto (`usedFrom = now`). View de consulta para domínios com `reputationStatus` igual a `flagged` ou `burned`.
- **Capital allocation widget**: Função `getActiveCapitalAllocation()` consumida num widget agregado (fora da tela individual de oferta), somando `budgetTesteAlocado` de todas as ofertas com `statusDecisao` em `APROVADO_TESTE`/`EM_EXECUCAO`. `totalAvailableCapital` vem de config global (tabela `PortfolioConfig`), não duplicado por oferta.
- **`TermsVersion`**: Nova entidade de auditoria. Toda vez que `OfertaDecisao.termsVerifiedAt` é atualizado com mudança percebida nos termos, um registro é criado (em vez de sobrescrever), permitindo auditoria de "o que mudou e quando".
- **`Offer.discoverySource`**: Novo campo enum/string em `OfertaDecisao` para marcar a origem da descoberta (`search_from`, `network_direct`, `glimpse`, `keyword_planner`, `indicacao`, `outro`). Sem lógica adicional — campo de tag para futuras agregações.

## Capabilities

### New Capabilities

- `network-reliability`: Entidade `Network` com `paymentReliabilityScore` e badge de exibição na UI de oferta
- `offer-review-queue`: Campo `nextReviewAt` + lógica `isReviewDue` + view/filtro "Precisa de revisão" na UI do Radar
- `domain-usage-history`: Entidade `DomainUsageLog` com ciclo de vida de abertura/fechamento a cada mudança de domínio e view de domínios problemáticos
- `capital-allocation-panel`: Widget agregado `getActiveCapitalAllocation()` + tabela `PortfolioConfig` para `totalAvailableCapital`
- `terms-versioning`: Entidade `TermsVersion` com histórico append-only de mudanças de termos por oferta
- `offer-discovery-source`: Campo `discoverySource` em `OfertaDecisao`

### Modified Capabilities

- `afiliados-decisao-campanha`: `OfertaDecisao` recebe novos campos (`nextReviewAt`, `domainUsed`, `termsVerifiedAt`, `discoverySource`, `networkId`); regras de score e `scoreBreakdown` são sempre computados (nunca editáveis), clampados em [0, 100]; percentuais na escala 0–100.

## Impact

- **Schema (Prisma)**: Novas tabelas `Network`, `DomainUsageLog`, `TermsVersion`, `PortfolioConfig`; campos adicionados em `OfertaDecisao`.
- **API**: Novos endpoints para `Network` CRUD, `DomainUsageLog` query, `TermsVersion` append, `PortfolioConfig` leitura/atualização, widget `getActiveCapitalAllocation`.
- **UI**: Badge de confiabilidade na tela de oferta; filtro "Precisa de revisão" no Radar; widget de capital no header/sidebar do módulo Afiliados; view de domínios problemáticos.
- **Lógica de scoring**: `score`/`scoreBreakdown` recalculados automaticamente a cada update relevante de `OfertaDecisao` (não sob demanda). Escala de percentuais 0–100 (não 0–1). Resultado clampado em [0, 100] mesmo se `rawTotal` for negativo.
- **Dependências**: Nenhuma nova biblioteca externa esperada — usa Prisma, Next.js API routes e React já existentes.
