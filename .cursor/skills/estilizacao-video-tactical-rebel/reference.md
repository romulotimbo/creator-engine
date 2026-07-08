# Referência — Tactical Rebel

Valores exatos. Fonte canônica: `brand/tokens.ts` (se divergir, o código vence).

## Paleta

| Token | Hex | Uso |
|---|---|---|
| `tinta` | `#0A0A0B` | canvas near-black (sem vídeo) |
| `brancoGelo` | `#F2F2F2` | texto de impacto |
| `brancoPuro` | `#FFFFFF` | realce dentro da convicção |
| `douradoEnvelhecido` | `#C5A059` | palavra de ordem / CTA / filete |
| `douradoLuz` | `#E7CE93` | brilho do material dourado |
| `douradoSombra` | `#8A6D34` | base do gradiente dourado |

Ouro é material (gradiente `OURO_MATERIAL`) em filetes/marcas; em texto é chapado `#C5A059`. Nunca aplique gradiente em texto.

## Tipografia (auto-fit)

- **impacto**: Oswald, caixa alta, peso 700, `letterSpacing 0.045em`, base ≈ 12,5% da largura, mín. 52px.
- **conviccao**: Spectral **itálico** (itálico real), peso 600, dourado, base ≈ 7,2% da largura, mín. 34px, com filete dourado assinado.
- **cta**: Oswald, caixa alta, peso 600, `letterSpacing 0.24em`, base ≈ 5% da largura, mín. 26px.
- Alternativa de impacto mais "gritada": Bebas Neue. Fontes via `@remotion/google-fonts` (OFL).

Nunca fixe fontSize no roteiro: `autoFontSize()` reduz até caber na safe zone (proibição de transbordo).

## Animações (frames @30fps)

| id | duração | curva | efeito |
|---|---|---|---|
| `write-on` | 14 | out-expo | clip esquerda→direita + tracking assenta |
| `corte-seco` | 0 | linear | carimbo (punch curto de escala) |
| `fade` | 14 | out-quart | opacidade + leve subida |
| `cascata` | 8/palavra (stagger 3) | out-expo | palavra-a-palavra |
| `kick` | 8 | out-expo | punch de escala forte (sem bounce) |
| `mask-wipe` | 16 | out-quint | revelação diagonal (clip-path) |
| `blur-in` | 18 | out-quart | entra desfocada e foca |

Saída padrão de toda track: fade + subida nos últimos 10 frames. Sem bounce/elastic.

## Presets (composições)

| preset / composição | scrim | grão | vinheta | marca d'água padrão |
|---|---|---|---|---|
| `gancho` / `gancho-incongruencia` | cena (topo+base) | — | média | não |
| `bastidores` / `bastidores-disciplina` | inferior (legenda) | 0.05 | média | sim |
| `provocacao` / `provocacao-conversao` | low-key | 0.08 | forte | sim |

- **Grão**: filme cinematográfico animado (monocromático, blend `overlay`, opacidade baixa) — não é "textura de papel".
- **Marca d'água**: `@handle` na margem inferior; some automaticamente **durante** faixas `cta` (evita handle duplicado).
- **Ticks de registro**: 4 cantos dourados (substituem moldura genérica), sempre presentes.

## Formatos e safe zones (px)

| formato | dim | safe top | safe bottom | margem lateral |
|---|---|---|---|---|
| `VERTICAL_9_16` | 1080×1920 | 250 | 1670 | 80 |
| `QUADRADO_1_1` | 1080×1080 | 80 | 1000 | 80 |
| `RETRATO_4_5` | 1080×1350 | 80 | 1270 | 80 |

Texto/CTA ficam dentro da safe zone; a marca d'água fica na margem inferior (fora dela).

## API (Estúdio)

| método | rota | uso |
|---|---|---|
| GET/POST | `/api/estudio/roteiros` | listar / criar roteiro |
| PUT/DELETE | `/api/estudio/roteiros/[id]` | editar / excluir |
| GET/POST | `/api/estudio/jobs` | status / enfileirar render (`{ roteiroId }`) |
| GET/POST | `/api/estudio/fontes` · POST `/scan` | fontes de vídeo (upload / escanear inbox) |
| GET/POST | `/api/estudio/assets` · PUT/DELETE `/[id]` | assets com tag |
| GET/POST | `/api/estudio/templates` | registrar composições como TemplateVideo |

Payload de roteiro: `{ nome, personaId, formato, fonteVideoId, templateVideoId, timeline }`.
Render: worker (`creator-engine-render`) faz polling da fila `JobRender` no Postgres, renderiza via Remotion e aplica strip de metadados; grava MP4 em `{ESTUDIO_DATA_DIR}/output`.

## Tom de voz

- **Sim**: gírias jovens BR naturais; postura assertiva e dominante, acolhedora para os "aliados"; instigar sem vulgaridade explícita.
- **Não**: linguagem formal/culta de gabinete; discurso de ódio explícito (risco de banimento). Foque em estética e ironia fina.

## Pilares de conteúdo (linha editorial)

1. **Gancho da Incongruência** (Atração): choque nos 3s pelo contraste visual×legenda. Ex.: `"Rebelde por natureza, conservadora por convicção. Só vem."`
2. **Estilo de Vida e Disciplina** (Conexão): rotina/treino, humaniza. Ex.: `"Treino pesado, olhar mais pesado ainda..."`
3. **Provocação Direta** (Conversão): mistério + CTA para o link da bio. Ex.: `"Olhar afiado, postura firme. O resto é consequência."`

## Erros comuns a evitar

- Usar animação/estilo/posição fora das tabelas → falha de validação.
- Ouro no corpo inteiro do texto (use `*realce*` pontual).
- Frases longas em `impacto` (o auto-fit encolhe demais; prefira ≤ 4 palavras).
- CTA + marca d'água sobrepostos: já resolvido (a marca some durante o CTA) — não force marca d'água manual no fim.
- Remover disclosure de IA ou adotar linguagem de ódio explícita.
