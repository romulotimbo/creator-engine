# 13 — LP bridge como entidade categorizável

Type: grilling
Status: closed
Blocked by: —
Assignee: claude

## Question

"Tipo de landing page bridge" é uma das variáveis que você quer comparar entre cenários, e **não
existe no modelo**. Hoje só há `ProdutoAfiliado.linkLanding` (uma URL) e, no doc de mapeamento,
`tipo_pagina_permitida` (`VSL | TSL | DTC`) como campo nunca modelado.

Decidido no charting: a categorização é **manual agora**, com sugestão automática por algoritmo no
futuro. A categoria é definida **por teste e por campanha**.

Decidir:

- **Entidade própria ou atributo da campanha?** Se uma mesma bridge é reusada entre campanhas, ela é
  entidade com identidade e a campanha aponta para ela. Se cada teste tem a sua, é atributo. A
  comparação cross-produto ("bridges tipo advertorial performam melhor") funciona nos dois casos —
  o que muda é se você consegue dizer "esta bridge específica performou melhor".
- **Taxonomia inicial**: quais categorias existem no dia 1 (TSL, VSL, advertorial, quiz, review,
  direct link…) e se a lista é enum fechado ou tabela editável. Enum trava e é seguro; tabela cresce
  e permite a sugestão automática futura.
- **Atributos comparáveis além do tipo**: idioma, tempo de carregamento, com/sem captura de e-mail?
  Ou só o tipo, e o resto fica para quando houver dado?
- **Vínculo**: campanha → uma bridge, ou campanha → várias (teste A/B de bridge dentro da campanha)?
  A segunda opção cria um quarto grão de performance — avaliar se vale.
- **Gancho para o algoritmo futuro**: o que o modelo precisa guardar hoje (URL, snapshot do HTML,
  tags) para que a sugestão automática seja possível depois sem migração dolorosa.

## Resolution (27/08/2026)

Fechado por interview (`/grilling`). Forma final da decisão:

1. **Atributo da campanha, não entidade com identidade própria.** Confirmado por interview: cada
   teste sobe uma bridge nova, sem reuso entre campanhas. Sem identidade a preservar, uma tabela
   "Bridge" com uma linha por instância não compraria nada que um atributo direto em `Campanha` não
   dê — a comparação cross-produto por tipo funciona igual nos dois modelos, é exatamente o corte que
   o ticket previa entre os dois caminhos.
2. **Taxonomia: enum fechado**, não tabela editável — `TSL`, `VSL`, `ADVERTORIAL`, `QUIZ`, `REVIEW`,
   `DIRECT_LINK`, `OUTRO`. Tabela editável fica reservada para quando a sugestão automática por
   algoritmo existir de fato e precisar criar categorias em runtime — hoje é preenchimento manual
   raro, mesmo padrão dos outros enums do schema (`db push`, não migração de dado).
3. **Só `tipo` (enum) + `observacoes` (texto livre)** — sem campos estruturados adicionais (idioma,
   tempo de carregamento, captura de e-mail). Texto livre cobre particularidade pontual (ex.: mudança
   de copy específica) sem forçar categoria fechada; estruturado adicional só entra depois, aditivo,
   quando uma regra concreta precisar comparar por ele — mesmo padrão do ticket 11 (marginal, "nenhuma
   regra hoje pede").
4. **Vínculo campanha → bridge é 1-para-1.** A granularidade de performance do domínio para em
   `Campanha` (`CampanhaSnapshot` é por campanha × dia); A/B de bridge dentro da mesma campanha do
   Google Ads não teria como atribuir receita a uma ou outra — o dado pra separar não existe. Testar
   bridge A vs B na prática vira duas campanhas separadas (mesma oferta, bridges diferentes), já
   comparável hoje sem mudança de modelo.
5. **Campos novos em `Campanha`**: `linkBridge` (URL), `tipoBridge` (enum), `bridgeObservacoes`
   (texto livre). **Sem snapshot de HTML nem tags** — infraestrutura para um algoritmo que ainda não
   existe, e a bridge sai do ar depois que o teste acaba (snapshot estagnaria sem consumidor). A URL
   guardada em `Campanha` já é gancho suficiente: o algoritmo futuro pode reprocessar a partir dela
   quando existir, sem exigir migração — só passa a ler um campo que já está lá.

**Achado (não é decisão deste ticket):** `ProdutoAfiliado.linkLanding` fica ambíguo/desatualizado com
essa mudança — é uma URL única no produto, mas a bridge real agora muda por campanha/teste. Fica
registrado para decisão futura se deve ser deprecado (mesmo padrão de `criterioPausa`/
`statusOperacional`, já deprecados em outros pontos do mapa).

Desbloqueia parcialmente a fog "Prior do Radar a partir do histórico próprio" (taxonomia de bridge
agora existe) — a forma completa do prior segue em aberto, ver nota atualizada em "Not yet specified".
