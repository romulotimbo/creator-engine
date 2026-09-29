const GOOGLE_USER_DATA_POLICY =
  "https://developers.google.com/terms/api-services-user-data-policy"
const GOOGLE_ACCOUNT_PERMISSIONS = "https://myaccount.google.com/permissions"
const PRIVACY_URL = "https://romulohub.cloud/privacidade"
const PUBLIC_URL = "https://romulohub.cloud/termos"

/** HTML autossuficiente: sem CSS/JS do Next, para o revisor do Google ler sem login. */
export function termosHtml(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Termos de serviço — Creator Engine</title>
  <meta name="description" content="Termos de uso do Creator Engine e da integração com as APIs do Google." />
  <link rel="canonical" href="${PUBLIC_URL}" />
  <style>
    :root {
      color-scheme: dark;
      --bg: #0c0b14;
      --fg: #e8e4f2;
      --muted: #a39bb8;
      --faint: #7a728c;
      --line: #2a2640;
      --accent: #d946ef;
      --surface: #141221;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--fg);
      font-family: "Segoe UI", system-ui, sans-serif;
      font-size: 1.05rem;
      line-height: 1.65;
    }
    main {
      max-width: 42rem;
      margin: 0 auto;
      padding: 3rem 1.25rem 4rem;
    }
    .kicker {
      margin: 0 0 0.35rem;
      color: var(--accent);
      font-size: 0.8rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0 0 0.5rem;
      font-size: 2rem;
      line-height: 1.2;
      font-weight: 650;
    }
    .updated {
      margin: 0 0 1.75rem;
      color: var(--muted);
    }
    h2 {
      margin: 2.25rem 0 0.75rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--line);
      font-size: 1.2rem;
      line-height: 1.3;
    }
    p { margin: 0 0 1rem; }
    a { color: var(--accent); }
    a:hover { text-decoration: none; }
    .contact {
      margin: 0 0 0.5rem;
      padding: 0.9rem 1rem;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 0.4rem;
    }
    footer {
      margin-top: 2.5rem;
      color: var(--faint);
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <main>
    <header>
      <p class="kicker">Creator Engine · romulohub.cloud</p>
      <h1>Termos de serviço</h1>
      <p class="updated">Última atualização: 29 de setembro de 2026.</p>
    </header>

    <p>Estes termos regulam o uso do Creator Engine, em <a href="https://romulohub.cloud/creator-engine">https://romulohub.cloud/creator-engine</a>, operado pelo responsável pelo site romulohub.cloud. Ao autorizar o acesso Google ou usar o aplicativo, você concorda com estes termos e com a <a href="${PRIVACY_URL}">Política de privacidade</a>.</p>

    <p class="contact">Contato: <a href="mailto:romulotsilva@gmail.com">romulotsilva@gmail.com</a>.</p>

    <h2>O serviço</h2>
    <p>O Creator Engine analisa ofertas, palavras-chave e campanhas da conta que você conecta. Ele mostra volume de busca, CPC, custo previsto, desempenho e diagnóstico. Uma alteração na conta Google Ads, como campanha, palavra-chave, orçamento ou anúncio, só é enviada quando você confirma a ação.</p>
    <p>Números do planejador de palavras-chave e previsões de custo são estimativas do Google. Não são promessa de clique, conversão, custo ou resultado de campanha.</p>

    <h2>Sua conta Google</h2>
    <p>Você só pode conectar uma conta Google Ads, Analytics, Search Console, Tag Manager ou Merchant Center se tiver autorização para usá-la. Você continua responsável pelo conteúdo dos anúncios, pelas páginas de destino, pelo orçamento e pelo cumprimento das políticas do Google Ads.</p>
    <p>A relação com o Google é regida pelos termos e políticas do próprio Google. Revogar o Creator Engine em <a href="${GOOGLE_ACCOUNT_PERMISSIONS}">Permissões da Conta Google</a> encerra o acesso futuro do aplicativo a essa conta.</p>

    <h2>O que você não pode fazer</h2>
    <p>Não use o Creator Engine para acessar conta de terceiro sem permissão, contornar limite da API do Google, revender os dados obtidos das APIs do Google nem tentar extrair dados além do que o aplicativo mostra para a sua própria análise.</p>

    <h2>Dados</h2>
    <p>O acesso, o uso, o armazenamento e o compartilhamento de dados do Google estão descritos na <a href="${PRIVACY_URL}">Política de privacidade</a>. O uso de informações recebidas das APIs do Google segue a <a href="${GOOGLE_USER_DATA_POLICY}">Política de dados do usuário dos serviços de API do Google</a>, incluindo os requisitos de Limited Use.</p>

    <h2>Disponibilidade</h2>
    <p>O serviço pode ficar indisponível para manutenção ou por falha da API do Google. Podemos alterar ou encerrar funções do Creator Engine. Se o uso dos dados do Google mudar, a <a href="${PRIVACY_URL}">Política de privacidade</a> é atualizada antes.</p>

    <h2>Limite de responsabilidade</h2>
    <p>O Creator Engine é uma ferramenta de análise e de execução das ações que você confirma. Não respondemos por prejuízo decorrente de decisão de mídia, lance, orçamento ou pausa de campanha tomada a partir das estimativas exibidas.</p>

    <h2>Alterações destes termos</h2>
    <p>Se estes termos mudarem, a data no topo desta página muda. O uso do aplicativo depois da publicação vale como aceite da versão nova.</p>

    <h2>Lei</h2>
    <p>Estes termos são regidos pelas leis da República Federativa do Brasil.</p>

    <footer>
      <a href="${PUBLIC_URL}">${PUBLIC_URL}</a>
    </footer>
  </main>
</body>
</html>
`
}
