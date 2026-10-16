import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { ErreurApi, lireJson, texte, traiter, utilisateur } from "@/lib/api"
import { clientAutorise } from "@/lib/dossiers"

export const dynamic = "force-dynamic"

export function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return traiter(async () => {
    const u = await utilisateur(request, true)
    const { id } = await params
    await clientAutorise(u, id)
    const b = await lireJson(request)
    if (!b.data || typeof b.data !== "object") throw new ErreurApi(400, "Simulation vide.")
    const nom = texte(b.nom, 120) ?? "Simulation"
    const simulation = await db.simulation.create({
      data: { clientId: id, nom, data: b.data as Prisma.InputJsonValue, authorId: u.id },
      select: { id: true, nom: true, updatedAt: true },
    })
    // Le dossier remonte en tête de liste.
    await db.client.update({ where: { id }, data: { updatedAt: new Date() } })
    return NextResponse.json({ simulation }, { status: 201 })
  })
}
