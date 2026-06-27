import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const entries = await db.discoveryEntry.findMany({ orderBy: { data: "desc" } })
  return NextResponse.json(entries)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const entry = await db.discoveryEntry.create({ data: body })
  return NextResponse.json(entry, { status: 201 })
}
