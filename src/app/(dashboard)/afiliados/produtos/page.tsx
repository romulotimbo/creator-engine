import { db } from "@/lib/db"
import { decimalNum } from "@/lib/afiliados"
import CatalogoClient from "./CatalogoClient"

export default async function CatalogoProdutosPage() {
  const produtos = await db.produtoAfiliado.findMany({
    include: { _count: { select: { contas: true, vendas: true } } },
    orderBy: { nome: "asc" },
  })

  return (
    <CatalogoClient
      produtos={produtos.map((p) => ({
        ...p,
        preco: p.preco != null ? decimalNum(p.preco) : null,
        comissaoPercent: p.comissaoPercent != null ? decimalNum(p.comissaoPercent) : null,
      }))}
    />
  )
}
