# Proposal: Seção de Radar & Decisão de Ofertas no Módulo Afiliados

## Why

Atualmente, o módulo de Afiliados no `creator-engine` foca exclusivamente na fase de execução (Contas de Tráfego de anúncios, Produtos já vinculados e rastreio de Vendas). 

No entanto, antes de registrar uma campanha em uma conta de tráfego, existe um processo crítico de garimpo, análise de mercado e leilão (Google Ads, EPC de redes como BuyGoods/ClickBank/Mediascalers, tendência de acessos, comissão, refund e compliance). 

Esta mudança introduz o **Radar & Matriz de Decisão de Ofertas**, permitindo comparar ofertas entre múltiplas plataformas com um score dinâmico automatizado, auxiliando a decidir objetivamente qual o próximo produto a ter uma campanha criada. Uma vez aprovada ("Go!"), a oferta é migrada automaticamente para a conta de tráfego selecionada no módulo de Afiliados.

## What

- **Novo Modelo `OfertaDecisao`**: Entidade separada no banco de dados para representar ofertas em fase de garimpo/análise, armazenando métricas de redes (EPC, Refund, CVR, Tendências 30/60/90d, Visitas, Gravity) e métricas de leilão Google Ads (CPC Mínimo/Máximo, Volume Mensal, Concorrência, Permissão de Brand Bidding, Keywords).
- **Importação e Upsert por CSV**: Importador inteligente capaz de ler arquivos CSV de ofertas (como `docs/afiliados/produtos.csv`), higienizar caracteres de moeda (`$`), percentuais (`%`), tratar nulos e realizar Upsert por nome da oferta.
- **Score Dinâmico de Priorização**: Algoritmo de cálculo de pontuação (0 a 100) combinando EPC normalizado, baixa taxa de refund, tendência de tráfego, comissão, risco de compliance e penalidade para dados incompletos (`completudeDados`).
- **Migração Automática ("Go!")**: Fluxo na UI que permite aprovar uma oferta, selecionar uma `ContaTrafego`, criar/vincular automaticamente o `ProdutoAfiliado` (com chave estrangeira `ofertaDecisaoId`), criar o vínculo `ContaTrafegoProduto`, atualizar o status da oferta para `EM_EXECUCAO` e registrar o histórico em `DecisionLogOferta`.
- **UI do Radar no Módulo Afiliados**: Sub-navegação por abas em `/afiliados` (`[ Radar de Ofertas ]` | `[ Contas de Tráfego ]` | `[ Catálogo & Vendas ]`), tabela interativa com ordenação por Score/EPC/CPC, filtros por Rede/Status/Vertical e widget de alocação de capital para testes.

## Scope

### In Scope

- Criação do modelo `OfertaDecisao` e `DecisionLogOferta` no `prisma/schema.prisma` e migração via Prisma.
- Adição da FK `ofertaDecisaoId` em `ProdutoAfiliado`.
- Endpoints de API (CRUD, importação de CSV, cálculo de score e migração para conta de tráfego).
- Componente parser de CSV com sanitização automática (`$`, `%`, números, listas de plataformas).
- Interface do Radar em `src/app/(dashboard)/afiliados/radar` e integração nas abas de navegação do módulo Afiliados.
- Modal de migração "Go! Criar Campanha" com vínculo automático a `ContaTrafego`.
- Log de histórico de decisões (`DecisionLogOferta`).

### Out of Scope

- Integração direta em tempo real via API oficial do Google Ads / Keyword Planner (a inserção de dados de CPC/Volume será manual no form ou via CSV).
- Coleta automática via web scraping dos dashboards das redes de afiliados ( ClickBank, BuyGoods, etc. - a alimentação é via CSV ou formulário).
