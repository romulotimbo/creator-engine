## 1. Alerta e capital

- [x] 1.1 Reescrever `alertaOrcamentoEstourado` (e testes em `rollups.test.ts`) para a conjunção ATIVO + campanha TESTANDO + gasto > budget + sem ItemFila terminal `teste.tetoComissao`; parar de ler `statusOperacional`
- [x] 1.2 Reescrever `getActiveCapitalAllocation` (`capital.ts` + `capital.test.ts`): alocado só ATIVO com campanha no ar; `totalSpent` inclui pausado; `alerts` só pela nova conjunção
- [x] 1.3 Ajustar o widget (`capital-allocation-widget.tsx`): bloco “sem decisão” só com `alerts`; linhas pausadas com gasto visíveis sem triângulo
- [x] 1.4 Atualizar consumidores do alerta no catálogo (`produtos/page.tsx`, `produto.ts`) para o novo helper

## 2. Cascade produto → campanhas

- [x] 2.1 No `PUT` de produto, transação: `PAUSADO`/`ARQUIVADO` chama `mudarStatusCampanha` em cada campanha TESTANDO/ESCALANDO com motivo de pausa/arquivo do produto; `ATIVO` não religa
- [x] 2.2 No mesmo fluxo, expirar `ItemFila` ABERTO/ADIADO `tipoAlvo=CAMPANHA` dessas campanhas
- [x] 2.3 Recusar `POST` de campanha (e `+ Campanha` do modal) se `produto.status ≠ ATIVO` (422)
- [x] 2.4 Testes de API/lib: cascade, ENCERRADO intacto, reativar sem religar, 422 em produto pausado, fila EXPIRADO

## 3. Radar — leitura, oferta intacta

- [x] 3.1 Incluir leitura derivada no GET do radar (oferta EM_EXECUCAO + produto): `trafego`, `produtoStatus`, gasto, budget
- [x] 3.2 `RadarTabela`: badge EM_EXECUCAO + leitura + atalhos catálogo/ficha; não tratar linha convertida como “ativa” no sentido de tráfego
- [x] 3.3 `modal-oferta-form`: `statusDecisao` somente leitura quando EM_EXECUCAO; não enviar Pausado/Descartado
- [x] 3.4 Ficha da campanha: aviso de que pausa no CE não escreve no Google Ads

## 4. Linguagem e verificação

- [x] 4.1 Atualizar `CONTEXT.md`: seta produto→campanhas; “sem tráfego agora” ≠ Descartado; alerta ≠ fila já resolvida
- [x] 4.2 `npm test` nos arquivos tocados
