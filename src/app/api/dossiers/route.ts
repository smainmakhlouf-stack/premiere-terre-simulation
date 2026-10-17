import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { ErreurApi, lireJson, texte, traiter, utilisateur } from "@/lib/api"
import { STATUTS, filtreClients } from "@/lib/dossiers"

export const dynamic = "force-dynamic"

export function GET(request: Request) {
  return traiter(async () => {
    const u = await utilisateur(request)
    const sp = new URL(request.url).searchParams
    const q = sp.get("q")?.trim()
    const recherche = q
      ? { OR: [
          ...["nom", "prenom", "nom2", "prenom2", "email", "telephone"].map((champ) => ({ [champ]: { contains: q, mode: "insensitive" as const } })),
          { simulations: { some: { nom: { contains: q, mode: "insensitive" as const } } } },
        ] }
      : {}
    const statut = sp.get("statut")
    const conseiller = u.admin ? sp.get("conseiller") : null
    const jours = Number(sp.get("jours"))
    const filtres = {
      ...(STATUTS.includes(statut as (typeof STATUTS)[number]) ? { statut: statut! } : {}),
      ...(conseiller ? { ownerId: conseiller === "aucun" ? null : conseiller } : {}),
      ...(jours > 0 && jours <= 3650 ? { updatedAt: { gte: new Date(Date.now() - jours * 86400000) } } : {}),
    }
    const clients = await db.client.findMany({
      where: { ...filtreClients(u), ...recherche, ...filtres },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true, nom: true, prenom: true, nom2: true, prenom2: true, email: true, telephone: true, statut: true, updatedAt: true,
        owner: { select: { name: true } },
        simulations: { orderBy: { updatedAt: "desc" }, take: 1, select: { resume: true } },
        _count: { select: { simulations: true } },
      },
    })
    const conseillers = u.admin
      ? await db.user.findMany({ where: { clients: { some: {} } }, orderBy: { name: "asc" }, select: { id: true, name: true } })
      : []
    return NextResponse.json({
      admin: u.admin,
      conseillers,
      clients: clients.map((c) => ({
        id: c.id, nom: c.nom, prenom: c.prenom, nom2: c.nom2, prenom2: c.prenom2, email: c.email, telephone: c.telephone, statut: c.statut,
        conseiller: c.owner?.name ?? null, nbSimulations: c._count.simulations, majLe: c.updatedAt,
        resume: c.simulations[0]?.resume ?? null,
      })),
    })
  })
}

export function POST(request: Request) {
  return traiter(async () => {
    const u = await utilisateur(request, true)
    const b = await lireJson(request)
    const nom = texte(b.nom, 100)
    if (!nom) throw new ErreurApi(400, "Le nom du client est obligatoire.")
    const client = await db.client.create({
      data: { nom, prenom: texte(b.prenom, 100), nom2: texte(b.nom2, 100), prenom2: texte(b.prenom2, 100), civilite: texte(b.civilite, 40), secteur: texte(b.secteur, 120), email: texte(b.email, 200), telephone: texte(b.telephone, 40), notes: texte(b.notes, 5000), ownerId: u.id },
    })
    return NextResponse.json({ client }, { status: 201 })
  })
}
