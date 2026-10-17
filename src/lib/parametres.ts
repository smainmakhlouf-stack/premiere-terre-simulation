/**
 * Paramètres de l'équipe : valeurs d'exemple tant que l'administrateur ne les a pas enregistrées.
 * Taux en % annuels ; assurance en % annuel du capital initial, par emprunteur ; frais de garantie
 * et de courtage en % du montant emprunté.
 */
/** Organismes de garantie (mêmes clés que le diagnostic détaillé). Coût total en % du capital garanti. */
export const GARANTIES: { cle: string; nom: string; defaut: number }[] = [
  { cle: "cl_classic", nom: "Crédit Logement · Classic", defaut: 1.2 },
  { cle: "cl_initio", nom: "Crédit Logement · Initio", defaut: 1.0 },
  { cle: "saccef", nom: "SACCEF", defaut: 1.1 },
  { cle: "camca", nom: "CAMCA", defaut: 1.0 },
  { cle: "cmh", nom: "CMH", defaut: 0.9 },
  { cle: "socami", nom: "SOCAMI", defaut: 1.0 },
  { cle: "cnp", nom: "CNP Caution", defaut: 1.2 },
  { cle: "casden", nom: "CASDEN", defaut: 0.3 },
  { cle: "bred", nom: "BRED Habitat", defaut: 1.0 },
  { cle: "mutual", nom: "Caution mutuelle / employeur", defaut: 0.8 },
  { cle: "simple", nom: "Caution simple", defaut: 0.5 },
  { cle: "hyp", nom: "Hypothèque conventionnelle", defaut: 1.5 },
  { cle: "legal", nom: "Hypothèque légale spéciale (prêteur de deniers)", defaut: 1.0 },
  { cle: "rank2", nom: "Hypothèque 2e rang", defaut: 1.5 },
  { cle: "rank3", nom: "Hypothèque 3e rang", defaut: 1.5 },
  { cle: "pledge", nom: "Nantissement / gage", defaut: 0.3 },
  { cle: "other", nom: "Autre garantie", defaut: 1.0 },
]

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
  },
  garanties: Object.fromEntries(GARANTIES.map((g) => [g.cle, g.defaut])) as Record<string, number>,
  seuils: { endettement: 35, resteAdulte: 800, resteEnfant: 300, apportMin: 10 },
  /** Valeurs proposées sur les écrans (toujours modifiables par le vendeur). */
  defauts: { taux: 3.6, assurance: 0.3, zone: "A" },
  /** Plafonds de loyer 2026, €/m²/mois hors charges, avant coefficient de surface. */
  plafondsLoyer: {
    intermediaire: { Abis: 19.71, A: 14.64, B1: 11.8, B2: 10.26, C: 10.26 },
    social: { Abis: 13.78, A: 10.6, B1: 9.13, B2: 8.76, C: 8.13 },
    tres_social: { Abis: 10.74, A: 8.27, B1: 7.11, B2: 6.81, C: 6.32 },
  },
  /** Mentions imprimées en pied des documents client. */
  mentions: { raisonSociale: "", orias: "", adresse: "", complement: "" },
}

export const ZONES = ["Abis", "A", "B1", "B2", "C"] as const

export type Parametres = typeof PARAMETRES_DEFAUT

const nombre = (v: unknown, defaut: number, max = 1e7) => {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n * 1000) / 1000 : defaut
}
const objet = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {})
const texte = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "")

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
  const f = objet(b.frais), s = objet(b.seuils), gar = objet(b.garanties)
  // Anciens enregistrements : trois taux (Crédit Logement, cautions, hypothèque) servent de point de départ.
  const ancien = (cle: string) => {
    if (cle.startsWith("cl_")) return f.garantieCreditLogement
    if (["hyp", "rank2", "rank3"].includes(cle)) return f.garantieHypotheque
    return ["legal", "pledge", "casden", "simple"].includes(cle) ? undefined : f.garantieCaution
  }
  const df = objet(b.defauts), pl = objet(b.plafondsLoyer), me = objet(b.mentions)
  const plafonds = Object.fromEntries(Object.entries(D.plafondsLoyer).map(([niveau, zones]) => {
    const n = objet(pl[niveau])
    return [niveau, Object.fromEntries(Object.entries(zones).map(([z, v]) => [z, nombre(n[z], v, 100)]))]
  })) as Parametres["plafondsLoyer"]
  return {
    defauts: {
      taux: nombre(df.taux, D.defauts.taux, 20),
      assurance: nombre(df.assurance, D.defauts.assurance, 5),
      zone: ZONES.includes(df.zone as (typeof ZONES)[number]) ? (df.zone as string) : D.defauts.zone,
    },
    plafondsLoyer: plafonds,
    mentions: {
      raisonSociale: texte(me.raisonSociale, 120),
      orias: texte(me.orias, 40),
      adresse: texte(me.adresse, 200),
      complement: texte(me.complement, 600),
    },
    taux: taux.length ? taux : D.taux,
    assurance: {
      tranches: D.assurance.tranches.map((d, i) => ({ jusqua: d.jusqua, taux: nombre(objet(tr[i]).taux, d.taux, 10) })),
      quotiteCouple: nombre(a.quotiteCouple, D.assurance.quotiteCouple, 100),
    },
    frais: Object.fromEntries(Object.entries(D.frais).map(([k, v]) => [k, nombre(f[k], v, k === "dossier" ? 1e6 : 100)])) as Parametres["frais"],
    garanties: Object.fromEntries(GARANTIES.map((g) => [g.cle, nombre(gar[g.cle] ?? ancien(g.cle), g.defaut, 20)])),
    seuils: {
      endettement: nombre(s.endettement, D.seuils.endettement, 100),
      resteAdulte: nombre(s.resteAdulte, D.seuils.resteAdulte, 1e5),
      resteEnfant: nombre(s.resteEnfant, D.seuils.resteEnfant, 1e5),
      apportMin: nombre(s.apportMin, D.seuils.apportMin, 100),
    },
  }
}
