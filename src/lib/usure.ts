// Taux d'usure des crédits immobiliers, publiés chaque trimestre par la Banque de France
// (page « Taux d'usure - AAAA-Qn »). Lus côté serveur, mis en cache une journée ; si la page
// est injoignable ou change de forme, les derniers taux connus ci-dessous servent de repli.

export type TauxUsure = {
  /** "2026-Q4" : trimestre d'application. */
  trimestre: string
  moins10: number
  de10a20: number
  plus20: number
  variable: number
  relais: number
  source: "banque-de-france" | "repli"
  url: string
}

const PAGE = (t: string) => `https://www.banque-france.fr/fr/statistiques/taux-et-cours/taux-dusure-${t.toLowerCase()}`

/** Derniers taux relevés (applicables au 1er octobre 2026). */
export const USURE_REPLI: TauxUsure = {
  trimestre: "2026-Q4", moins10: 4.09, de10a20: 4.68, plus20: 5.4, variable: 5.52, relais: 6.49,
  source: "repli", url: PAGE("2026-Q4"),
}

/** Trimestre en vigueur, puis le précédent si sa page n'est pas encore lisible. */
export function trimestres(date = new Date()): string[] {
  const y = date.getFullYear(), q = Math.floor(date.getMonth() / 3) + 1
  const precedent = q === 1 ? `${y - 1}-Q4` : `${y}-Q${q - 1}`
  return [`${y}-Q${q}`, precedent]
}

const texte = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/&#0?39;|&rsquo;|’/g, "'").replace(/&nbsp;| /g, " ").replace(/&eacute;/gi, "é").replace(/\s+/g, " ")

/** Extrait les taux d'usure (2e colonne) des crédits immobiliers aux particuliers. */
export function lireTableau(html: string): Omit<TauxUsure, "trimestre" | "source" | "url"> | null {
  const t = texte(html)
  const debut = t.search(/CR[ÉE]DITS IMMOBILIERS/i)
  if (debut < 0) return null
  const fin = t.slice(debut).search(/personnes morales/i)
  const bloc = fin > 0 ? t.slice(debut, debut + fin) : t.slice(debut, debut + 2000)
  const usure = (re: RegExp) => {
    const m = bloc.match(new RegExp(re.source + String.raw`\s*\|?\s*(\d+,\d+)\s*\|?\s*(\d+,\d+)`, "i"))
    return m ? Number(m[2].replace(",", ".")) : NaN
  }
  const r = {
    moins10: usure(/dur[ée]e inf[ée]rieure [àa] 10 ans/),
    de10a20: usure(/entre 10 ans et moins de 20 ans/),
    plus20: usure(/dur[ée]e de 20 ans et plus/),
    variable: usure(/taux variable/),
    relais: usure(/Pr[êe]ts relais/),
  }
  // Garde-fou : des taux d'usure immobiliers plausibles, sinon la page a changé de forme.
  return Object.values(r).every((v) => Number.isFinite(v) && v > 0.5 && v < 25) ? r : null
}

let cache: { le: number; v: TauxUsure } | null = null

export async function tauxUsure(): Promise<TauxUsure> {
  if (cache && Date.now() - cache.le < 12 * 3600e3) return cache.v
  for (const t of trimestres()) {
    try {
      const r = await fetch(PAGE(t), { signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } })
      if (!r.ok) continue
      const lu = lireTableau(await r.text())
      if (lu) {
        cache = { le: Date.now(), v: { ...lu, trimestre: t, source: "banque-de-france", url: PAGE(t) } }
        return cache.v
      }
    } catch (e) {
      console.error("[usure]", t, e)
    }
  }
  return USURE_REPLI
}

/** Taux d'usure applicable à un prêt à taux fixe selon sa durée. */
export function usurePourDuree(u: Pick<TauxUsure, "moins10" | "de10a20" | "plus20">, ans: number) {
  return ans < 10 ? u.moins10 : ans < 20 ? u.de10a20 : u.plus20
}
