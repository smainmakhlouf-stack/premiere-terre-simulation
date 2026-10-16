import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { lireJson, texte, traiter, utilisateur } from "@/lib/api"
import { simulationAutorisee } from "@/lib/dossiers"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export function GET(request: Request, { params }: Ctx) {
  return traiter(async () => {
    const u = await utilisateur(request)
    const sim = await simulationAutorisee(u, (await params).id)
    return NextResponse.json({ simulation: sim })
  })
}

export function PUT(request: Request, { params }: Ctx) {
  return traiter(async () => {
    const u = await utilisateur(request, true)
    const sim = await simulationAutorisee(u, (await params).id)
    const b = await lireJson(request)
    const simulation = await db.simulation.update({
      where: { id: sim.id },
      data: {
        ...(texte(b.nom, 120) ? { nom: texte(b.nom, 120)! } : {}),
        ...(b.data && typeof b.data === "object" ? { data: b.data as Prisma.InputJsonValue } : {}),
      },
      select: { id: true, nom: true, updatedAt: true },
    })
    await db.client.update({ where: { id: sim.clientId }, data: { updatedAt: new Date() } })
    return NextResponse.json({ simulation })
  })
}

export function DELETE(request: Request, { params }: Ctx) {
  return traiter(async () => {
    const u = await utilisateur(request, true)
    const sim = await simulationAutorisee(u, (await params).id)
    await db.simulation.delete({ where: { id: sim.id } })
    return NextResponse.json({ ok: true })
  })
}
