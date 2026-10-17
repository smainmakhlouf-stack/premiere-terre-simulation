import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { ErreurApi, lireJson, texte, traiter, utilisateur } from "@/lib/api"
import { STATUTS, clientAutorise } from "@/lib/dossiers"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export function GET(request: Request, { params }: Ctx) {
  return traiter(async () => {
    const u = await utilisateur(request)
    const { id } = await params
    await clientAutorise(u, id)
    const client = await db.client.findUnique({
      where: { id },
      include: {
        owner: { select: { name: true } },
        sms: { orderBy: { createdAt: "desc" }, take: 20 },
        simulations: { orderBy: { updatedAt: "desc" }, select: { id: true, nom: true, resume: true, createdAt: true, updatedAt: true, author: { select: { name: true } }, _count: { select: { versions: true } } } },
      },
    })
    return NextResponse.json({ client })
  })
}

export function PATCH(request: Request, { params }: Ctx) {
  return traiter(async () => {
    const u = await utilisateur(request, true)
    const { id } = await params
    await clientAutorise(u, id)
    const b = await lireJson(request)
    // Changement de statut seul (en cours / financé / perdu).
    if (b.nom === undefined && typeof b.statut === "string") {
      if (!STATUTS.includes(b.statut as (typeof STATUTS)[number])) throw new ErreurApi(400, "Statut inconnu.")
      const client = await db.client.update({ where: { id }, data: { statut: b.statut } })
      return NextResponse.json({ client })
    }
    const nom = texte(b.nom, 100)
    if (!nom) throw new ErreurApi(400, "Le nom du client est obligatoire.")
    const client = await db.client.update({
      where: { id },
      data: { nom, prenom: texte(b.prenom, 100), nom2: texte(b.nom2, 100), prenom2: texte(b.prenom2, 100), civilite: texte(b.civilite, 40), secteur: texte(b.secteur, 120), email: texte(b.email, 200), telephone: texte(b.telephone, 40), notes: texte(b.notes, 5000) },
    })
    return NextResponse.json({ client })
  })
}

export function DELETE(request: Request, { params }: Ctx) {
  return traiter(async () => {
    const u = await utilisateur(request, true)
    const { id } = await params
    await clientAutorise(u, id)
    await db.client.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  })
}
