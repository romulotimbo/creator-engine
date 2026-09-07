## Why

O catálogo de produtos impede gravar URLs reais de LP e checkout (a validação trata string curta, típica de slug), o modal de edição mistura ficha do produto com import de performance, e entrar em Afiliados pela sidebar cai em Contas de tráfego em vez do Radar — o fluxo diário de decisão.

## What Changes

- Permitir URLs longas de landing page e checkout na ficha do produto (validação, persistência e inputs), no mínimo 2048 caracteres — o limite de 50 continua só no slug.
- Retirar a UI de importar CSV do modal de edição/ficha operacional do produto. O endpoint de import de campanhas permanece para uso fora desse modal.
- A entrada principal do módulo (item Afiliados na sidebar) abre **Radar e decisão de ofertas** (`/afiliados/radar`). A aba Contas de tráfego continua em `/afiliados`.

Fora de escopo: conversion point permanece como está (UI, API, schema, Go!).

## Capabilities

### New Capabilities

- (nenhuma)

### Modified Capabilities

- `produtos-afiliados`: `linkLanding`/`linkCheckout` aceitam URLs longas; modal de edição sem import CSV.
- `afiliados-radar-decisao`: a navegação do módulo inicia no Radar.
- `afiliados-conta-trafego`: o item da sidebar passa a levar ao Radar, não à lista de contas.

## Impact

- **UI:** `CatalogoClient.tsx` (inputs de URL, import CSV no modal), `sidebar.tsx`, textos vazios que citam import no Editar.
- **Validação:** `produtoAfiliadoSchema` / `produtoUpdateSchema` em `src/lib/afiliados.ts` — URLs com teto alto.
- **API:** POST/PUT de produtos persistem URLs longas. Import CSV de campanhas não é removido da API.
- **Schema Prisma:** `linkLanding`/`linkCheckout` explícitos como texto longo se o banco ainda limitar. Conversion point intocado.
- **Testes:** Zod/API de URLs vs slug; smoke do catálogo.
