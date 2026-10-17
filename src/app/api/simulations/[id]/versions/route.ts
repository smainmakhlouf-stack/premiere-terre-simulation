import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { ErreurApi, lireJson, texte, traiter, utilisateur } from "@/lib/api"
import { simulationAutorisee } from "@/lib/dossiers"
import { enregistrerVersion } from "@/lib/historique"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

/** Historique des enregistrements d'une simulation (le plus récent en premier). */
export function GET(request: Request, { params }: Ctx) {
  return traiter(async () => {
    const u = await utilisateur(request)
    const sim = await simulationAutorisee(u, (await params).id)
    const versions = await db.simulationVersion.findMany({
      where: { simulationId: sim.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, nom: true, action: true, auteurNom: true, createdAt: true, resume: true },
    })
    return NextResponse.json({ versions })
  })
}

/** Restaure une version : elle redevient l'état courant, et la restauration est elle-même tracée. */
export function POST(request: Request, { params }: Ctx) {
  return traiter(async () => {
    const u = await utilisateur(request, true)
    const sim = await simulationAutorisee(u, (await params).id)
    const versionId = texte((await lireJson(request)).versionId, 60)
    const v = versionId ? await db.simulationVersion.findFirst({ where: { id: versionId, simulationId: sim.id } }) : null
    if (!v) throw new ErreurApi(404, "Version introuvable.")
    const contenu = { data: v.data as Prisma.InputJsonValue, resume: (v.resume ?? undefined) as Prisma.InputJsonValue | undefined }
    const simulation = await db.simulation.update({ where: { id: sim.id }, data: contenu, select: { id: true, nom: true, updatedAt: true, data: true } })
    await enregistrerVersion(sim.id, { nom: simulation.nom, ...contenu }, "restauration", u.name)
    await db.client.update({ where: { id: sim.clientId }, data: { updatedAt: new Date() } })
    return NextResponse.json({ simulation })
  })
}
