import type { Prisma } from "@prisma/client"
import { db } from "./db"

const MAX_VERSIONS = 30
// L'enregistrement automatique (toutes les 30 s) ne crée pas une version à chaque fois :
// pendant 15 min, les modifications d'un même auteur complètent la dernière version.
const FUSION_MS = 15 * 60 * 1000

/** Chiffres clés envoyés par le simulateur ; tout autre champ est ignoré. */
export function resume(v: unknown): Prisma.InputJsonValue | undefined {
  if (!v || typeof v !== "object") return undefined
  const o = v as Record<string, unknown>
  const r: Record<string, number | string> = {}
  for (const k of ["budget", "revenus", "prix", "emprunte", "mensualite", "endettement"]) {
    const n = Number(o[k])
    if (Number.isFinite(n) && n >= 0 && n < 1e9) r[k] = Math.round(n)
  }
  if (o.type === "neuf" || o.type === "ancien") r.type = o.type
  return r
}

export type Action = "creation" | "modification" | "restauration" | "duplication"

export async function enregistrerVersion(
  simulationId: string,
  v: { nom: string; data: Prisma.InputJsonValue; resume?: Prisma.InputJsonValue | null },
  action: Action,
  auteurNom: string,
) {
  const derniere = await db.simulationVersion.findFirst({ where: { simulationId }, orderBy: { createdAt: "desc" } })
  const contenu = { nom: v.nom, data: v.data, resume: v.resume ?? undefined }
  if (
    action === "modification" && derniere && derniere.auteurNom === auteurNom &&
    ["modification", "creation"].includes(derniere.action) && Date.now() - derniere.createdAt.getTime() < FUSION_MS
  ) {
    await db.simulationVersion.update({ where: { id: derniere.id }, data: contenu })
    return
  }
  await db.simulationVersion.create({ data: { simulationId, action, auteurNom, ...contenu } })
  const anciennes = await db.simulationVersion.findMany({
    where: { simulationId }, orderBy: { createdAt: "desc" }, skip: MAX_VERSIONS, select: { id: true },
  })
  if (anciennes.length) await db.simulationVersion.deleteMany({ where: { id: { in: anciennes.map((a) => a.id) } } })
}
