import { NextResponse } from "next/server"
import { getSession } from "./session"

export type Utilisateur = { id: string; name: string; admin: boolean }

export class ErreurApi extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export const erreur = (status: number, message: string) => NextResponse.json({ message }, { status })

/**
 * Session obligatoire. Pour les écritures, l'en-tête Origin doit correspondre au site : une page
 * d'un autre site ne peut pas modifier les dossiers à l'insu du vendeur connecté.
 */
export async function utilisateur(request: Request, ecriture = false): Promise<Utilisateur> {
  if (ecriture) {
    const origin = request.headers.get("origin")
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
    if (!origin || !host || new URL(origin).host !== host) throw new ErreurApi(403, "Requête refusée.")
  }
  const session = await getSession()
  if (!session) throw new ErreurApi(401, "Session expirée : reconnectez-vous.")
  return { id: session.user.id, name: session.user.name, admin: session.user.role === "admin" }
}

/** Exécute le traitement et transforme les erreurs en réponse JSON lisible par le simulateur. */
export async function traiter(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn()
  } catch (e) {
    if (e instanceof ErreurApi) return erreur(e.status, e.message)
    console.error("[api]", e)
    return erreur(500, "Erreur serveur, réessayez.")
  }
}

export async function lireJson(request: Request): Promise<Record<string, unknown>> {
  const texte = await request.text()
  // Une simulation complète pèse quelques dizaines de Ko : 2 Mo laisse une large marge.
  if (texte.length > 2_000_000) throw new ErreurApi(413, "Simulation trop volumineuse.")
  try {
    const v = JSON.parse(texte)
    if (v && typeof v === "object" && !Array.isArray(v)) return v
  } catch {}
  throw new ErreurApi(400, "Données invalides.")
}

/** Texte facultatif nettoyé et borné ; chaîne vide -> null. */
export function texte(v: unknown, max = 200): string | null {
  if (typeof v !== "string") return null
  const t = v.trim().slice(0, max)
  return t || null
}
