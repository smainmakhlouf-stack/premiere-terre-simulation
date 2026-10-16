import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { ErreurApi, lireJson, traiter, utilisateur } from "@/lib/api"
import { GARANTIES, normaliser } from "@/lib/parametres"

export const dynamic = "force-dynamic"

export function GET(request: Request) {
  return traiter(async () => {
    const u = await utilisateur(request)
    const ligne = await db.parametres.findUnique({ where: { id: "equipe" } })
    return NextResponse.json({ admin: u.admin, parametres: normaliser(ligne?.data), garanties: GARANTIES.map(({ cle, nom }) => ({ cle, nom })), majLe: ligne?.updatedAt ?? null, majPar: ligne?.majPar ?? null })
  })
}

export function PUT(request: Request) {
  return traiter(async () => {
    const u = await utilisateur(request, true)
    if (!u.admin) throw new ErreurApi(403, "Seuls les administrateurs peuvent modifier les paramètres.")
    const data = normaliser((await lireJson(request)).parametres) as unknown as Prisma.InputJsonValue
    const ligne = await db.parametres.upsert({
      where: { id: "equipe" },
      create: { id: "equipe", data, majPar: u.name },
      update: { data, majPar: u.name },
    })
    return NextResponse.json({ parametres: normaliser(ligne.data), majLe: ligne.updatedAt, majPar: ligne.majPar })
  })
}
