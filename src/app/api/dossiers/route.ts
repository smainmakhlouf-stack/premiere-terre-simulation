import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { ErreurApi, lireJson, texte, traiter, utilisateur } from "@/lib/api"
import { filtreClients } from "@/lib/dossiers"

export const dynamic = "force-dynamic"

export function GET(request: Request) {
  return traiter(async () => {
    const u = await utilisateur(request)
    const q = new URL(request.url).searchParams.get("q")?.trim()
    const recherche = q
      ? { OR: ["nom", "prenom", "email", "telephone"].map((champ) => ({ [champ]: { contains: q, mode: "insensitive" as const } })) }
      : {}
    const clients = await db.client.findMany({
      where: { ...filtreClients(u), ...recherche },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true, nom: true, prenom: true, email: true, telephone: true, updatedAt: true,
        owner: { select: { name: true } },
        _count: { select: { simulations: true } },
      },
    })
    return NextResponse.json({
      admin: u.admin,
      clients: clients.map((c) => ({
        id: c.id, nom: c.nom, prenom: c.prenom, email: c.email, telephone: c.telephone,
        conseiller: c.owner?.name ?? null, nbSimulations: c._count.simulations, majLe: c.updatedAt,
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
      data: { nom, prenom: texte(b.prenom, 100), email: texte(b.email, 200), telephone: texte(b.telephone, 40), notes: texte(b.notes, 5000), ownerId: u.id },
    })
    return NextResponse.json({ client }, { status: 201 })
  })
}
