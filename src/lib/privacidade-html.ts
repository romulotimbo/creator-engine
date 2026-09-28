const GOOGLE_USER_DATA_POLICY =
  "https://developers.google.com/terms/api-services-user-data-policy"
const GOOGLE_ACCOUNT_PERMISSIONS = "https://myaccount.google.com/permissions"
const PUBLIC_URL = "https://romulohub.cloud/privacidade"

/** HTML autossuficiente: sem CSS/JS do Next, para o revisor do Google ler sem login. */
export function privacidadeHtml(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Política de privacidade — Creator Engine</title>
  <meta name="description" content="Como o Creator Engine acessa, usa, armazena e compartilha dados de usuários do Google." />
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
    ul {
      margin: 0 0 1rem;
      padding-left: 1.2rem;
    }
    li { margin: 0 0 0.65rem; }
    li strong { color: var(--fg); }
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
      <h1>Política de privacidade</h1>
      <p class="updated">Última atualização: 27 de setembro de 2026.</p>
    </header>

    <p>Esta política descreve como o Creator Engine, operado pelo responsável pelo site romulohub.cloud (“nós”), acessa, usa, armazena e compartilha dados de usuários do Google. Ela vale para o aplicativo em <a href="https://romulohub.cloud/creator-engine">https://romulohub.cloud/creator-engine</a> e para a integração que conecta esse aplicativo às APIs do Google.</p>

    <p class="contact">Contato: <a href="mailto:romulotsilva@gmail.com">romulotsilva@gmail.com</a>.</p>

    <h2>O que o aplicativo faz</h2>
    <p>O Creator Engine ajuda o titular da conta a analisar ofertas, palavras-chave e campanhas. A conexão com o Google existe para trazer métricas da própria conta de quem autoriza o acesso, não para anunciar a terceiros.</p>

    <h2>Dados do Google que acessamos</h2>
    <p>Quando você autoriza o aplicativo, pedimos acesso às APIs do Google nestes limites:</p>
    <ul>
      <li><strong>Google Ads:</strong> campanhas, grupos de anúncios, anúncios, palavras-chave, termos de pesquisa, recomendações, públicos, dados do planejador de palavras-chave (volume de busca, concorrência e lances de topo de página) e configurações da conta. O acesso também permite alterar a conta, por exemplo campanha, palavra-chave, orçamento ou anúncio, somente quando você confirma a ação no aplicativo.</li>
      <li><strong>Google Analytics (GA4):</strong> relatórios de tráfego, eventos e conversões da propriedade que você conectar. Podemos marcar um evento como evento principal quando você pede isso.</li>
      <li><strong>Google Search Console:</strong> cliques, impressões, CTR e posição de consultas e páginas dos sites que você autorizar.</li>
      <li><strong>Google Tag Manager:</strong> leitura de contas, contêineres, tags, acionadores e versões. Não publicamos contêiner por esta integração.</li>
      <li><strong>Google Merchant Center:</strong> leitura da saúde do feed e do status dos produtos. Não editamos o feed por esta integração.</li>
    </ul>
    <p>Não pedimos acesso a Gmail, Drive, Contatos nem Calendar.</p>

    <h2>Como usamos esses dados</h2>
    <p>Usamos os dados do Google somente para:</p>
    <ul>
      <li>exibir volume, CPC, custo previsto, desempenho e diagnóstico no Creator Engine;</li>
      <li>decidir e registrar análise de ofertas e de campanhas da conta que autorizou o acesso;</li>
      <li>aplicar na conta Google Ads uma alteração que você tenha confirmado.</li>
    </ul>
    <p>Não vendemos dados do Google. Não usamos esses dados para anunciar a outras pessoas, construir perfis de terceiros, conceder crédito, treinar modelos de uso geral nem repassar a corretores de dados.</p>
    <p>O uso de informações recebidas das APIs do Google segue a <a href="${GOOGLE_USER_DATA_POLICY}">Política de dados do usuário dos serviços de API do Google</a>, incluindo os requisitos de Limited Use.</p>

    <h2>Onde os dados ficam</h2>
    <p>Métricas e decisões usadas pelo Creator Engine ficam no banco de dados do aplicativo, sob nosso controle. O token OAuth da integração pode ficar armazenado na máquina que executa a conexão com as APIs do Google. Não publicamos esses dados.</p>

    <h2>Com quem compartilhamos</h2>
    <p>Não compartilhamos dados do Google com terceiros, salvo se você pedir, se for necessário para operar a infraestrutura que hospeda o Creator Engine, para segurança ou para cumprir a lei. Quem hospeda a infraestrutura só processa os dados para manter o serviço no ar.</p>

    <h2>Por quanto tempo guardamos</h2>
    <p>Guardamos métricas e registros de campanha enquanto a conta existir no Creator Engine ou enquanto forem necessários para a análise que você pediu. Você pode pedir a exclusão pelo e-mail de contato. A exclusão no Creator Engine não apaga dados que continuam na sua conta Google.</p>

    <h2>Como revogar o acesso</h2>
    <p>Você pode retirar o acesso a qualquer momento em <a href="${GOOGLE_ACCOUNT_PERMISSIONS}">Permissões da Conta Google</a>, removendo o Creator Engine. Também pode pedir a exclusão dos dados armazenados pelo aplicativo pelo e-mail de contato.</p>

    <h2>Alterações</h2>
    <p>Se o uso dos dados do Google mudar, atualizamos esta página e a data no topo antes de usar os dados de um jeito novo.</p>

    <footer>
      <a href="${PUBLIC_URL}">${PUBLIC_URL}</a>
    </footer>
  </main>
</body>
</html>
`
}
