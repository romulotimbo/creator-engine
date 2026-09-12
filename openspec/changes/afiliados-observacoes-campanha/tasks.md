## 1. Schema e contrato

- [x] 1.1 Adicionar `Campanha.observacoes String? @db.Text` no Prisma (não mexer em `bridgeObservacoes` nem em `ProdutoAfiliado.observacoes`)
- [x] 1.2 SQL idempotente `prisma/sql/18-observacoes-campanha.sql` (`ADD COLUMN IF NOT EXISTS`)
- [x] 1.3 Incluir `observacoes` em `campanhaCreateSchema` / `campanhaUpdateSchema`; vazio → `null`

## 2. API

- [x] 2.1 `PATCH /api/afiliados/campanhas/[id]` persiste `observacoes`; GET/payload da ficha devolve o campo
- [x] 2.2 `POST` de campanha não copia `observacoes` da origem / do produto — nova campanha nasce `null`
- [x] 2.3 Teste: gravar, apagar→null, create sem herança, 401; `bridgeObservacoes` isolado

## 3. Modal compartilhado

- [x] 3.1 Componente `ObservacoesEditorModal` (`Modal` existente, `maxWidth` amplo, `Textarea` grande, texto puro)
- [x] 3.2 Ficha: entrada “Observações da campanha” distinta da bridge; abre o modal e grava via PATCH
- [x] 3.3 Catálogo: remover textarea de 2 linhas; mesma entrada/modal para Observações do Produto (create/update já existente)

## 4. Verificação

- [x] 4.1 `CONTEXT.md` já distingue os três termos — só conferir se o apply não divergiu
- [x] 4.2 `npm test` nos arquivos tocados
