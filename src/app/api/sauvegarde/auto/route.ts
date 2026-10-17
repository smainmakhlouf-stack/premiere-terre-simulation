import { NextResponse } from "next/server"
import { gzipSync } from "node:zlib"
import { db } from "@/lib/db"
import { envoyerSauvegarde } from "@/lib/email"
import { construireSauvegarde, nomFichier } from "@/lib/sauvegarde"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Sauvegarde automatique hebdomadaire (tâche planifiée Vercel, voir vercel.json) : tous les dossiers,
 * compressés et envoyés par e-mail aux administrateurs. Vercel appelle cette adresse avec
 * « Authorization: Bearer CRON_SECRET » ; sans ce secret configuré, l'adresse est fermée.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Non autorisé." }, { status: 401 })
  }
  try {
    const sauvegarde = await construireSauvegarde({}, "sauvegarde automatique")
    const admins = await db.user.findMany({ where: { role: "admin", banned: { not: true } }, select: { email: true } })
    if (!admins.length) return NextResponse.json({ message: "Aucun administrateur." }, { status: 200 })
    const fichier = gzipSync(Buffer.from(JSON.stringify(sauvegarde)))
    await envoyerSauvegarde(admins.map((a) => a.email), nomFichier() + ".gz", fichier, sauvegarde.nbClients, sauvegarde.nbSimulations)
    return NextResponse.json({ ok: true, clients: sauvegarde.nbClients, simulations: sauvegarde.nbSimulations, octets: fichier.length })
  } catch (e) {
    console.error("[sauvegarde auto]", e)
    return NextResponse.json({ message: "Échec de la sauvegarde." }, { status: 500 })
  }
}
