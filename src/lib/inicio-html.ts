/** HTML da raiz pública. Sem CSS/JS do Next, para o revisor do Google ler sem login. */
export function inicioHtml(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Creator Engine</title>
</head>
<body>
  <h1>Creator Engine</h1>
  <p>
    O Creator Engine analisa ofertas, palavras-chave e campanhas de anúncios.
    Com a sua autorização, ele lê dados da sua conta Google Ads, do Google
    Analytics, do Search Console, do Tag Manager e do Merchant Center para
    mostrar volume de busca, CPC, desempenho e decisões de campanha.
    Alterações na conta de anúncios só ocorrem quando você confirma a ação.
  </p>
  <p>Aplicativo: <a href="https://romulohub.cloud/creator-engine">https://romulohub.cloud/creator-engine</a></p>
  <p><a href="https://romulohub.cloud/privacidade">Política de privacidade</a></p>
  <p><a href="https://romulohub.cloud/termos">Termos de serviço</a></p>
</body>
</html>
`
}
