# network-reliability Specification

## Purpose
TBD - created by archiving change offer-governance-features. Update Purpose after archive.
## Requirements
### Requirement: Network entity with payment reliability score
A entidade `Network` SHALL existir como tabela independente no banco de dados, com os campos: `id`, `nome` (único), `paymentReliabilityScore` (Int, 0–100, nullable), `reliabilityUpdatedAt` (DateTime, nullable), `prazoPagamentoDias` (Int, nullable), `notas` (Text, nullable), `createdAt`, `updatedAt`.

#### Scenario: Create network with reliability score
- **WHEN** o operador cria uma `Network` informando `paymentReliabilityScore = 85`
- **THEN** o registro é persistido com o score informado e `reliabilityUpdatedAt` é setado para o momento da criação

#### Scenario: Update reliability score
- **WHEN** o operador atualiza `paymentReliabilityScore` de uma `Network` existente
- **THEN** o score é atualizado e `reliabilityUpdatedAt` é atualizado para `now()`

#### Scenario: Score is optional
- **WHEN** uma `Network` é criada sem `paymentReliabilityScore`
- **THEN** o campo fica `null` e o badge na UI exibe "Sem avaliação"

### Requirement: Network reliability badge on offer screen
A tela de oferta SHALL exibir um badge ao lado do nome da rede com o `paymentReliabilityScore` da `Network` vinculada à oferta.

#### Scenario: Badge displayed with score
- **WHEN** o operador visualiza uma oferta vinculada a uma `Network` com `paymentReliabilityScore = 72`
- **THEN** um badge exibe "Confiabilidade: 72/100" (ou equivalente visual) ao lado do nome da rede

#### Scenario: Badge reflects last updated date
- **WHEN** o badge é exibido
- **THEN** a data de `reliabilityUpdatedAt` também é exibida para indicar quando o score foi avaliado pela última vez

#### Scenario: Score does not influence offer score
- **WHEN** `paymentReliabilityScore` da rede vinculada é alterado
- **THEN** `OfertaDecisao.scoreCalculado` NÃO é recalculado — o score da rede é informação de contexto, não fator de ranking

### Requirement: Offer linked to Network
`OfertaDecisao` SHALL ter um campo `networkId` (String, nullable, FK para `Network`).

#### Scenario: Link offer to network
- **WHEN** o operador seleciona uma rede ao criar ou editar uma oferta
- **THEN** `OfertaDecisao.networkId` é atualizado e a relação é persistida

#### Scenario: Offer without network
- **WHEN** uma oferta não tem rede vinculada
- **THEN** nenhum badge de confiabilidade é exibido na tela da oferta

