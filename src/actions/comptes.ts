"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { randomBytes } from "node:crypto"
import { auth, echecsEnvoi, MARQUEUR_INVITATION } from "@/lib/auth"
import { db } from "@/lib/db"

export type Resultat = { ok: true; message: string } | { ok: false; message: string }

/** Mot de passe jetable : le vendeur choisit le sien via le lien reçu par e-mail. */
const motDePasseAleatoire = () => randomBytes(24).toString("base64url")

async function origine() {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https")
  return `${proto}://${host}`
}

async function envoyerInvitation(email: string) {
  echecsEnvoi.delete(email)
  await auth.api.requestPasswordReset({
    body: { email, redirectTo: `${await origine()}/nouveau-mot-de-passe?${MARQUEUR_INVITATION}` },
  })
  const echec = echecsEnvoi.get(email)
  echecsEnvoi.delete(email)
  if (echec) throw new Error(echec)
}

async function exigerAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || session.user.role !== "admin") throw new Error("Accès réservé à l'administrateur.")
  return session
}

function messageErreur(e: unknown, defaut: string) {
  const m = (e as { body?: { message?: string }; message?: string })?.body?.message ?? (e as Error)?.message ?? ""
  if (/already exists|déjà/i.test(m)) return "Un compte existe déjà avec cette adresse."
  if (/RESEND|e-mail/i.test(m)) return `L'e-mail n'a pas pu partir (${m}). Réessayez avec « Renvoyer le lien ».`
  return m || defaut
}

const nettoyer = (v: FormDataEntryValue | null) => String(v ?? "").trim()
const emailValide = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

/**
 * Premier compte (administrateur), possible seulement tant que la base est vide et uniquement
 * pour l'adresse ADMIN_EMAIL : quelqu'un qui tomberait sur /installation avant vous ne peut pas
 * s'approprier le site. Le mot de passe est choisi via le lien envoyé à cette adresse.
 */
export async function installerAdmin(_: Resultat | null, form: FormData): Promise<Resultat> {
  const name = nettoyer(form.get("name"))
  const email = nettoyer(form.get("email")).toLowerCase()
  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase()
  if (!adminEmail) return { ok: false, message: "La variable ADMIN_EMAIL n'est pas configurée sur Vercel." }
  if (!name || email !== adminEmail) return { ok: false, message: "Cette adresse n'est pas celle prévue pour l'administrateur." }
  if ((await db.user.count()) > 0) return { ok: false, message: "Le site est déjà installé. Utilisez la page de connexion." }

  try {
    // Appel serveur sans en-têtes : crée le compte sans ouvrir de session (signUpEmail connecterait
    // directement la personne qui remplit le formulaire, avant toute preuve qu'elle reçoit les e-mails).
    await auth.api.createUser({ body: { name, email, password: motDePasseAleatoire(), role: "admin" } })
    await envoyerInvitation(email)
  } catch (e) {
    return { ok: false, message: messageErreur(e, "Installation impossible.") }
  }
  return { ok: true, message: `Un e-mail vient d'être envoyé à ${email} pour choisir votre mot de passe.` }
}

export async function creerCompte(_: Resultat | null, form: FormData): Promise<Resultat> {
  const name = nettoyer(form.get("name"))
  const email = nettoyer(form.get("email")).toLowerCase()
  const role = form.get("role") === "admin" ? "admin" : "user"
  if (!name) return { ok: false, message: "Indiquez le nom." }
  if (!emailValide(email)) return { ok: false, message: "Adresse e-mail invalide." }

  try {
    await exigerAdmin()
    await auth.api.createUser({
      headers: await headers(),
      body: { name, email, password: motDePasseAleatoire(), role },
    })
  } catch (e) {
    return { ok: false, message: messageErreur(e, "Création impossible.") }
  }
  revalidatePath("/comptes")
  try {
    await envoyerInvitation(email)
  } catch (e) {
    return { ok: false, message: `Compte créé, mais ${messageErreur(e, "l'e-mail n'a pas pu partir.").replace(/^L'/, "l'")}` }
  }
  return { ok: true, message: `Compte créé. ${name} va recevoir un e-mail pour choisir son mot de passe.` }
}

export async function renvoyerInvitation(userId: string): Promise<Resultat> {
  try {
    await exigerAdmin()
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) return { ok: false, message: "Compte introuvable." }
    await envoyerInvitation(user.email)
    return { ok: true, message: `Lien envoyé à ${user.email}.` }
  } catch (e) {
    return { ok: false, message: messageErreur(e, "Envoi impossible.") }
  }
}

export async function changerStatut(userId: string, actif: boolean): Promise<Resultat> {
  try {
    const session = await exigerAdmin()
    if (session.user.id === userId) return { ok: false, message: "Vous ne pouvez pas désactiver votre propre compte." }
    if (actif) await auth.api.unbanUser({ headers: await headers(), body: { userId } })
    else await auth.api.banUser({ headers: await headers(), body: { userId } })
  } catch (e) {
    return { ok: false, message: messageErreur(e, "Modification impossible.") }
  }
  revalidatePath("/comptes")
  return { ok: true, message: actif ? "Compte réactivé." : "Compte désactivé : la personne est déconnectée et ne peut plus entrer." }
}

export async function changerRole(userId: string, role: "admin" | "user"): Promise<Resultat> {
  try {
    const session = await exigerAdmin()
    if (session.user.id === userId) return { ok: false, message: "Vous ne pouvez pas modifier votre propre rôle." }
    await auth.api.setRole({ headers: await headers(), body: { userId, role } })
  } catch (e) {
    return { ok: false, message: messageErreur(e, "Modification impossible.") }
  }
  revalidatePath("/comptes")
  return { ok: true, message: "Rôle modifié." }
}

export async function supprimerCompte(userId: string): Promise<Resultat> {
  try {
    const session = await exigerAdmin()
    if (session.user.id === userId) return { ok: false, message: "Vous ne pouvez pas supprimer votre propre compte." }
    await auth.api.removeUser({ headers: await headers(), body: { userId } })
  } catch (e) {
    return { ok: false, message: messageErreur(e, "Suppression impossible.") }
  }
  revalidatePath("/comptes")
  return { ok: true, message: "Compte supprimé." }
}
