## Context

O módulo Afiliados já tem Radar (`/afiliados/radar`), Contas (`/afiliados`) e Catálogo (`/afiliados/produtos`). A ficha operacional do produto (`CatalogoClient`) edita `linkLanding`/`linkCheckout` e, no modo edição, importa CSV de performance de campanhas. A sidebar aponta para `/afiliados` (lista de contas).

O Zod de `ProdutoAfiliado` limita `slug` a 50 caracteres; os campos de URL não têm teto explícito e o Prisma marca `String?` (TEXT no SQL de init). Na prática o operador não consegue gravar URLs reais de LP/checkout — o limite de string curta precisa ser desacoplado do slug e os links precisam de teto de URL (2048).

## Goals / Non-Goals

**Goals:**

- Gravar URLs longas de LP e checkout no create/update do produto.
- Modal de produto só edita a ficha (e criação manual de campanha); sem import CSV nesse modal.
- Clicar em Afiliados na sidebar abre o Radar com a aba correspondente ativa.

**Non-Goals:**

- Não alterar conversion point (UI, Zod, API, Go!, Prisma, testes).
- Não apagar o endpoint `POST /api/afiliados/produtos/[id]/campanhas/import-csv` nem o parser de CSV de campanhas.
- Não mudar a URL da lista de contas (`/afiliados` continua sendo Contas de tráfego).
- Não alterar o import CSV de ofertas do Radar.

## Decisions

### 1. Teto de URL 2048, slug permanece 50

**Decisão:** Em `produtoAfiliadoSchema` / `produtoUpdateSchema`, `linkLanding` e `linkCheckout` passam a `z.string().max(2048).optional().nullable()` (string vazia → `null`). Slug continua `min(2).max(50)`. No Prisma, anotar `linkLanding` e `linkCheckout` com `@db.Text`. SQL idempotente só se o banco local/prod ainda estiver em `VARCHAR` curto.

**Alternativas:** Validar com `z.string().url()` — rejeitaria links relativos e parâmetros malformados que o operador cola da rede. Sem teto — aceitável em TEXT, mas um max de URL é um contrato testável.

### 2. Import CSV sai só do modal

**Decisão:** Remover file input, botão, handler `importCsv` e estado `csvFile` de `CatalogoClient`. Manter “+ Campanha” no modal. Ajustar copy da linha expandida que hoje diz “Abra Editar para criar ou importar CSV”.

**Alternativas:** Mover o import para a linha expandida da tabela — fora de escopo; o pedido é retirar do modal.

### 3. Sidebar → `/afiliados/radar`

**Decisão:** `sidebar.tsx` item Afiliados com `href: "/afiliados/radar"`. Destacar ativo para qualquer path que comece com `/afiliados` (já deve ocorrer via `startsWith`). `AfiliadosMainNav` já lista Radar primeiro; `/afiliados` permanece a página de contas.

**Alternativas:** Redirect 308 de `/afiliados` → `/afiliados/radar` — quebraria a aba Contas, que usa exatamente `/afiliados`. Trocar as rotas (Radar na raiz) — mais diff, URLs atuais de contas quebram.

## Risks / Trade-offs

- [URLs ainda falham se a coluna no banco for VARCHAR(50)] → Conferir tipo real; se não for TEXT, `ALTER COLUMN ... TYPE TEXT` idempotente em `prisma/sql/`.
- [Operador perde import CSV no catálogo] → API continua; Radar segue com import de ofertas. Documentar no empty state que campanha se cria pelo nome no modal.
- [Bookmark `/afiliados` continua nas contas] → Intencional; só a entrada da sidebar muda.

## Migration Plan

1. Validação + UI de URLs (pode ir sozinho).
2. Remover CSV do modal.
3. Trocar href da sidebar.
4. Testes de schema Zod (URL > 50 chars ok; slug > 50 continua 422).
5. Rollback: reverter os diffs de UI/validação; dados de URL longos já gravados continuam válidos em TEXT.

## Open Questions

- Nenhum bloqueante. Se no apply o Postgres local ainda limitar VARCHAR, incluir o ALTER no mesmo PR.
