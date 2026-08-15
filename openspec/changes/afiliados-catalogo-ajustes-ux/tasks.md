## 1. URLs de LP e checkout

- [x] 1.1 Em `produtoAfiliadoSchema` / `produtoUpdateSchema`, validar `linkLanding` e `linkCheckout` com `z.string().max(2048)` (vazio → null); manter `slug` em max 50
- [x] 1.2 Anotar `linkLanding` e `linkCheckout` como `@db.Text` no Prisma; se o banco ainda for VARCHAR curto, adicionar ALTER idempotente em `prisma/sql/`
- [x] 1.3 Garantir que os inputs de LP/checkout no modal do catálogo não truncam (sem maxLength 50)

## 2. Modal sem import CSV

- [x] 2.1 Remover input de arquivo, botão "Importar CSV", handler e estado `csvFile` do modal em `CatalogoClient.tsx`
- [x] 2.2 Ajustar copy da linha expandida que cita import CSV no Editar; manter "+ Campanha" e o endpoint `import-csv`

## 3. Entrada do módulo no Radar

- [x] 3.1 Alterar o href do item Afiliados em `sidebar.tsx` para `/afiliados/radar`, mantendo ativo em qualquer `/afiliados*`
- [x] 3.2 Confirmar que `AfiliadosMainNav` marca Radar como aba ativa nessa rota e que `/afiliados` continua a lista de contas

## 4. Testes

- [x] 4.1 Teste Zod/API: URL > 50 chars persiste; slug > 50 retorna 422
- [x] 4.2 `npm test` passando nos arquivos tocados
