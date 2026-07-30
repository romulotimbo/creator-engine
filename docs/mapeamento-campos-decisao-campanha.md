# Mapeamento de Campos — Módulo de Decisão de Campanha (Afiliado)

Documento de referência para desenhar o módulo de "decisão de campanha" dentro da ferramenta de personas/creator-engine, conectando Persona → Rede Social → Oferta de Afiliado → Decisão. Baseado na skill `mentor-google-ads-afiliados`, no plano da landing page Ignitra e nas ofertas reais já em análise (Purotyn GLP-1, Skincell Pro, LipoBliss, Gluco6).

Status: rascunho para validação — pontos em aberto marcados `[TBD]`.

---

## 1. Por que organizar por categorias

Uma oferta boa em EPC pode ser péssima em compliance; uma oferta com comissão alta pode não ter tração real. Nenhum campo isolado decide sozinho — por isso o mapeamento abaixo separa os campos em 8 blocos, e a seção 4 propõe um score que os combina. A ideia é que o módulo permita filtrar/ordenar por qualquer bloco e enxergar rapidamente onde falta informação (ver campo `completude_dados` na seção 2.4 — isso já aconteceu na prática: Purotyn e Skincell usam conversion point "Valid CC Submit" e a Mediascalers não expõe EPC/refund pra esse modelo, então a decisão foi tomada sabendo que uma parte do quadro estava cega).

---

## 2. Blocos de campos

### 2.1 Identificação & Governança

| Campo | Tipo | Exemplo | Por que importa |
|---|---|---|---|
| `oferta_id` | string | `4430` | ID da oferta na rede — chave para reconciliar dados depois |
| `nome_oferta` | string | `Purotyn GLP-1 Support` | — |
| `rede_afiliado` | enum | `Mediascalers`, `ClickBank`, `BuyGoods`, `MaxWeb`, `Hotmart`, `Kiwify`, `Braip`, `GuruMedia`, `SmartADV`, `DrCash` | Cada rede tem regras, prazos de pagamento e nível de confiabilidade diferentes |
| `vendor_dono` | string | — | Quem aprova, quem muda as regras |
| `status_aprovacao` | enum | `Pendente`, `Aprovado`, `Rejeitado`, `Revogado` | Trava dura: sem isso não existe campanha |
| `data_solicitacao` / `data_aprovacao` | date | — | Mede tempo de resposta da rede/vendor — útil pra saber se vale esperar ou seguir outra oferta |
| `data_criacao_oferta` | date | Skincell: 03/2025; Purotyn: 06/2026 | Idade da oferta ajuda a ler a tendência de tráfego com contexto (oferta nova crescendo é diferente de oferta madura crescendo) |
| `link_dashboard_rede` | url | — | Acesso rápido pra conferir métricas atualizadas |
| `persona_vinculada` | referência | — | Link para a entidade Persona já existente na ferramenta |
| `canal_social_vinculado` | referência (opcional) | — | Se a oferta for promovida também via conteúdo orgânico da persona, não só Google Ads |

### 2.2 Classificação de Mercado

| Campo | Tipo | Exemplo | Por que importa |
|---|---|---|---|
| `vertical` | enum | `Health – General Health`, `Health – Beauty`, `Weight Loss`, `Finance` | Define benchmark de CPA/CPC e nível de escrutínio do Google |
| `sub_nicho_angulo` | string | "emagrecimento após os 40" | Ângulo de copy — conecta com o funil (ver Ignitra: termo genérico → página → oferta) |
| `mercado` | enum | `Brasil`, `Internacional` | Comissão, moeda, tipo de produto e concorrência mudam completamente |
| `geos_permitidos` | lista | Purotyn: DE, FR, AT, CH, IT, SE, DK, NL, IE, BE, ES, FI, LU, PT (14); Skincell: AU (1) | Define teto de escala — mais geos = mais headroom, mas também mais dispersão de teste |
| `geo_prioritario` | string | — | Onde começar o teste dentro da lista de geos permitidos |
| `idioma_pagina_oficial` | string | — | Se a página oficial não é no idioma do geo, isso é sinal de alerta de conversão |
| `tipo_produto` | enum | `Nutracêutico/trial`, `Econ/e-commerce`, `Infoproduto`, `Serviço` | Nutracêutico e Econ têm estratégias de campanha e risco de conta bem diferentes (ver `14-estrategia-econ`) |

