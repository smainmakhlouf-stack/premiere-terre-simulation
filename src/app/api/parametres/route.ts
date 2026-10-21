import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { ErreurApi, lireJson, traiter, utilisateur } from "@/lib/api"
import { GARANTIES, horodater, normaliser, rappels, type MisesAJour } from "@/lib/parametres"
import { tauxUsure } from "@/lib/usure"

export const dynamic = "force-dynamic"

export function GET(request: Request) {
  return traiter(async () => {
    const u = await utilisateur(request)
    const ligne = await db.parametres.findUnique({ where: { id: "equipe" } })
    const m = (ligne?.misesAJour ?? {}) as MisesAJour
    const usure = await tauxUsure()
    return NextResponse.json({
      usure,
      admin: u.admin, parametres: normaliser(ligne?.data), garanties: GARANTIES.map(({ cle, nom }) => ({ cle, nom })),
      majLe: ligne?.updatedAt ?? null, majPar: ligne?.majPar ?? null, misesAJour: m,
      rappels: u.admin ? rappels(m, ligne?.updatedAt ?? null) : [],
    })
  })
}

export function PUT(request: Request) {
  return traiter(async () => {
    const u = await utilisateur(request, true)
    if (!u.admin) throw new ErreurApi(403, "Seuls les administrateurs peuvent modifier les paramètres.")
    const b = await lireJson(request)
    const nouveaux = normaliser(b.parametres)
    const avant = await db.parametres.findUnique({ where: { id: "equipe" } })
    // « Confirmer que c'est à jour » : la rubrique est datée du jour même si les valeurs n'ont pas changé.
    const confirmees = Array.isArray(b.confirmer) ? b.confirmer.filter((k): k is keyof typeof nouveaux => typeof k === "string" && k in nouveaux) : []
    const misesAJour = { ...horodater(avant ? normaliser(avant.data) : null, nouveaux, avant?.misesAJour), ...Object.fromEntries(confirmees.map((k) => [k, new Date().toISOString()])) } as Prisma.InputJsonValue
    const data = nouveaux as unknown as Prisma.InputJsonValue
    const ligne = await db.parametres.upsert({
      where: { id: "equipe" },
      create: { id: "equipe", data, majPar: u.name, misesAJour },
      update: { data, majPar: u.name, misesAJour },
    })
    const m = (ligne.misesAJour ?? {}) as MisesAJour
    return NextResponse.json({ parametres: normaliser(ligne.data), majLe: ligne.updatedAt, majPar: ligne.majPar, misesAJour: m, rappels: rappels(m, ligne.updatedAt) })
  })
}
