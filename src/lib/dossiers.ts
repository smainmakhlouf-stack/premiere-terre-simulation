import { db } from "./db"
import { ErreurApi, type Utilisateur } from "./api"

/** Un vendeur ne voit que ses clients ; un administrateur les voit tous. */
export const filtreClients = (u: Utilisateur) => (u.admin ? {} : { ownerId: u.id })

export async function clientAutorise(u: Utilisateur, id: string) {
  const client = await db.client.findFirst({ where: { id, ...filtreClients(u) } })
  if (!client) throw new ErreurApi(404, "Dossier introuvable.")
  return client
}

export async function simulationAutorisee(u: Utilisateur, id: string) {
  const sim = await db.simulation.findFirst({ where: { id, client: filtreClients(u) }, include: { client: { select: { id: true, nom: true, prenom: true } } } })
  if (!sim) throw new ErreurApi(404, "Simulation introuvable.")
  return sim
}