### 2.3 Economics da Oferta

| Campo | Tipo | Exemplo | Por que importa |
|---|---|---|---|
| `tipo_comissao` | enum | `CPA fixo`, `RevShare/heavy share`, `Híbrido` | Muda como se calcula o breakeven |
| `conversion_point` | enum | `Sale`, `Valid CC Submit (trial/rebill)`, `Lead`, `Call` | Crítico: em CC Submit, a lucratividade real depende da taxa trial→rebill, que raramente aparece no CSV da rede — precisa ser rastreada à parte |
| `comissao_valor` | number (moeda) | Purotyn ~$83; Skincell ~$152 | Comparável direto entre ofertas do mesmo tipo de conversion point |
| `ltv_estimado_rebill` | number (opcional) | — | Se for trial, o valor de front-end sozinho subestima o retorno real |
| `epc_rede` | number | LipoBliss $3,54; Gluco6 $3,00 | Earnings per click histórico — melhor proxy de "essa oferta converte bem pra outros afiliados" |
| `gravity_popularidade` | number (se disponível) | — (ClickBank usa "gravity") | Sinal de quantos afiliados ativos = mais saturação, mas também mais prova social de que converte |
| `refund_chargeback_pct` | percent | LipoBliss 0%; Gluco6 8,85% | Refund alto corrói o EPC aparente e pode indicar produto/oferta problemática |
| `cookie_duration` | number (dias) | — | Relevante sobretudo em modelos com jornada de decisão mais longa |
| `frequencia_pagamento` / `holdback` | string | — | Fluxo de caixa — importa quando o capital de teste é limitado |

### 2.4 Sinal de Tração/Tendência

| Campo | Tipo | Exemplo | Por que importa |
|---|---|---|---|
| `tendencia_trafego_30d` / `_60d` / `_90d` | enum | Skincell: positivo nos 3 períodos; LipoBliss: -62% nos 30d após pico | Foi literalmente o critério de desempate usado (Skincell vs. outras ofertas Mediascalers): tendência sustentada > pico passageiro |
| `dias_desde_pico` | number | — | Sinaliza se está entrando ou saindo de um ciclo |
| `bounce_rate_oferta` | percent | Gluco6: baixo | Indício da qualidade da página oficial pra onde você manda tráfego |
| `saturacao_afiliados` | enum/estimativa | — | Muitos afiliados rodando a mesma oferta = CPC mais caro no leilão |
| `sazonalidade_conhecida` | texto/tag | — | Ex: produtos de perda de peso costumam ter pico jan-mar |
| `completude_dados` | enum | `Completo`, `Parcial`, `Ausente` | Campo novo sugerido: marca explicitamente quando EPC/refund/tendência não estão disponíveis (caso Purotyn/Skincell) — evita decidir "às cegas" sem perceber |

### 2.5 Compliance & Risco

| Campo | Tipo | Exemplo | Por que importa |
|---|---|---|---|
| `brand_bidding_permitido` | boolean | Purotyn: sim (fundo de funil) | Define se dá pra capturar quem já busca o nome do produto |
| `direct_linking_permitido` | boolean | Ignitra: tecnicamente sim, mas anúncio → página oficial pula controle de compliance/tracking | Decide se precisa de bridge page própria |
| `tipo_pagina_permitida` | enum | `VSL`, `TSL`, `DTC` | Ignitra: TSL escolhido por carregar mais rápido e casar com busca em texto |
| `claims_proibidos` | lista de tags | "fraud/scam", "garantia de resultado", "antes/depois fora do kit" | Extraído do Affiliate Terms — vira checklist de revisão de copy antes de publicar |
| `disclosure_obrigatorio` | boolean + texto padrão | FTC disclosure | Regra legal, não opcional |
| `kit_afiliado_disponivel` | lista | "banner ads", "e-mail swipes" | Define de onde vêm os assets de marca (o que não pode ser gerado livremente via Magnific) |
| `risco_suspensao_conta_ads` | enum (Baixo/Médio/Alto) | Nutra geralmente Médio/Alto | Ajuda a decidir se roda em conta principal ou em conta de contingência |
| `link_termos_afiliado` | url | — | Fonte de verdade — regras mudam, então guardar o link com data de verificação |
| `termos_verificados_em` | date | — | Evita agir sobre uma versão desatualizada dos termos (interfaces e regras mudam com frequência) |

