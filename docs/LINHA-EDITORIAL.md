# Linha Editorial de Vídeo — Energi Power by Vee

**Objetivo:** dar a todo vídeo de rede social uma **assinatura de identidade** consistente (fonte, cor, formato, animação) e **agilizar a produção** via templates parametrizados.

**Relação com os outros docs:**
- Identidade visual base: [`MASTER.md`](MASTER.md) (fonte única de tokens)
- Persona / voz: [`../../docs/copy-pagina.md`](../../docs/copy-pagina.md)
- Campanhas em produção: [`../../public/marketing/HANDOFF-stories-qna.md`](../../public/marketing/HANDOFF-stories-qna.md)
- Inventário de assets: [`../../bloco-b-assets.md`](../../bloco-b-assets.md)
- Créditos de geração IA: [`../../MAGNIFIC_MCP_REFERENCIA_PORTAL.md`](../../MAGNIFIC_MCP_REFERENCIA_PORTAL.md)

> Este documento é a **espec** da linha editorial. A implementação (workspace Remotion) é uma fase seguinte — ver §10 Roadmap.

---

## 1. Arquitetura de produção

A linha editorial separa **geração de footage** de **montagem/branding** de **pós**. Cada ferramenta faz só o que faz melhor:

```
┌─────────────────┐    ┌──────────────────────────┐    ┌────────────────────┐
│ Magnific (IA)   │ →  │ Remotion (branding layer)│ →  │ FFmpeg (pós)       │
│ footage da Vee  │    │ intro · captions · frame │    │ compressão +       │
│ Seedream/Seedance│   │ CTA · transições · formatos│  │ strip de metadados │
│ character 1840865│    │ (React + tokens da LP)   │    │ (já existe/sólido) │
└─────────────────┘    └──────────────────────────┘    └────────────────────┘
```

**Decisão de ferramenta:** **Remotion** (vídeo programático em React).

| Fator | Situação |
|-------|----------|
| Stack | ✅ Já é React 19 + Tailwind + `motion/react` → reuso direto de tokens e componentes |
| Licença | ✅ **Grátis** — time ≤ 3 pessoas (Company License só exigida acima disso) |
| Preview | ✅ Remotion Studio (resolve o "renderizar às cegas" do FFmpeg atual) |
| Parametrização | ✅ Props → N variações do mesmo template (agilidade) |
| Multi-formato | ✅ 9:16 / 1:1 / 4:5 / 16:9 da mesma composição |

**O que NÃO muda:**
- Magnific continua gerando a footage/imagens da Vee (character `1840865`, Seedream 4.5). Regras de crédito em `MAGNIFIC_MCP_REFERENCIA_PORTAL.md`.
- FFmpeg continua no **pós** (compressão H.264 + `-map_metadata -1` + ExifTool `-all=`). O padrão de strip de metadados de `scripts/build-teaser-stories.mjs` é reaproveitado após o render do Remotion.

---

## 2. Brand Kit (fonte única de verdade)

Os tokens abaixo são **os mesmos** de `tailwind.config.js` / `MASTER.md`. A meta é extrair para um módulo compartilhado (`brand/tokens.ts`) que **LP e Remotion importam**, para nunca divergirem.

### 2.1 Cores

| Papel | Hex | Uso em vídeo |
|-------|-----|--------------|
| Fundo | `#0A0A0A` cyber-black | Base de cards, letterbox |
| Profundidade | `#050505` cyber-darker | Fundo de intro/outro, vault |
| Superfície | `#16161A` cyber-graphite | Caption cards, HUD, molduras |
| Texto primário | `#D1D5DB` cyber-titanium | Eyebrow / mono / texto secundário |
| Texto muted | `#52525B` cyber-muted | Metadados HUD, timestamps |
| Acento / CTA | `#C41E3A` blood-red | Laser, rim, moldura, punch words |
| Acento escuro | `#8B0000` blood-dark | Sombra do acento, hover |
| **Branco de caption** | `#FFFFFF` | **Exceção**: texto forte em caption card (padrão IG acordado no handoff) |

