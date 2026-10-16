import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { ErreurApi, lireJson, texte, traiter, utilisateur } from "@/lib/api"
import { clientAutorise } from "@/lib/dossiers"

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
        simulations: { orderBy: { updatedAt: "desc" }, select: { id: true, nom: true, createdAt: true, updatedAt: true, author: { select: { name: true } } } },
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
    const nom = texte(b.nom, 100)
    if (!nom) throw new ErreurApi(400, "Le nom du client est obligatoire.")
    const client = await db.client.update({
      where: { id },
      data: { nom, prenom: texte(b.prenom, 100), email: texte(b.email, 200), telephone: texte(b.telephone, 40), notes: texte(b.notes, 5000) },
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
