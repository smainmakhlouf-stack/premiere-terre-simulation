import { NextResponse } from "next/server"
import { ErreurApi, texte, traiter, utilisateur } from "@/lib/api"
import { getSession } from "@/lib/session"
import { envoyerEtudeClient } from "@/lib/email"

export const dynamic = "force-dynamic"

const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/
// Garde-fou contre un envoi en boucle (quota Resend : 100 e-mails par jour sur l'offre gratuite).
const LIMITE_HEURE = 20
const envois = new Map<string, number[]>()

/** Envoi de l'étude de financement (PDF généré dans le navigateur) au client, vendeur en copie. */
export function POST(request: Request) {
  return traiter(async () => {
    const u = await utilisateur(request, true)
    const session = await getSession()
    const vendeurEmail = session?.user.email
    if (!vendeurEmail) throw new ErreurApi(401, "Session expirée : reconnectez-vous.")

    const brut = await request.text()
    if (brut.length > 14_000_000) throw new ErreurApi(413, "PDF trop volumineux pour un e-mail (10 Mo maximum).")
    let b: Record<string, unknown>
    try { b = JSON.parse(brut) } catch { throw new ErreurApi(400, "Données invalides.") }

    const to = texte(b.to, 200)?.toLowerCase()
    if (!to || !EMAIL.test(to)) throw new ErreurApi(400, "Adresse e-mail du client invalide.")
    const objet = texte(b.objet, 200)?.replace(/[\r\n]+/g, " ")
    if (!objet) throw new ErreurApi(400, "Objet manquant.")
    const message = texte(b.message, 6000)
    if (!message) throw new ErreurApi(400, "Message manquant.")
    const pdf = typeof b.pdf === "string" ? Buffer.from(b.pdf, "base64") : null
    if (!pdf || pdf.length < 1000 || pdf.subarray(0, 5).toString() !== "%PDF-") throw new ErreurApi(400, "PDF invalide.")
    const fichier = (texte(b.fichier, 150) || "Etude de financement.pdf").replace(/[^\w .,'()-]/g, "").replace(/(\.pdf)?$/i, ".pdf")

    const maintenant = Date.now()
    const recents = (envois.get(u.id) || []).filter(t => maintenant - t < 3_600_000)
    if (recents.length >= LIMITE_HEURE) throw new ErreurApi(429, "Trop d'envois en une heure : réessayez plus tard.")

    try {
      await envoyerEtudeClient({ to, vendeurNom: u.name, vendeurEmail, objet, message, fichier, pdf })
    } catch (e) {
      throw new ErreurApi(502, e instanceof Error ? e.message : "Échec de l'envoi de l'e-mail.")
    }
    envois.set(u.id, [...recents, maintenant])
    return NextResponse.json({ ok: true, copie: vendeurEmail })
  })
}
