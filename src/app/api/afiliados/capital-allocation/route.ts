import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getActiveCapitalAllocation } from "@/lib/afiliados/capital"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const allocation = await getActiveCapitalAllocation()
  return NextResponse.json(allocation)
}
