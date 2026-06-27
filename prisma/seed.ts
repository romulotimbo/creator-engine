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
}

main()
  .then(() => db.$disconnect())
  .catch(e => { console.error(e); db.$disconnect(); process.exit(1) })
