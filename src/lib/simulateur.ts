import { readFile, readdir } from "node:fs/promises"
import { join } from "node:path"

let cache: string | null = null

/**
 * Le simulateur est découpé par module dans private/simulateur/ (01-…, 02-…) : les morceaux sont
 * assemblés dans l'ordre des noms pour former la page.
 */
export async function pageSimulateur() {
  if (!cache) {
    const dossier = join(process.cwd(), "private/simulateur")
    const fichiers = (await readdir(dossier)).filter((f) => f.endsWith(".html")).sort()
    cache = (await Promise.all(fichiers.map((f) => readFile(join(dossier, f), "utf8")))).join("")
  }
  return cache
}
