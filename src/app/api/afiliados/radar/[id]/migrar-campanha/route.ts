import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { decimalNum } from "@/lib/afiliados"
import { z } from "zod"

const migrarCampanhaSchema = z.object({
  contaTrafegoId: z.string().min(1, "Conta de tráfego é obrigatória"),
  preco: z.coerce.number().optional().nullable(),
  comissaoPercent: z.coerce.number().optional().nullable(),
  linkCheckout: z.string().optional().nullable(),
  linkLanding: z.string().optional().nullable(),
  linkTracking: z.string().optional().nullable(),
  justificativa: z.string().optional().nullable(),
})

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    const oferta = await db.ofertaDecisao.findUnique({ where: { id } })
    if (!oferta) return NextResponse.json({ error: "Oferta não encontrada" }, { status: 404 })

    const body = migrarCampanhaSchema.parse(await req.json())

    const conta = await db.contaTrafego.findUnique({ where: { id: body.contaTrafegoId } })
    if (!conta) return NextResponse.json({ error: "Conta de tráfego não encontrada" }, { status: 404 })

    // Determinar plataforma inicial do produto baseado nas redes da oferta
    const primeiraRede = oferta.plataformas[0]?.toUpperCase() || "OUTRO"
    const plataformaAfilEnum = ["BRAIP", "MONETIZZE", "HOTMART", "EDUZZ"].includes(primeiraRede)
      ? (primeiraRede as "BRAIP" | "MONETIZZE" | "HOTMART" | "EDUZZ")
      : "OUTRO"

    // Gerar slug único para o ProdutoAfiliado
    let baseSlug = slugify(oferta.nome)
    let slug = baseSlug
    let counter = 1
    while (await db.produtoAfiliado.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`
    }

    // Criar ou reusar ProdutoAfiliado
    const produto = await db.produtoAfiliado.create({
      data: {
        slug,
        nome: oferta.nome,
        plataformaAfil: plataformaAfilEnum,
        preco: body.preco ?? (oferta.comissaoValor ? decimalNum(oferta.comissaoValor) : null),
        comissaoPercent: body.comissaoPercent ?? null,
        linkCheckout: body.linkCheckout ?? null,
        linkLanding: body.linkLanding ?? null,
        status: "ATIVO",
        observacoes: `Criado automaticamente a partir da OfertaDecisao ${oferta.id}`,
        ofertaDecisaoId: oferta.id,
      },
    })

    // Vincular à ContaTrafego escolhida
    await db.contaTrafegoProduto.upsert({
      where: {
        contaTrafegoId_produtoId: {
          contaTrafegoId: conta.id,
          produtoId: produto.id,
        },
      },
      create: {
        contaTrafegoId: conta.id,
        produtoId: produto.id,
        linkTracking: body.linkTracking || null,
        ativo: true,
      },
      update: {
        linkTracking: body.linkTracking || null,
        ativo: true,
      },
    })

    // Atualizar status da OfertaDecisao para EM_EXECUCAO e registrar no log
    await db.ofertaDecisao.update({
      where: { id: oferta.id },
      data: {
        statusDecisao: "EM_EXECUCAO",
        decisoes: {
          create: {
            statusAnterior: oferta.statusDecisao,
            statusNovo: "EM_EXECUCAO",
            justificativa: body.justificativa || `Campanha criada na conta de tráfego ${conta.nome}`,
            autor: session.user?.email || "Usuário",
          },
        },
      },
    })

    return NextResponse.json({
      ok: true,
      produtoId: produto.id,
      produtoSlug: produto.slug,
      contaTrafegoId: conta.id,
    }, { status: 201 })
  } catch (e: unknown) {
    const err = e as { name?: string; errors?: { message?: string }[]; message?: string }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors?.[0]?.message || "Dados inválidos" }, { status: 422 })
    }
    return NextResponse.json({ error: err.message ?? "Erro ao migrar oferta para campanha" }, { status: 400 })
  }
}
