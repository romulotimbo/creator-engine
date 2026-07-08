# Exemplos — Roteiros de estilização

Cole no campo `timeline` do `RoteiroEstilizacao`. Combine com o `templateVideoId`
do pilar correspondente e `formato: "VERTICAL_9_16"`.

## Pilar 1 — Gancho da Incongruência (`gancho-incongruencia`)

```json
{
  "handle": "veesemfiltro",
  "tracks": [
    { "tipo": "texto", "inicio": 0, "fim": 2.6, "conteudo": "REBELDE POR *NATUREZA*", "estilo": "impacto", "animacao": "cascata", "posicao": "safe-center" },
    { "tipo": "texto", "inicio": 2.6, "fim": 5.2, "conteudo": "conservadora por convicção", "estilo": "conviccao", "animacao": "fade", "posicao": "safe-center" },
    { "tipo": "texto", "inicio": 5.2, "fim": 7.6, "conteudo": "SÓ VEM.", "estilo": "impacto", "animacao": "kick", "posicao": "safe-bottom" }
  ]
}
```

## Pilar 2 — Bastidores & Disciplina (`bastidores-disciplina`)

```json
{
  "handle": "veesemfiltro",
  "tracks": [
    { "tipo": "texto", "inicio": 0, "fim": 3, "conteudo": "TREINO PESADO", "estilo": "impacto", "animacao": "write-on", "posicao": "safe-bottom" },
    { "tipo": "texto", "inicio": 3, "fim": 6.5, "conteudo": "olhar mais pesado ainda…", "estilo": "conviccao", "animacao": "blur-in", "posicao": "safe-bottom" }
  ]
}
```

## Pilar 3 — Provocação → Conversão (`provocacao-conversao`)

```json
{
  "handle": "veesemfiltro",
  "tracks": [
    { "tipo": "texto", "inicio": 0, "fim": 2.8, "conteudo": "OLHAR *AFIADO*", "estilo": "impacto", "animacao": "mask-wipe", "posicao": "safe-center" },
    { "tipo": "texto", "inicio": 2.8, "fim": 5.4, "conteudo": "te incomoda ou te atrai?", "estilo": "conviccao", "animacao": "fade", "posicao": "safe-center" },
    { "tipo": "texto", "inicio": 5.4, "fim": 8, "conteudo": "LINK NA BIO", "estilo": "cta", "animacao": "corte-seco", "posicao": "safe-bottom" }
  ]
}
```

## Vitrine — todos os elementos (composição `demo-todos-elementos`)

Referência de QA: um recurso por faixa de tempo.

```json
{
  "handle": "veesemfiltro",
  "tracks": [
    { "tipo": "texto", "inicio": 0,    "fim": 2.5,  "conteudo": "IDENTIDADE *TÁTICA*",        "estilo": "impacto",   "animacao": "write-on",   "posicao": "safe-top" },
    { "tipo": "texto", "inicio": 2.5,  "fim": 5,    "conteudo": "REBELDE POR *NATUREZA*",      "estilo": "impacto",   "animacao": "cascata",    "posicao": "safe-center" },
    { "tipo": "texto", "inicio": 5,    "fim": 7,    "conteudo": "OLHAR *AFIADO*",              "estilo": "impacto",   "animacao": "mask-wipe",  "posicao": "safe-center" },
    { "tipo": "texto", "inicio": 7,    "fim": 9.2,  "conteudo": "conservadora por *convicção*","estilo": "conviccao", "animacao": "blur-in",    "posicao": "safe-center" },
    { "tipo": "texto", "inicio": 9.2,  "fim": 11.4, "conteudo": "quem aguenta o ritmo?",       "estilo": "conviccao", "animacao": "fade",       "posicao": "safe-bottom", "placa": true },
    { "tipo": "texto", "inicio": 11.4, "fim": 13.4, "conteudo": "SÓ VEM.",                     "estilo": "impacto",   "animacao": "kick",       "posicao": "safe-center" },
    { "tipo": "texto", "inicio": 13.4, "fim": 16,   "conteudo": "LINK NA BIO",                 "estilo": "cta",       "animacao": "corte-seco", "posicao": "safe-bottom" }
  ]
}
```

## Como interpretar pedidos de edição

O usuário referencia por **faixa de tempo** ou pelo **texto**. Traduza para uma
alteração cirúrgica na track correspondente, preservando o resto.

- "Na faixa 2,5–5,0s, troca para `mask-wipe` e realça `*REBELDE*`." → edite só essa track.
- "Adiciona 6,0–8,0s, `conviccao`, `blur-in`, `safe-bottom`, `disciplina é *liberdade*`, com placa." → nova track.
- "Transforma no pilar bastidores, formato 1:1, sem CTA." → troca `templateVideoId`/`formato` e remove a track `cta`.
- "No CTA, muda para `ME SEGUE` e handle `veerebelde`." → edite a track `cta` e o `handle`.

Sempre valide contra o contrato (`fim > inicio`, enums válidos, intervalos ⊆ fonte) antes de salvar e enfileirar o render.
