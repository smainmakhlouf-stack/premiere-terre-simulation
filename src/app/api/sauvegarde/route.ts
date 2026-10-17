import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { ErreurApi, lireJson, traiter, utilisateur } from "@/lib/api"
import { STATUTS, filtreClients } from "@/lib/dossiers"
import { construireSauvegarde, nomFichier } from "@/lib/sauvegarde"

export const dynamic = "force-dynamic"

/**
 * Sauvegarde page par page (25 dossiers) : le simulateur assemble les pages puis télécharge le fichier,
 * ce qui évite la limite de taille des réponses serveur. Administrateur : tous les dossiers ; vendeur : les siens.
 */
const PAGE = 25
export function GET(request: Request) {
  return traiter(async () => {
    const u = await utilisateur(request)
    const page = Math.max(0, Math.floor(Number(new URL(request.url).searchParams.get("page")) || 0))
    const total = await db.client.count({ where: filtreClients(u) })
    const sauvegarde = await construireSauvegarde(filtreClients(u), u.name, { skip: page * PAGE, take: PAGE })
    return NextResponse.json({ ...sauvegarde, page, nbPages: Math.ceil(total / PAGE), nbClientsTotal: total, nomFichier: nomFichier() }, { headers: { "Cache-Control": "private, no-store" } })
  })
}

const chaine = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null)
const dateOu = (v: unknown) => { const d = new Date(String(v)); return Number.isNaN(d.getTime()) ? undefined : d }

/**
 * Restauration d'un dossier issu d'une sauvegarde (administrateurs). Le simulateur envoie les dossiers
 * un par un. Rien n'est écrasé : un dossier ou une simulation déjà présents (même identifiant) sont ignorés.
 */
export function POST(request: Request) {
  return traiter(async () => {
    const u = await utilisateur(request, true)
    if (!u.admin) throw new ErreurApi(403, "Seuls les administrateurs peuvent restaurer une sauvegarde.")
    const c = (await lireJson(request)).client as Record<string, unknown> | undefined
    const id = chaine(c?.id, 60), nom = chaine(c?.nom, 100)
    if (!c || !id || !nom) throw new ErreurApi(400, "Dossier invalide dans la sauvegarde.")
    const conseiller = chaine(c.conseiller, 200)
    const owner = conseiller ? await db.user.findUnique({ where: { email: conseiller }, select: { id: true } }) : null
    let clientCree = false
    if (!(await db.client.findUnique({ where: { id }, select: { id: true } }))) {
      await db.client.create({
        data: {
          id, nom, prenom: chaine(c.prenom, 100), nom2: chaine(c.nom2, 100), prenom2: chaine(c.prenom2, 100), civilite: chaine(c.civilite, 40), secteur: chaine(c.secteur, 120), email: chaine(c.email, 200), telephone: chaine(c.telephone, 40), notes: chaine(c.notes, 5000),
          statut: STATUTS.includes(c.statut as (typeof STATUTS)[number]) ? (c.statut as string) : "en_cours",
          ownerId: owner?.id ?? u.id, createdAt: dateOu(c.creeLe),
        },
      })
      clientCree = true
    }
    let simulations = 0
    for (const s of Array.isArray(c.simulations) ? (c.simulations as Record<string, unknown>[]) : []) {
      const sid = chaine(s?.id, 60)
      if (!sid || !s.data || typeof s.data !== "object") continue
      if (await db.simulation.findUnique({ where: { id: sid }, select: { id: true } })) continue
      const auteur = chaine(s.auteur, 200)
      const a = auteur ? await db.user.findUnique({ where: { email: auteur }, select: { id: true } }) : null
      await db.simulation.create({
        data: {
          id: sid, clientId: id, nom: chaine(s.nom, 120) ?? "Simulation", data: s.data as Prisma.InputJsonValue,
          resume: s.resume && typeof s.resume === "object" ? (s.resume as Prisma.InputJsonValue) : undefined,
          authorId: a?.id ?? null, createdAt: dateOu(s.creeLe),
        },
      })
      simulations++
    }
    return NextResponse.json({ clientCree, simulations })
  })
}