### 2.6 Estrutura de Campanha Planejada

| Campo | Tipo | Exemplo | Por que importa |
|---|---|---|---|
| `estrategia_campanha` | enum | `Review bottom-funnel`, `Generic top-funnel`, `Branded bidding` | Referência: `09-estrategia-review` |
| `dominio_hospedagem` | string | `nothforge.com/ignitra-review` | Reutilizável entre produtos — vale mapear qual domínio está "queimado" ou não |
| `tracking_configurado` | boolean + ferramenta | FlowTrack + pixel | Sem isso não dá pra validar CPA real depois |
| `orcamento_teste_definido` | number | — | Ver bloco 2.7 |
| `cpc_referencia_esperado` | number | — | Benchmark pra saber se o leilão está caro antes mesmo de rodar |
| `palavras_chave_prioritarias` | lista | "weight loss after 40" | Vem do Planejador de palavras-chave — evita redigitar toda vez |

### 2.7 Critérios Financeiros de Decisão

| Campo | Tipo | Exemplo | Por que importa |
|---|---|---|---|
| `budget_teste_alocado` | number | — | Quanto vai ser gasto até a primeira decisão go/no-go |
| `cpa_alvo_breakeven` | number (calculado) | comissão ÷ margem desejada | Linha de corte objetiva |
| `criterio_pausa` | texto/regra | "pausar após 3x CPA alvo sem conversão" | Referência: `12-quanto-investir-e-quando-parar` |
| `criterio_escala` | texto/regra | "escalar se ROI > X sustentado por N dias" | — |
| `capital_total_disponivel` | number | — | Visão de portfólio, não só da oferta isolada |
| `capital_comprometido_outras_ofertas` | number (somado) | — | Campo novo sugerido: dá pra ver na hora se você está prestes a pulverizar capital entre ofertas simultâneas — foi exatamente o critério usado ao decidir testar Purotyn geo por geo em vez de rodar tudo junto com LipoBliss/Gluco6 |

### 2.8 Performance Real (pós-lançamento)

| Campo | Tipo | Exemplo | Por que importa |
|---|---|---|---|
| `gasto_total` | number | — | — |
| `impressoes` / `cliques` / `ctr` | number/percent | — | — |
| `conversoes` / `cvr` | number/percent | — | — |
| `cpa_real` | number | — | Comparar contra `cpa_alvo_breakeven` |
| `receita_confirmada` | number | — | Só comissão validada, não estimada |
| `roi_real` | percent | — | Métrica-mãe: "quanto foi investido e quanto retornou" |
| `status_atual` | enum | `Testando`, `Escalando`, `Pausado`, `Encerrado` | — |
| `motivo_pausa_encerramento` | texto | — | Alimenta aprendizado pra próxima escolha de oferta |

---

## 3. Modelo relacional sugerido para o módulo

```
Persona (já existe na ferramenta)
 └─ SocialAccount (já existe)

Network (nova, tabela de apoio)
 - nome, tipo, confiabilidade_pagamento, prazo_pagamento_padrao

Offer (nova — o núcleo do módulo)
 - todos os campos das seções 2.1 a 2.7
 - FK: persona_id (nullable — nem toda oferta precisa estar amarrada a uma persona)
 - FK: network_id

ComplianceRule (nova, 1:N com Offer)
 - offer_id, regra, categoria (claim/pagina/linking/disclosure), fonte, verificado_em

PerformanceSnapshot (nova, 1:N com Offer, série temporal)
 - offer_id, data_snapshot, gasto, cliques, conversoes, cpa, roi, tendencia_trafego
 - permite reconstruir a curva de 30/60/90 dias em vez de guardar só o número mais recente

DecisionLog (nova, 1:N com Offer, append-only)
 - offer_id, data_decisao, tipo (aprovar_teste/pausar/escalar/descartar), justificativa, autor
 - espelha o que já acontece informalmente (ex: "decisão foi rodar teste controlado geo por geo em vez de esperar")
```

