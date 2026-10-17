import type { Prisma } from "@prisma/client"
import { db } from "./db"

/**
 * Sauvegarde des dossiers clients au format JSON : coordonnées, statut et simulations complètes
 * (l'historique des versions n'est pas inclus). Réimportable depuis la fenêtre « Dossier client ».
 */
export async function construireSauvegarde(where: Prisma.ClientWhereInput, par: string, page?: { skip: number; take: number }) {
  const clients = await db.client.findMany({
    where,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    ...(page ?? {}),
    include: {
      owner: { select: { email: true } },
      simulations: { orderBy: { createdAt: "asc" }, include: { author: { select: { email: true } } } },
    },
  })
  return {
    format: "ptf-sauvegarde",
    version: 1,
    exporteLe: new Date().toISOString(),
    par,
    nbClients: clients.length,
    nbSimulations: clients.reduce((s, c) => s + c.simulations.length, 0),
    clients: clients.map((c) => ({
      id: c.id, nom: c.nom, prenom: c.prenom, nom2: c.nom2, prenom2: c.prenom2, civilite: c.civilite, secteur: c.secteur, email: c.email, telephone: c.telephone, notes: c.notes, statut: c.statut,
      conseiller: c.owner?.email ?? null, creeLe: c.createdAt, majLe: c.updatedAt,
      simulations: c.simulations.map((s) => ({
        id: s.id, nom: s.nom, data: s.data, resume: s.resume, auteur: s.author?.email ?? null, creeLe: s.createdAt, majLe: s.updatedAt,
      })),
    })),
  }
}

export const nomFichier = () => `sauvegarde-premiere-terre-${new Date().toISOString().slice(0, 10)}.json`
