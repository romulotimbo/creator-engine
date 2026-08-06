import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { reputationStatusEnum } from "@/lib/afiliados"
import type { Prisma } from "@prisma/client"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get("reputationStatus")

  let where: Prisma.DomainUsageLogWhereInput = {}
  if (statusParam) {
    const statuses = statusParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s): s is "ok" | "flagged" | "burned" => reputationStatusEnum.safeParse(s).success)

    if (statuses.length > 0) {
      where = { reputationStatus: { in: statuses } }
    }
  }

  const logs = await db.domainUsageLog.findMany({
    where,
    include: { oferta: { select: { id: true, nome: true } } },
    orderBy: [{ domain: "asc" }, { usedFrom: "desc" }],
  })

  return NextResponse.json(logs)
}