Separar `PerformanceSnapshot` e `DecisionLog` da tabela `Offer` principal evita que o registro "atual" sobrescreva o histórico — sem isso, não dá pra responder depois "por que essa oferta foi pausada em tal data".

---

## 4. Score de priorização sugerido

Um score único ajuda a ordenar o backlog de ofertas, mas só funciona se for transparente (nunca uma caixa-preta). Sugestão de fórmula ponderada, com pesos ajustáveis por vertical:

```
score = (w1 × epc_normalizado)
      + (w2 × (1 − refund_pct))
      + (w3 × tendencia_trafego_score)   # -1 caindo, 0 estável, +1 subindo
      + (w4 × comissao_normalizada)
      − (w5 × risco_compliance_score)
      − (w6 × penalidade_dados_incompletos)   # se completude_dados = Parcial/Ausente
```

Pontos de atenção:
- `penalidade_dados_incompletos` existe pra evitar que uma oferta "pareça" boa só porque falta dado ruim pra puxar a média pra baixo (caso real: Purotyn/Skincell sem EPC/refund visível).
- O score serve pra ranquear e triar, não pra decidir sozinho — decisão final continua manual, registrada em `DecisionLog` com justificativa em texto livre (é assim que já funciona hoje, informalmente).

---

## 5. Sugestões adicionais (fora do que já foi discutido)

1. **Flag de "confiabilidade da rede"** separada da oferta — uma tabela `Network` com histórico de pontualidade de pagamento e suporte, porque duas ofertas idênticas em métricas podem ter risco de recebimento bem diferente dependendo da rede (redes menores como GuruMedia/SmartADV/DrCash pedem esse cuidado a mais).
2. **Data de próxima revisão obrigatória** por oferta (`proxima_revisao_em`), não só campo de status — evita o padrão de "esquecer" uma oferta pendente por semanas (o próprio caso Purotyn/Skincell ficou "Pending" um tempo até virar assunto de novo).
3. **Ligação copy ↔ compliance**: já que a persona da página de review não é a mesma persona de marca (ver Ignitra, seção 4 — "voz de revisor, não de marca vendendo"), vale um campo `tom_pagina` na oferta (`Marca própria` vs `Review/bridge independente`) pra saber qual guia de voz da persona se aplica.
4. **Rastreio de domínio/asset reutilizável**: campo `dominio_usado` com histórico — permite ver quais domínios já têm reputação queimada com o Google Ads e evitar reusar um domínio problemático numa oferta nova.
5. **Painel de alocação de capital ativo**: um widget separado (não por oferta, mas agregando todas as ofertas em status `Testando`/`Escalando`) somando `budget_teste_alocado` vs `capital_total_disponivel` — torna visual a regra que você já aplica manualmente de não pulverizar entre ofertas ao mesmo tempo.
6. **Versionamento de termos de afiliado**: em vez de só um campo de texto, manter um pequeno histórico de mudanças nos termos (quando percebidas) — interfaces e regras de vendor mudam sem aviso, e isso já é uma ressalva explícita da metodologia.
7. **Campo de "origem da descoberta da oferta"** (`Planejador de palavras-chave`, `Glimpse`, `Search From`, `Indicação`, `Rede diretamente`) — ajuda a medir, com o tempo, qual canal de garimpo de oferta rende melhores ofertas, fechando um loop de aprendizado sobre o próprio processo de escolha.

---

## 6. Pontos em aberto

1. `[TBD]` Confirmar se o creator-engine já tem uma tabela de "produto" que deveria ser estendida em vez de criar `Offer` do zero.
2. `[TBD]` Definir se `PerformanceSnapshot` vai ser alimentado manualmente ou por integração futura com as redes (Mediascalers, ClickBank etc. têm exportação CSV — dá pra automatizar depois).
3. `[TBD]` Pesos da fórmula de score (seção 4) — sugestão inicial é atribuir todos iguais e ajustar depois de rodar algumas ofertas reais.

*Próximo passo sugerido: você confirma os 3 pontos acima (ou parte deles) e ajudo a especificar o schema exato (nomes de tabela/coluna) no formato que o creator-engine já usa, se você compartilhar a estrutura atual.*
