---
name: estilizacao-video-tactical-rebel
description: >-
  Cria e edita roteiros de estilização de vídeo (Reels/Stories) no Estúdio de
  Vídeo do Creator Engine, mantendo a identidade visual Tactical Rebel da persona
  veesemfiltro (render via Remotion). Use ao criar/editar a timeline de um vídeo,
  legendas animadas, CTA ou marca d'água, e quando o usuário mencionar Estúdio de
  Vídeo, roteiro de estilização, Reels, Stories, Remotion, os pilares
  gancho/bastidores/provocação, ou @veesemfiltro.
---

# Estilização de Vídeo — Tactical Rebel

Esteira que aplica identidade visual a vídeos brutos via **Remotion**. O dado
central é um **roteiro de estilização**: um JSON (`timeline`) validado por Zod que
descreve faixas de texto/asset no tempo. UI, API, preview e worker de render
consomem o **mesmo** contrato. Toda a identidade (fonte, cor, animação, scrim,
grão, vinheta) vem dos tokens de marca — **nunca invente cores/fontes/estilos**.

## Fonte da verdade (leia antes de mudar comportamento)

- `brand/tokens.ts` — cores, tipografia, animações, presets, safe zones, auto-fit.
- `src/lib/estudio/timeline.ts` — contrato Zod (enums + validação) e adaptador de props.
- `remotion/src/brand/components.tsx` — componentes (impacto, convicção, CTA, marca d'água, grão…).
- `remotion/src/templates/Palco.tsx` — motor único; `GanchoIncongruencia`/`BastidoresDisciplina`/`ProvocacaoConversao` são wrappers de preset.
- `remotion/src/Root.tsx` — composições Remotion registradas.

## Contrato do roteiro (`timeline` JSON)

```json
{
  "handle": "veesemfiltro",
  "tracks": [
    { "tipo": "texto", "inicio": 0, "fim": 2.6, "conteudo": "REBELDE POR *NATUREZA*",
      "estilo": "impacto", "animacao": "cascata", "posicao": "safe-center", "placa": false },
    { "tipo": "asset", "inicio": 0, "fim": 3, "assetTag": "moldura-tatica",
      "animacao": "fade", "posicao": "safe-center" }
  ]
}
```

Regras (validadas no servidor — respeite-as ao gerar/editar):
- `fim` > `inicio`; tempos em **segundos**.
- Se houver fonte de vídeo, todo intervalo deve caber na duração dela.
- `assetTag` precisa existir na biblioteca de assets.
- `conteudo` não pode ser vazio; `handle` é opcional (sem `@`, ≤ 40 chars).
- Adicionar novos valores de enum exige editar `timeline.ts` **e** os tokens/componentes — não use valores fora das tabelas abaixo.

## Vocabulário (use exatamente estes termos)

**Estilo de texto** (`estilo`):
| valor | uso | render |
|---|---|---|
| `impacto` | "O Soco" — frase curta de choque | Oswald caixa alta, branco gelo |
| `conviccao` | "A Mente" — contraponto reflexivo | Spectral itálico dourado + filete |
| `cta` | conversão (Pilar 3) | Oswald tracked + seta → + @handle |

**Animação** (`animacao`): `write-on` · `corte-seco` · `fade` · `cascata` (palavra-a-palavra) · `kick` (soco no beat) · `mask-wipe` (revelação diagonal) · `blur-in` (foca desfocando).

**Posição** (`posicao`): `safe-top` · `safe-center` · `safe-bottom` (respeitam a safe zone do formato).

**Realce**: envolva a palavra de ordem em asteriscos → `*palavra*` (vira ouro). Uma por frase, no máximo.

**Placa** (`placa: true`): fundo sólido atrás do texto — só para footage claro/ruidoso.

**Preset / pilar** = a **composição Remotion** escolhida pelo `TemplateVideo` do roteiro:
| composição | pilar | clima |
|---|---|---|
| `gancho-incongruencia` | 1 · Atração | cena limpa, texto no miolo/base |
| `bastidores-disciplina` | 2 · Conexão | terço inferior, grão sutil, marca d'água |
| `provocacao-conversao` | 3 · Conversão | low-key, vinheta forte, grão, encerra em CTA |

**Formato**: `VERTICAL_9_16` (1080×1920, padrão Reels/Stories) · `QUADRADO_1_1` (1080×1080) · `RETRATO_4_5` (1080×1350). Sempre 30 fps.

## Fluxo para editar um vídeo

1. Localize/edite o `RoteiroEstilizacao` (UI: **Estúdio de Vídeo → Roteiros**, ou API).
2. Ajuste a `timeline` usando **apenas** o vocabulário acima. Mantenha ganchos ≤ 3s no início.
3. Escolha `templateVideoId` (pilar) e `formato` coerentes com o objetivo.
4. Valide contra o contrato (mesma regra de `validarTimeline`) antes de salvar.
5. Salve e **enfileire o render**; o worker gera o MP4 no volume compartilhado.

Endpoints: `POST /api/estudio/roteiros` · `PUT /api/estudio/roteiros/[id]` · `POST /api/estudio/jobs` `{ "roteiroId": "…" }` (enfileira) · `GET /api/estudio/jobs` (status).

## Regras de identidade (não quebre)

- Ouro (`#C5A059`) **só** em palavras de ordem/CTA (via `*realce*` ou estilo `cta`). Nunca ouro no corpo inteiro.
- Não defina fontSize fixo: o auto-fit dos componentes evita transbordo — mantenha frases curtas.
- Tom de voz: gírias BR naturais ("só vem", "tá safo"), assertivo e provocador, **sem discurso de ódio explícito** (proteção da conta). O texto instiga; o vídeo complementa.
- Disclosure de IA da persona permanece ativo; não remova.
- Não adicione elementos decorativos fora dos tokens (sem gradientes de texto, sem molduras genéricas — a moldura são os ticks de registro do preset).

## Recursos adicionais

- Valores exatos de tokens, presets, safe zones, API e tom de voz: [reference.md](reference.md)
- Roteiros JSON prontos (um por pilar + vitrine): [examples.md](examples.md)
