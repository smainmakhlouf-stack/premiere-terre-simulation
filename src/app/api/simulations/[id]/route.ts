import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { lireJson, texte, traiter, utilisateur } from "@/lib/api"
import { simulationAutorisee } from "@/lib/dossiers"
import { enregistrerVersion, resume } from "@/lib/historique"

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
        ...(b.data && typeof b.data === "object" ? { data: b.data as Prisma.InputJsonValue, resume: resume(b.resume) } : {}),
      },
      select: { id: true, nom: true, updatedAt: true, data: true, resume: true },
    })
    if (b.data && typeof b.data === "object") {
      await enregistrerVersion(simulation.id, { nom: simulation.nom, data: simulation.data as Prisma.InputJsonValue, resume: simulation.resume as Prisma.InputJsonValue }, "modification", u.name)
    }
    await db.client.update({ where: { id: sim.clientId }, data: { updatedAt: new Date() } })
    return NextResponse.json({ simulation: { id: simulation.id, nom: simulation.nom, updatedAt: simulation.updatedAt } })
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
