/**
 * Paramètres de l'équipe : valeurs d'exemple tant que l'administrateur ne les a pas enregistrées.
 * Taux en % annuels ; assurance en % annuel du capital initial, par emprunteur ; frais de garantie
 * et de courtage en % du montant emprunté.
 */
export const PARAMETRES_DEFAUT = {
  taux: [{ nom: "Grille équipe", t10: 3.0, t15: 3.1, t20: 3.2, t25: 3.35 }],
  assurance: {
    tranches: [
      { jusqua: 29, taux: 0.1 },
      { jusqua: 39, taux: 0.15 },
      { jusqua: 49, taux: 0.25 },
      { jusqua: 59, taux: 0.4 },
      { jusqua: 120, taux: 0.6 },
    ],
    quotiteCouple: 100,
  },
  frais: {
    notaireNeuf: 2.5,
    notaireAncien: 7.5,
    dossier: 1000,
    courtagePct: 1,
    garantieCreditLogement: 1.2,
    garantieCaution: 1,
    garantieHypotheque: 1.5,
  },
  seuils: { endettement: 35, resteAdulte: 800, resteEnfant: 300, apportMin: 10 },
}

export type Parametres = typeof PARAMETRES_DEFAUT

const nombre = (v: unknown, defaut: number, max = 1e7) => {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n * 1000) / 1000 : defaut
}
const objet = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {})

/** Valide et complète des paramètres reçus (ou stockés) ; tout champ invalide reprend la valeur par défaut. */
export function normaliser(brut: unknown): Parametres {
  const b = objet(brut)
  const D = PARAMETRES_DEFAUT
  const taux = Array.isArray(b.taux) ? b.taux.slice(0, 20).map((l) => {
    const o = objet(l)
    return {
      nom: (typeof o.nom === "string" && o.nom.trim().slice(0, 60)) || "Banque",
      t10: nombre(o.t10, D.taux[0].t10, 20), t15: nombre(o.t15, D.taux[0].t15, 20),
      t20: nombre(o.t20, D.taux[0].t20, 20), t25: nombre(o.t25, D.taux[0].t25, 20),
    }
  }) : D.taux
  const a = objet(b.assurance)
  const tr = Array.isArray(a.tranches) && a.tranches.length === D.assurance.tranches.length ? a.tranches : D.assurance.tranches
  const f = objet(b.frais), s = objet(b.seuils)
  return {
    taux: taux.length ? taux : D.taux,
    assurance: {
      tranches: D.assurance.tranches.map((d, i) => ({ jusqua: d.jusqua, taux: nombre(objet(tr[i]).taux, d.taux, 10) })),
      quotiteCouple: nombre(a.quotiteCouple, D.assurance.quotiteCouple, 100),
    },
    frais: Object.fromEntries(Object.entries(D.frais).map(([k, v]) => [k, nombre(f[k], v, k === "dossier" ? 1e6 : 100)])) as Parametres["frais"],
    seuils: {
      endettement: nombre(s.endettement, D.seuils.endettement, 100),
      resteAdulte: nombre(s.resteAdulte, D.seuils.resteAdulte, 1e5),
      resteEnfant: nombre(s.resteEnfant, D.seuils.resteEnfant, 1e5),
      apportMin: nombre(s.apportMin, D.seuils.apportMin, 100),
    },
  }
}
