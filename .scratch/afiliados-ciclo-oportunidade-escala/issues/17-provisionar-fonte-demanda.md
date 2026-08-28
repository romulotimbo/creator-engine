# 17 — Provisionar a fonte de sinal de demanda de busca

Type: task
Status: open
Blocked by: 23

Nota (24/08/2026): ticket 22 fechado — fonte decidida (Google Keyword Planner primário, Bing coleta
silenciosa). Este ticket ainda cita premissas que o 22 revisou (índice relativo, acompanhamento
diário via Trends) — reler à luz da decisão do 22 antes de executar, não só desbloquear.

## Question

Trabalho manual que destrava a modelagem da série de busca com **dados reais** em vez de suposições
sobre o formato da resposta. O ticket é agnóstico de fornecedor: qual fonte provisionar sai do
ticket 21.

Quando a fonte estiver decidida:

1. Obter acesso (HITL onde exigir cadastro, cartão ou aceite de termos — o agente não faz).
2. Guardar credenciais no cofre do próprio Creator Engine — o módulo de credenciais globais em
   `/ferramentas` já existe (`Credencial` com `global=true` + `ferramentaId`, AES-256-GCM). Se a
   fonte tiver custo recorrente, cadastrar a `Ferramenta` correspondente para o dashboard de
   assinaturas contar. **Depende do banco de pé** — Docker Desktop estava parado em 21/08/2026.
3. Puxar **uma resposta real** de cada endpoint relevante, para 2 ou 3 termos reais do catálogo, em
   pelo menos 2 geos. Salvar os JSONs como fixtures.
4. Registrar na resolução: limites efetivos, custo (se houver) e o formato real da resposta.

Termos de teste propostos (do catálogo real em `docs/afiliados/produtos.csv`), escolhidos por
representarem formatos de curva diferentes: `nerve fresh` (marca, +85,6% em 30d — caso ascendente),
`lipobliss` (marca, −62,3% — caso queda/recuperação) e `nerve pain supplement` (genérico, para ver
volume alto e sazonalidade). Geos propostos: **US + CA** — os dois do exemplo de ajuste de lance por
local do próprio operador. Ambos pendentes de confirmação.

## Verificações que só uma chamada real resolve

Independem de fornecedor — são propriedades do dado do Google, não do intermediário:

1. **Granularidade da série relativa por janela de tempo.** Nenhuma fonte primária publica o
   mapeamento janela → granularidade (diária/semanal/mensal). Se a janela curta não devolver bucket
   diário, o acompanhamento diário de campanha viva perde base e o ticket 08 (Trends como insumo de
   re-teste) muda de forma.
2. **Largura do bucket de arredondamento do volume absoluto.** O Google declara que arredonda mas
   não publica a largura. Sem isso, não dá para saber se 1.300 → 1.600 é crescimento ou ruído — e a
   regra de curva ascendente (ticket 06) depende dessa distinção.

Aproveitar a mesma sessão para puxar o equivalente de `ad_traffic_by_keywords` (insumo do ticket 19)
e um histórico de backlinks de um domínio de oferta real (insumo do ticket 06), se a fonte escolhida
oferecer.

## Histórico — DataForSEO descartada (21/08/2026)

A DataForSEO foi a primeira candidata (ver ticket 01, que segue válido como levantamento de fatos e
como benchmark do que uma fonte paga entrega). **Descartada por barreira de entrada:**

- Autenticação validada — `GET /v3/appendix/user_data` respondeu HTTP 200 / `status_code 20000`.
- `GET /v3/keywords_data/google_ads/status` respondeu **HTTP 403 / `status_code 40104`** —
  *"Please verify your account before using the API."*
- Saldo de trial: **US$ 1**, o que cobriria a bateria de fixtures (≈ US$0,35). Mas a verificação da
  conta **exige depósito de US$50**, tornando o crédito de trial inutilizável. Sem free tier real.
- Fatos aproveitáveis do teste: rate limits da conta real batem com a documentação (2000/min total;
  12/min nos endpoints Google Ads live).
- Script de sondagem sem custo preservado em `.scratch/dfs/probe-free.mjs` (lê de `process.env`,
  nunca imprime credencial) — serve de molde para sondar qualquer fornecedor futuro.
- Credenciais seguem em `.env` local, que é coberto pelo `.gitignore` (linha 34, `.env*`) e não está
  versionado. Podem ser removidas.
