# 18 — Modelo da fila de decisão

Type: grilling
Status: closed
Blocked by: 06, 07, 08, 10
Assignee: claude

## Question

A fila é o mecanismo canônico de "decida agora", travado no charting. Ela estende o padrão
`isReviewDue` / `nextReviewAt` que já existe em `src/lib/afiliados/review.ts` — função pura, sem
coluna derivada, avaliada em runtime.

Só pode ser desenhada depois que as regras de gatilho existirem, porque a forma da fila é
consequência delas.

Decidir:

- **Item de fila é calculado ou persistido?** `isReviewDue` calcula em runtime e não persiste nada
  (decisão registrada no `design.md` do change anterior). Isso funciona para "revisão vencida", mas
  a fila nova precisa de **snooze**, de **histórico do que foi ignorado**, e de saber que um item já
  foi mostrado — coisas que exigem persistência. Manter o padrão ou romper com ele?
- **Sobre o que o item aponta**: termo, oferta, produto ou campanha? Cada estágio gera item de um
  tipo diferente. Um tipo único com referência polimórfica, ou tipos separados?
- **Deduplicação**: uma campanha que bate três regras ao mesmo tempo gera um item ou três?
- **Ciclo de vida do item**: aplicado (vira ajuste registrado, ticket 12), dispensado, adiado, ou
  expirado por mudança de contexto (a condição deixou de valer sozinha).
- **Prioridade**: "campanha estourando budget" e "termo subindo no Trends" competem pela mesma
  atenção. Há ordenação, ou a fila é cronológica?
- **Superfície**: fila própria em `/afiliados`, ou os itens aparecem embutidos nas telas de produto
  e campanha? O widget de alertas de `/analytics` é precedente do segundo formato.
- **Gancho para push**: push está fora deste mapa, mas a fila deve nascer com forma que permita um
  transporte fino por cima — sem regra própria no n8n.

## Resolution (26/08/2026)

Fechado por interview (`/grilling`). Modelo único, `ItemFila`, resolve as sete perguntas:

1. **Híbrido, não 100% runtime nem 100% persistido.** A condição de disparo de cada regra continua
   **pura e recalculada em runtime** (mesma filosofia de `isReviewDue`/`alertaOrcamentoEstourado`) —
   nenhuma coluna congela "está estourando o budget". Mas quando uma condição dispara, ela é
   **materializada** (upsert) numa linha persistida, que carrega o ciclo de vida (snooze, histórico,
   "já visto") que não existe em runtime puro. A leitura da fila é o merge entre "o que dispara agora"
   e "o que já existe persistido pra aquele disparo".
2. **Tipo único com referência polimórfica fraca**: `tipoAlvo` (enum `OFERTA` | `CAMPANHA`,
   extensível) + `alvoId` (string, sem FK) — mesmo padrão já usado no Estúdio de Vídeo
   (`personaId`/`postId` como "referências soltas"). Só dois alvos reais existem hoje nas regras já
   fechadas (06 aponta pra `OfertaDecisao`; 07/08/09/10 apontam pra `Campanha`); `Termo` e `Produto`
   nunca são alvo próprio — termo entra como breakdown dentro do item de oferta (ticket 06), produto é
   leitura agregada, não decisão pontual (`CONTEXT.md`).
3. **Deduplicação por `(regra, tipoAlvo, alvoId)`, não por alvo sozinho.** Regras diferentes no mesmo
   alvo geram itens diferentes sempre — confirma o precedente já fechado no ticket 09 (teto de faixa
   + entrada em escala coexistindo na mesma campanha, "dois itens legítimos e independentes"). Não há
   supressão genérica na fila; supressão pontual entre regras específicas (ex.: ticket 10, item 4
   pausa enquanto item 5 está ativo) é lógica da regra de origem, não filtro da fila.
4. **Ciclo de vida: enum de 5 estados** — `ABERTO` (default), `ADIADO` (carrega `adiadoAte`, volta a
   `ABERTO` sozinho quando passa, recalculado na leitura), `APLICADO` (terminal; o que "aplicar"
   dispara por baixo é específico de cada regra — grava `AjusteCampanha` pro ticket 12 nas regras de
   escrita externa, ou é o próprio write de campo interno como `Campanha.status` nas regras de
   transição de estado, ex. ticket 09), `DISPENSADO` (terminal, decisão deliberada do operador),
   `EXPIRADO` (terminal, fechado pelo **sistema** quando a condição para de disparar sozinha — é a
   "mudança de contexto"). A chave de dedup do item 3 só é única **enquanto não-terminal**: uma nova
   ocorrência da mesma regra pro mesmo alvo depois de um terminal cria linha nova, não reabre a antiga.
5. **Prioridade fixada pela regra de origem, não calculada pela fila.** Enum `ALTA`/`MEDIA`/`BAIXA`
   por item, atribuído por quem cria/atualiza (o ticket 06 já calcula sua própria priorização interna
   — "prioridade máxima"/"prioridade média" — e só promove esse valor pro campo padrão). Fila ordena
   por `(prioridade desc, criadoEm asc)`. Nenhuma fórmula de score cross-regra — coerente com o mapa
   rejeitar inferência estatística em outros pontos (sazonalidade, aprendizado).
6. **Superfície dupla, uma canônica.** Fila própria (rota dedicada) é a única com os botões de ação
   (adiar/dispensar/aplicar) e a fonte de verdade do estado. Fichas de `Campanha`/`OfertaDecisao`
   mostram os itens daquele `alvoId` embutidos, mesma query filtrada, sem ação própria — não é uma
   segunda fonte de dado, é a mesma tabela vista com outro filtro.
7. **Contrato com push: nenhum campo dedicado.** `resumo` (texto humano pronto, escrito pela regra ao
   criar/atualizar o item — a frase que vai pro Telegram, não algo que o push compõe fazendo join em
   domínio), `createdAt`/`updatedAt` padrão (poll incremental) e `prioridade` (já decidida no item 5,
   decide o que interrompe vs. vai pra digest) bastam. Push é leitor puro por cima da fila, sem regra
   própria no n8n.

**Forma resultante do modelo** (nomes de trabalho, a redação final é da OpenSpec change):

```
ItemFila {
  id, regra (string, chave da regra de origem — ex. "escala.recuoImediato"),
  tipoAlvo (enum OFERTA | CAMPANHA), alvoId (string, sem FK),
  status (enum ABERTO | ADIADO | APLICADO | DISPENSADO | EXPIRADO),
  prioridade (enum ALTA | MEDIA | BAIXA),
  resumo (string), payload (Json — breakdown específico da regra),
  adiadoAte (DateTime?), createdAt, updatedAt
}
```

Unicidade `(regra, tipoAlvo, alvoId)` é **parcial** (só entre não-terminais) — detalhe de índice
parcial que fica pra escrita da migração, não decisão de modelo em aberto.

Não desenha `AjusteCampanha` (ticket 12, ainda bloqueado por 11) — só deixa o gancho (`APLICADO` como
destino comum, sem prescrever o que cada regra faz ao atingi-lo). Não desbloqueia nenhum ticket
diretamente (nenhum ticket aberto está bloqueado por este).
