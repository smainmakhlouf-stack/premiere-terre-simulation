import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { lireJson, texte, traiter, utilisateur } from "@/lib/api"
import { clientAutorise, simulationAutorisee } from "@/lib/dossiers"
import { enregistrerVersion } from "@/lib/historique"

export const dynamic = "force-dynamic"

/** Copie une simulation, dans le même dossier ou dans un autre dossier du vendeur. */
export function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return traiter(async () => {
    const u = await utilisateur(request, true)
    const sim = await simulationAutorisee(u, (await params).id)
    const b = await lireJson(request)
    const clientId = texte(b.clientId, 60) ?? sim.clientId
    if (clientId !== sim.clientId) await clientAutorise(u, clientId)
    const nom = texte(b.nom, 120) ?? `${sim.nom} (copie)`
    const contenu = { nom, data: sim.data as Prisma.InputJsonValue, resume: (sim.resume ?? undefined) as Prisma.InputJsonValue | undefined }
    const simulation = await db.simulation.create({ data: { clientId, authorId: u.id, ...contenu }, select: { id: true, nom: true, clientId: true } })
    await enregistrerVersion(simulation.id, contenu, "duplication", u.name)
    await db.client.update({ where: { id: clientId }, data: { updatedAt: new Date() } })
    return NextResponse.json({ simulation }, { status: 201 })
  })
}
