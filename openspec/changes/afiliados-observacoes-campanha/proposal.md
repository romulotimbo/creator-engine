## Why

A ficha da campanha só tem campos fechados e `bridgeObservacoes` (LP). Plano, copy, prompt, justificativa e o resto que não cabe nesses campos ficam fora do sistema. O produto já tem `observacoes`, mas a UI é um textarea de duas linhas no modal do catálogo — inviável para um documento vivo.

## What Changes

- Campo novo `Campanha.observacoes`: documento vivo desta tentativa (texto puro, overwrite). Morre com a campanha; campanha nova no mesmo produto nasce sem esse texto.
- Não inchá `bridgeObservacoes`. Observações da bridge continua só LP.
- Não cria `observacoes` no produto — o campo já existe. Particularidade que vale para qualquer campanha permanece lá.
- Mesmo editor para os dois: modal amplo, textarea grande, texto puro. Sem formatação, sem vigente/retirado, sem herança no reteste.
- Fora: diário append-only, biblioteca de copy, versionamento, editor rico, PromptGlobal, `AjusteCampanha.motivo`.

## Capabilities

### New Capabilities

- `afiliados-observacoes`: documento vivo (campanha e produto), persistência overwrite, modal amplo compartilhado, fronteira com Observações da bridge.

### Modified Capabilities

- `campanha-ficha`: a ficha expõe Observações da Campanha (abrir/editar no modal) e o PATCH aceita `observacoes`; `bridgeObservacoes` intacto.
- `produtos-afiliados`: Observações do Produto abre no mesmo modal amplo, no lugar do textarea curto do catálogo.

## Impact

- **Schema:** `Campanha.observacoes` (`String?` `@db.Text`). SQL idempotente em `prisma/sql/` para banco existente. `ProdutoAfiliado.observacoes` sem mudança de coluna.
- **API:** `PATCH /api/afiliados/campanhas/[id]` passa a aceitar `observacoes`. Create/update de produto já persiste `observacoes` — só a UI muda.
- **UI:** modal amplo na ficha da campanha e no catálogo (edição do produto). Sem dependência nova de editor rico.
- **Docs:** `CONTEXT.md` já distingue Observações da Campanha / do Produto / da bridge.