**Proibido:** dourado/branco puro na arte — exceção única = **rótulo real do pote** (PNG do produto). Regra herdada do `MASTER.md`.

### 2.2 Tipografia

| Papel | Fonte | Tratamento |
|-------|-------|------------|
| Display / punch / CTA | **Barlow Condensed** | UPPERCASE, tracking wide |
| Corpo / legenda longa | **Barlow** | sentence case, peso 400–600 |
| Mono / HUD / timestamps | **JetBrains Mono** | UPPERCASE, `snake_case`, opacidade baixa |

> ⚠️ **Pendência de assets:** o repo só versiona 2 pesos em `scripts/fonts/` (`Barlow-Regular`, `BarlowCondensed-Bold`). A linha editorial de vídeo precisa no mínimo de: Barlow 400/600, Barlow Condensed 600/700/800, JetBrains Mono 400/500. Baixar via `@remotion/fonts`/`@remotion/google-fonts` ou adicionar `.ttf` a `brand/fonts/`.

### 2.3 Régua de layout (safe zones)

| Formato | Resolução | Safe zone (altura útil) | Fonte da regra |
|---------|-----------|--------------------------|----------------|
| Stories/Reels 9:16 | 1080×1920 | y ≈ **250–1670** | `HANDOFF-stories-qna.md` §4 |
| Reels tráfego 9:16 | 1080×1920 | y ≈ **280–1580** | `bloco-b-assets.md` B13 |
| Feed 1:1 | 1080×1080 | margem 80px | novo |
| Feed 4:5 | 1080×1350 | margem 80px | novo |
| YouTube/16:9 | 1920×1080 | margem 96px | novo |

### 2.4 Timing / motion tokens (reuso da LP)

Herdar de `tailwind.config.js` para manter a "cadência" da marca:

- Easing padrão: `out-expo` = `cubic-bezier(0.16, 1, 0.3, 1)` · alt `out-quart` = `cubic-bezier(0.25, 1, 0.5, 1)`
- Glitch: pulsos de opacidade em ~92–97% do ciclo (ver keyframe `glitch`)
- Scan HUD: varredura vertical top 8% → 92%, ~5s (`hud-scan`)
- Border beam: `offset-path` perimetral (não spin cônico) (`border-beam`)
- Blink mono: `hud-blink` 1.2s step-end (cursores, `● live`)

---

## 3. Formatos (composições Remotion)

Todas as composições nascem de **um mesmo conteúdo** parametrizado, variando só o canvas + safe zone.

| ID | Formato | Resolução | Uso | FPS |
|----|---------|-----------|-----|-----|
| `story-9x16` | 9:16 | 1080×1920 | Stories / Reels (principal) | 30 |
| `feed-1x1` | 1:1 | 1080×1080 | Feed quadrado | 30 |
| `feed-4x5` | 4:5 | 1080×1350 | Feed retrato (mais alcance) | 30 |
| `wide-16x9` | 16:9 | 1920×1080 | YouTube / cabeçalho | 30 |

Padrão de duração: **stories 6–15s**, reels 15–30s. Loop seamless quando aplicável (herdado do hero).

---

## 4. Vocabulário de animação assinada (o "DNA")

Estes beats são o que fazem **qualquer** vídeo "parecer da Vee". Todo template deve usar Intro + Frame + Outro no mínimo.

### 4.1 Intro sting (~0.8–1.2s)
- Fundo `#050505` → boot de HUD (linhas mono aparecem em `hud-blink`)
- Scan line vertical vermelha atravessa (`hud-scan`, versão rápida)
- Laser perimetral `#C41E3A` desenha a moldura (border-beam)
- Fecha com lockup **"BY VEE."** (Barlow Condensed) + eyebrow mono `batch EP-vee`
- Refª existente: teaser atual `EM BREVE... / BY VEE.` (`build-teaser-stories.mjs`)

