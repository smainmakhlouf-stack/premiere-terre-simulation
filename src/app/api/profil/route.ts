import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { ErreurApi, lireJson, texte, traiter, utilisateur } from "@/lib/api"

export const dynamic = "force-dynamic"

/** Profil du conseiller connecté (nom et téléphone repris dans les SMS). */
export function GET(request: Request) {
  return traiter(async () => {
    const u = await utilisateur(request)
    const moi = await db.user.findUnique({ where: { id: u.id }, select: { name: true, telephone: true } })
    return NextResponse.json({ profil: moi })
  })
}

export function PATCH(request: Request) {
  return traiter(async () => {
    const u = await utilisateur(request, true)
    const tel = texte((await lireJson(request)).telephone, 30)
    if (tel && tel.replace(/\D/g, "").length < 9) throw new ErreurApi(400, "Numéro de téléphone invalide.")
    const moi = await db.user.update({ where: { id: u.id }, data: { telephone: tel }, select: { name: true, telephone: true } })
    return NextResponse.json({ profil: moi })
  })
}
