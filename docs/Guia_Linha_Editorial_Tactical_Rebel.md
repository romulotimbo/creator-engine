# 📖 Guia de Linha Editorial: Tactical Rebel
**Identidade Visual e Posicionamento para Personagem IA**

---

## 1. Visão Geral da Personagem
A personagem baseia-se numa forte **incongruência ideológica e estética**, desenhada especificamente para quebrar o padrão do feed, gerar debate (engajamento) e criar uma comunidade altamente fiel e pagante.

* **Estética Visual:** *Edgy Pixie Tattoo Aesthetic* (cabelo curto/repicado, visual alternativo, muitas tatuagens, olhar penetrante).
* **Posicionamento Central:** Uma mulher de aparência assumidamente rebelde e contracultura que defende abertamente valores de extrema-direita/conservadores.
* **Modelo de Negócio:** Atração de tráfego orgânico via Instagram (Reels/Stories) com conversão para plataforma de conteúdo adulto.

---

## 2. Pilares de Conteúdo

### Pilar 1: O Gancho da Incongruência (Atração)
* **Objetivo:** Chocar o algoritmo e o utilizador nos primeiros 3 segundos através do contraste entre o visual e a legenda.
* **Estilo de Vídeo:** Vídeos curtos sem fala, focado em poses fortes, manutenção de contacto visual com a câmara ou transições de outfit.
* **Exemplo de Texto:** `"Rebelde por natureza, conservadora por convicção. Se escolheste o lado certo, só vem. 🇧🇷"`

### Pilar 2: Estilo de Vida e Disciplina (Conexão e Acolhimento)
* **Objetivo:** Humanizar a IA, mostrando rotina, treino e gerando o sentimento de "comunidade/tribo".
* **Estilo de Vídeo:** Bastidores falsos (academia, café, escolha de roupas), luz natural combinada com sombras.
* **Exemplo de Texto:** `"Treino pesado, olhar mais pesado ainda... Quem aguenta acompanhar o ritmo? 😏"`

### Pilar 3: Provocação Direta (Conversão)
* **Objetivo:** Ativar o desejo e direcionar o público para o link da bio.
* **Estilo de Vídeo:** Close-ups sensuais, iluminação *low-key* (escura), mistério.
* **Exemplo de Texto:** `"Olhar afiado, postura firme. O resto é consequência. Te incomoda ou te atrai? 🔥"`

---

## 3. Identidade Visual & Diretrizes do Template (DaVinci Resolve)

Para manter a consistência sem gastar tempo, o template no DaVinci Resolve deve respeitar rigorosamente a paleta e a hierarquia tipográfica abaixo:

### Paleta de Cores Tática
* **Preto Profundo (`#000000`):** Base para elegância, mistério e a cultura alternativa/tattoo.
* **Branco Gelo (`#F2F2F2`):** Utilizado para o texto principal de impacto, garante legibilidade máxima.
* **Dourado Envelhecido (`#C5A059`):** O toque tradicionalista. Usado exclusivamente para destacar palavras de ordem ou o encerramento provocador.
    * *RGB:* R: 197, G: 160, B: 89

### Regras de Tipografia e Hierarquia

1.  **Texto de Impacto (O "Soco"):**
    * **Fonte:** `Bebas Neue` ou `Anton` (Caixa Alta).
    * **Cor:** Branco Gelo.
    * **Animação:** *Write-on* rápido (0 a 15 frames) ou corte seco sincronizado com o áudio.
2.  **Texto de Convicção/Contraste (A "Mente"):**
    * **Fonte:** `Cinzel` ou `Cormorant Garamond` (Itálico).
    * **Cor:** Dourado Envelhecido (`#C5A059`).
    * **Tamanho:** 40% menor que o texto de impacto.

---

## 4. Tom de Voz (Tone of Voice)

O tom de voz deve ser cirúrgico para não soar artificial ou corporativo:

* **Sim (O que fazer):**
    * Usar gírias jovens brasileiras de forma natural (`"só vem"`, `"tá safo"`, `"esquece"`).
    * Manter uma postura assertiva e ligeiramente dominante, mas acolhedora para os "aliados".
    * Deixar claro as intenções sem recorrer à vulgaridade explícita no texto (o texto instiga, o vídeo complementa).
* **Não (O que evitar):**
    * NUNCA usar termos formais ou linguagem culta de gabinete político.
    * Evitar discursos de ódio explícitos para proteger a conta contra banimentos; foque na estética e na ironia fina.

---

## 5. Fluxo de Trabalho Automatizado (Batching)

Para escalar a criação de Reels/Stories sem fala:
1.  **Produção de Vídeo:** Gere ou selecione 15 a 20 clipes de vídeo de 5-7 segundos com variações de ângulo (Close-up, Plano Médio, Detalhe das Tatuagens).
2.  **Aplicação do Template:** Importe os vídeos para o DaVinci Resolve, arraste o Macro `Template_Tactical_Rebel` salvo para a faixa superior.
3.  **Ajuste do Texto:** Copie as frases mapeadas neste guia, alterando apenas o conteúdo do nó *Text+*.
4.  **Exportação em Lote:** Use a aba *Deliver* para renderizar todos os Reels de uma vez só.
