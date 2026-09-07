## 1. Schema e persistência

- [x] 1.1 Enums e modelos `IndiceCampanha` + `IndiceCampanhaLinha` no Prisma; unique `(campanhaId, tipo, chave, COALESCE(correspondencia, ''))`
- [x] 1.2 SQL idempotente `prisma/sql/17-indices-campanha.sql` + backfill dos 3 dispositivos nas campanhas existentes
- [x] 1.3 Lib de domínio (`src/lib/afiliados/indices.ts`): Zod, trio de dispositivos, vigente = última linha, cópia de métricas quando omitidas

## 2. API

- [x] 2.1 `GET`/`POST /api/afiliados/campanhas/[id]/indices` (lista com vigente; cria identidade + primeira linha; 401/422)
- [x] 2.2 `PATCH .../indices/[indiceId]` só flags da palavra-chave (sem inserir linha)
- [x] 2.3 `POST .../indices/[indiceId]/linhas` append (`origem` default MANUAL, aceita COLETA)
- [x] 2.4 `POST` de campanha: na transação, seed dos 3 dispositivos + linha inicial; rejeitar DISPOSITIVO fora do trio
- [x] 2.5 `GET /api/afiliados/produtos/[id]/comparativo` — vigentes alinhadas por `(tipo, chave, correspondencia)`
- [x] 2.6 Testes: unicidade keyword+correspondência, append 10→15, omitir métricas copia vigente, flags sem foto, seed no create, 401

## 3. Ficha da campanha

- [x] 3.1 Blocos vigentes (palavra-chave, 3 dispositivos, locais, públicos) em `CampanhaFichaClient`
- [x] 3.2 Formulários: criar keyword/local/público; registrar linha (lance/status/métricas); toggle validado/negativado
- [x] 3.3 Copy: lance não escreve no Ads; métricas do índice = acumulado Ads ≠ rollup por venda

## 4. Comparativo do produto

- [x] 4.1 Página `/afiliados/produtos/[id]/comparativo` — colunas = campanhas, cabeçalho com geo/estratégia/bridge/conta/status + roi/cpa de decisão
- [x] 4.2 Linhas alinhadas; vazio onde o índice não existe naquela campanha
- [x] 4.3 Link no catálogo quando o produto tem ≥1 campanha; sem campanha, sem entrada órfã

## 5. Linguagem e verificação

- [x] 5.1 `CONTEXT.md`: Palavra-chave ≠ Termo; vigente ≠ histórico; índice Ads ≠ `VendaAfiliado`
- [x] 5.2 `npm test` nos arquivos tocados