### 4.2 Frame de marca persistente (o vídeo inteiro)
- Borda vermelha fina nas 4 arestas (top/bottom mais fortes) — equivalente aos `drawbox` do teaser
- Tags de canto em JetBrains Mono muted: `live_feed` · `batch EP-vee` · timecode
- Vignette suave (`vignette=angle=PI/4`) + grade de cor: `saturation ≈ 0.58`, leve `brightness -0.1`, empurrão vermelho no shadow (perfil do teaser)

### 4.3 Caption card (fala/hook/resposta)
- Caixa `#16161A`/preto a **85–92%** de opacidade
- Texto **Barlow Condensed branco `#FFFFFF`**, forte (padrão IG acordado)
- Eyebrow opcional em `#D1D5DB` mono
- Entrada: slide-up + fade com `out-expo`; **punch word** em `#C41E3A`
- Regra do handoff: em **stories** o texto costuma ir nativo no IG; em **reels/feed** o caption card do Remotion é queimado no vídeo.

### 4.4 Transições
- **Glitch cut** entre cenas (keyframe `glitch`)
- **Flash de rim vermelho** ao trocar de bloco (herdado do `HudFrame`)
- **Scanline wipe** para cortes "técnicos"

### 4.5 Outro / CTA (~1.5–2.5s)
- Pote (`1 POTE.png` / `3 POTES.png`) com `ProductGlow` + border beam
- CTA em Barlow Condensed: **`LINK NA BIO ↑`** ou oferta (`R$ 237 · 3 POTES`)
- Selo de fechamento: `owner: VEE · protocol_ep`

---

## 5. Templates de conteúdo (parametrizados)

Cada template = composição React com `props`. Trocar props → novo vídeo, sem código novo.

| Template | Props principais | Origem/uso | Beats |
|----------|------------------|------------|-------|
| `qna` (caixa de perguntas) | `pergunta`, `resposta`, `footage`, `grade` | Campanha Q&A (`HANDOFF-stories-qna.md`) | Intro → caption card pergunta → resposta → CTA |
| `teaser` (lançamento) | `linha1`, `linha2`, `footage` | Substitui `build-teaser-stories.mjs` | Intro → hero copy → outro |
| `field-report` (depoimento) | `nome`, `perfil`, `texto`, `stat` | Depoimentos (`Testimonials`) | Intro → quote cinético → selo `verified` → CTA |
| `oferta` (pricing) | `kit`, `preco`, `precoPote`, `features` | Kits (`Pricing`) | Intro → pote+preço → features → CTA checkout |
| `vault-teaser` | `footage`, `censura` | Área Restrita / stories 03 | Intro glitch → silhueta blur → "segredinho no final" |
| `manifesto` (quote cinético) | `texto`, `watermark` | Voz da Vee (`Manifesto`) | Texto palavra-a-palavra sobre footage muted |

Grades de cor reutilizam os perfis já definidos: `vault-soft`, `vault-red`, `vault` (ver `import-qna-story.mjs`).

---

## 6. Cadência editorial (estratégia de conteúdo)

Pilares alinhados à voz dominante/provocativa da Vee (funil stories → LP):

| Pilar | Intenção | Template padrão | Frequência sugerida |
|-------|----------|-----------------|---------------------|
| **Provocação** | Fisgar / gerar DM | `qna`, `manifesto` | Alta |
| **Prova social** | Reduzir objeção | `field-report` | Média |
| **Educação** | Natural / mecanismo / selo USA | `manifesto`, `oferta` | Média |
| **Bastidores / Vault** | Desejo + exclusividade | `vault-teaser` | Baixa/pontual |
| **Oferta** | Conversão | `oferta`, `teaser` | Pontual (lançamentos) |

