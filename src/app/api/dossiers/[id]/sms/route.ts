import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { ErreurApi, lireJson, traiter, utilisateur } from "@/lib/api"
import { clientAutorise } from "@/lib/dossiers"
import { envoyerSms, horsPlage, mobileFR } from "@/lib/sms"

export const dynamic = "force-dynamic"

/** SMS de relance au client du dossier ; un seul par client sur 20 heures (pas de double envoi le même jour). */
export function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return traiter(async () => {
    const u = await utilisateur(request, true)
    const { id } = await params
    const client = await clientAutorise(u, id)
    const texte = String((await lireJson(request)).texte ?? "").replace(/\s+\n/g, "\n").trim()
    if (texte.length < 20) throw new ErreurApi(400, "Message trop court.")
    if (texte.length > 640) throw new ErreurApi(400, "Message trop long (640 caractères maximum).")
    const gsm = mobileFR(client.telephone)
    if (!gsm) throw new ErreurApi(400, "Le téléphone du client n'est pas un mobile français (06 ou 07).")
    const plage = horsPlage()
    if (plage) throw new ErreurApi(400, plage)
    const deja = await db.smsEnvoi.findFirst({ where: { clientId: id, statut: "envoye", createdAt: { gte: new Date(Date.now() - 20 * 3600000) } } })
    if (deja) throw new ErreurApi(409, "Un SMS a déjà été envoyé à ce client aujourd'hui.")
    const erreur = await envoyerSms(gsm, texte)
    const envoi = await db.smsEnvoi.create({
      data: { clientId: id, auteurNom: u.name, telephone: client.telephone ?? gsm, texte, statut: erreur ? "echec" : "envoye", erreur },
    })
    if (erreur) throw new ErreurApi(502, erreur)
    await db.client.update({ where: { id }, data: { updatedAt: new Date() } })
    return NextResponse.json({ envoi })
  })
}
