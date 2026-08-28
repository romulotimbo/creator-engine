import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const db = new PrismaClient()

async function main() {
  // Create admin user
  const hash = await bcrypt.hash("creatorengine123", 10)
  const user = await db.user.upsert({
    where: { email: "admin@creator-engine.local" },
    update: { password: hash, name: "Admin" },
    create: { email: "admin@creator-engine.local", password: hash, name: "Admin" },
  })
  console.log("User:", user.email)

  // Create veesemfiltro persona
  const vee = await db.persona.upsert({
    where: { slug: "veesemfiltro" },
    update: {},
    create: {
      slug: "veesemfiltro",
      nomeArtistico: "Vee",
      status: "ATIVA",
      nicho: "Lifestyle alternativo / afiliados / conteudo adulto",
      aparencia: "Mulher branca, 25-30 anos, cabelo pixie curto, tatuagens visiveis (bracos, pescoco), estetica edgy/alternativa.",
      personalidade: "Forte, direta, provocativa, confiante. Nao pede desculpas pelo que pensa. Tom irreverente, as vezes ironico.",
      backstory: "Brasileira que construiu identidade fora dos padroes esperados.",
      incongruenciaCentral: "Estetica alternativa/tattooed vs. posicionamento de direita conservadora.",
      disclosureIa: true,
      disclosureTexto: "Conteudo criado com auxilio de inteligencia artificial.",
      contas: {
        create: [
          { plataforma: "INSTAGRAM", handle: "veesemfiltro", seguidoresAtual: 753, metaSeguidores: 5000 },
          { plataforma: "TIKTOK", handle: "veesemfiltro", seguidoresAtual: 0, metaSeguidores: 5000 },
        ],
      },
    },
  })
  console.log("Persona:", vee.slug)

  // Templates de vídeo (Estúdio) — 1 por pilar da linha editorial Tactical Rebel.
  const templates = [
    {
      slug: "gancho-incongruencia",
      nome: "Gancho da Incongruência (Pilar 1 · Atração)",
      composicao: "gancho-incongruencia",
      descricao: "Choque nos 3s, cena limpa no miolo, texto de impacto/convicção.",
    },
    {
      slug: "bastidores-disciplina",
      nome: "Bastidores & Disciplina (Pilar 2 · Conexão)",
      composicao: "bastidores-disciplina",
      descricao: "Rotina/treino, legenda em terço inferior, grão sutil e marca d'água.",
    },
    {
      slug: "provocacao-conversao",
      nome: "Provocação → Conversão (Pilar 3 · Conversão)",
      composicao: "provocacao-conversao",
      descricao: "Low-key, mistério, encerra em CTA (link na bio).",
    },
  ] as const

  for (const t of templates) {
    await db.templateVideo.upsert({
      where: { slug: t.slug },
      update: { nome: t.nome, composicao: t.composicao, descricao: t.descricao, ativo: true },
      create: {
        slug: t.slug,
        nome: t.nome,
        composicao: t.composicao,
        descricao: t.descricao,
        formatos: ["VERTICAL_9_16", "QUADRADO_1_1", "RETRATO_4_5"],
      },
    })
  }
  console.log("Templates de vídeo:", templates.length)

  // Conta de tráfego + produto afiliado (exemplo Power Energi / Braip — sem credenciais)
  const contaAds = await db.contaTrafego.upsert({
    where: { slug: "meta-power-energi" },
    update: {},
    create: {
      slug: "meta-power-energi",
      nome: "Meta · Power Energi",
      plataforma: "META",
      status: "ATIVA",
      observacoes: "Conta de anúncios de exemplo para o módulo Afiliados.",
    },
  })
  const produto = await db.produtoAfiliado.upsert({
    where: { slug: "power-energi" },
    update: {},
    create: {
      slug: "power-energi",
      nome: "Power Energi",
      plataformaAfil: "BRAIP",
      preco: 197,
      comissaoPercent: 50,
      status: "ATIVO",
    },
  })
  await db.contaTrafegoProduto.upsert({
    where: {
      contaTrafegoId_produtoId: { contaTrafegoId: contaAds.id, produtoId: produto.id },
    },
    update: { ativo: true },
    create: {
      contaTrafegoId: contaAds.id,
      produtoId: produto.id,
      ativo: true,
    },
  })
  console.log("Afiliados:", contaAds.slug, "+", produto.slug)

  // Limiares globais — ciclo de teste e escala (afiliados-limiares)
  const limiares = [
    {
      chave: "teste.pisoVolumeBuscaMensal",
      valor: 300,
      descricao: "Piso de volume de busca mensal (curva ascendente do Radar)",
    },
    {
      chave: "radar.pisoMagnitudePct",
      valor: 40,
      descricao: "Piso de magnitude de variação de busca para priorização no Radar (%)",
    },
    {
      chave: "segmento.volumeMinimoConversoes",
      valor: 3,
      descricao: "Volume mínimo de conversões por segmento para a regra de otimização geo×dispositivo",
    },
    {
      chave: "segmento.diferencaCpaMinimaPct",
      valor: 25,
      descricao: "Diferença mínima de CPA do segmento vs. média da campanha para acionar a regra (%)",
    },
    {
      chave: "folego.tetoInicialUsd",
      valor: 200,
      descricao: "Teto absoluto de fôlego financeiro (USD) para o perfil 'inicial'",
    },
    {
      chave: "folego.tetoCaixaFormadoUsd",
      valor: 600,
      descricao: "Teto absoluto de fôlego financeiro (USD) para o perfil 'caixa formado'",
    },
    {
      chave: "conversaoOffline.ativoPorFase",
      valor: { TESTANDO: false, ESCALANDO: true },
      descricao: "Toggle de upload de conversão offline ao Google Ads, por fase da campanha",
    },
  ] as const

  for (const l of limiares) {
    await db.limiarGlobal.upsert({
      where: { chave: l.chave },
      update: { valor: l.valor, descricao: l.descricao },
      create: { chave: l.chave, valor: l.valor, descricao: l.descricao },
    })
  }
  console.log("Limiares globais:", limiares.length)
}

main()
  .then(() => db.$disconnect())
  .catch(e => { console.error(e); db.$disconnect(); process.exit(1) })
