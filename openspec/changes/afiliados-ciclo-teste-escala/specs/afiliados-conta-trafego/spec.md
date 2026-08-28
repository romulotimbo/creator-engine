## ADDED Requirements

### Requirement: Identidade do Google Ads Customer ID
O sistema SHALL persistir `ContaTrafego.googleAdsCustomerId` (opcional, string), usado como parte da chave de identidade `(googleAdsCustomerId, nomeCampanhaGoogleAds)` no casamento de linhas do envelope de ingestão (capability `afiliados-ingestao`).

#### Scenario: Conta com customer id cadastrado
- **WHEN** uma `ContaTrafego` tem `googleAdsCustomerId` preenchido
- **THEN** o envelope de ingestão pode casar linhas dessa conta por `(googleAdsCustomerId, nomeCampanhaGoogleAds)`

#### Scenario: Conta sem customer id
- **WHEN** `googleAdsCustomerId` está nulo
- **THEN** linhas de ingestão que citarem essa conta não têm como casar por essa chave e caem na bandeja de não-reconciliados