Tagline canônica em fechamentos: *"O protocolo que separa homem de menino."*

---

## 7. Governança

- **Naming de saída:** `{template}_{formato}_{YYYYMMDD}[-vN].mp4` (ex.: `qna_story-9x16_20260708.mp4`)
- **Metadados:** todo render final passa pelo strip (FFmpeg `-map_metadata -1` + ExifTool `-all=`) — sem GPS/datas/software.
- **Tokens de token com token IA:** nunca commitar URLs Magnific com token em docs versionados (regra do handoff).
- **Do:** reusar Intro/Frame/Outro; punch word única por card; safe zone respeitada.
- **Don't:** branco puro fora de caption; cortes rápidos no footage boudoir; texto cobrindo o rosto da Vee em stories (preferência: nativo IG).

---

## 8. Estrutura de pastas proposta (fase de implementação)

```
brand/                        # fonte única compartilhada LP + Remotion
├── tokens.ts                 # cores, timing, safe zones (deriva de tailwind.config.js)
└── fonts/                    # Barlow / Barlow Condensed / JetBrains Mono (pesos completos)

remotion/
├── remotion.config.ts
├── src/
│   ├── Root.tsx              # registra composições (formatos × templates)
│   ├── brand/                # <Intro/> <FrameOverlay/> <CaptionCard/> <Outro/> <HudTag/>
│   ├── templates/            # <Qna/> <Teaser/> <FieldReport/> <Oferta/> <VaultTeaser/> <Manifesto/>
│   └── formats/              # wrappers 9x16 / 1x1 / 4x5 / 16x9
└── out/                      # renders (gitignored) → passam pelo pós FFmpeg
```

Assets de footage continuam em `public/video/` e `public/imagens/` (reuso).

---

## 9. Comparativo de ferramentas (registro da decisão)

| Ferramenta | Prós | Contras | Veredito |
|------------|------|---------|----------|
| **Remotion** | React/Tailwind reuso, preview, parametrização, multi-formato | Render mais pesado; licença acima de 3 pessoas | ✅ **Escolhida** (time ≤3 = grátis) |
| FFmpeg puro (atual) | Sem licença, leve | Sem preview, sem reuso, texto na mão, 1 script/formato | Mantido só no **pós** |
| Revideo / Motion Canvas | Open-source, TS | Não é React → sem sinergia com a LP | Plano B se licença virar problema |
| After Effects / Lottie | Qualidade cinema | Fora do código, manual, caro | Não |
| CapCut / Canva | Rápido | Zero identidade programável | Só emergência |

---

## 10. Roadmap de implementação

1. **Brand kit compartilhado** — extrair `brand/tokens.ts` de `tailwind.config.js`; baixar pesos de fonte faltantes.
2. **Scaffold Remotion** — `npx create-video`, wiring de Tailwind + fontes + tokens.
3. **Componentes de marca** — `Intro`, `FrameOverlay`, `CaptionCard`, `Outro`, `HudTag`.
4. **PoC** — recriar o `teaser-stories` parametrizado + template `qna`; comparar com o FFmpeg atual.
5. **Formatos** — wrappers 9:16 / 1:1 / 4:5 / 16:9.
6. **Pipeline de pós** — script que roda o strip de metadados após o render.
7. **Rollout** — migrar campanhas restantes (`field-report`, `oferta`, `vault-teaser`, `manifesto`).

---

## 11. Pendências / decisões abertas

| Item | Status |
|------|--------|
| Pesos de fonte completos (Barlow/Condensed/Mono) | ❌ Faltando no repo |
| Identidade de áudio (SFX assinatura / trilha) | ❔ A definir — hoje vídeos são mudos |
| Legendas automáticas (`@remotion/captions`) se houver fala | ❔ A definir |
| Extrair tokens LP → `brand/tokens.ts` (evitar divergência) | ⏳ Fase 1 |
