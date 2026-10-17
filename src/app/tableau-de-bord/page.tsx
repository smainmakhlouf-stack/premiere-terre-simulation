import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/session"
import { rappels, type MisesAJour } from "@/lib/parametres"

export const dynamic = "force-dynamic"

const PERIODES = [7, 30, 90, 365] as const
const STATUT: Record<string, string> = { en_cours: "En cours", finance: "Financé", perdu: "Perdu" }
const eur = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? "—" : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n)
const jour = (d: Date) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d)
const moyenne = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null)
type Resume = { budget?: number; prix?: number; emprunte?: number; mensualite?: number }

export default async function TableauDeBord({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const session = await getSession()
  if (!session) redirect("/connexion")
  const admin = session.user.role === "admin"
  const choix = (await searchParams).periode
  const periode = PERIODES.find((p) => String(p) === choix) ?? 30
  const depuis = new Date(Date.now() - periode * 86400000)
  const semaine = new Date(Date.now() - 7 * 86400000)
  const perimetre = admin ? {} : { ownerId: session.user.id }

  const [clients, sims, recents, params] = await Promise.all([
    db.client.findMany({ where: perimetre, select: { id: true, statut: true, createdAt: true, updatedAt: true, ownerId: true } }),
    db.simulation.findMany({ where: { updatedAt: { gte: depuis }, client: perimetre }, select: { createdAt: true, resume: true, authorId: true, clientId: true } }),
    db.client.findMany({
      where: { ...perimetre, updatedAt: { gte: semaine } }, orderBy: { updatedAt: "desc" }, take: 50,
      select: { id: true, nom: true, prenom: true, statut: true, updatedAt: true, owner: { select: { name: true } }, _count: { select: { simulations: true } }, simulations: { orderBy: { updatedAt: "desc" }, take: 1, select: { resume: true } } },
    }),
    admin ? db.parametres.findUnique({ where: { id: "equipe" } }) : null,
  ])
  const vendeurs = admin ? await db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, banned: true } }) : []

  const crees = clients.filter((c) => c.createdAt >= depuis)
  const simsCreees = sims.filter((s) => s.createdAt >= depuis)
  const budgets = sims.map((s) => (s.resume as Resume | null)?.budget).filter((b): b is number => !!b)
  const emprunts = sims.map((s) => (s.resume as Resume | null)?.emprunte).filter((b): b is number => !!b)
  const parStatut = (st: string) => clients.filter((c) => c.statut === st).length
  const clos = parStatut("finance") + parStatut("perdu")
  const transfo = clos ? Math.round((parStatut("finance") / clos) * 100) : null
  const alertes = admin ? rappels((params?.misesAJour ?? {}) as MisesAJour, params?.updatedAt ?? null) : []

  const lignesVendeurs = vendeurs.map((v) => {
    const cl = clients.filter((c) => c.ownerId === v.id)
    const si = sims.filter((s) => s.authorId === v.id)
    const b = si.map((s) => (s.resume as Resume | null)?.budget).filter((x): x is number => !!x)
    return {
      ...v, dossiers: cl.length, nouveaux: cl.filter((c) => c.createdAt >= depuis).length, simulations: si.length,
      budget: moyenne(b), finances: cl.filter((c) => c.statut === "finance").length, perdus: cl.filter((c) => c.statut === "perdu").length,
    }
  }).filter((v) => v.dossiers || v.simulations || !v.banned)

  return (
    <main className="admin" style={{ maxWidth: 1100 }}>
      <div className="admin-top">
        <h1>Tableau de bord{admin ? "" : " · mes dossiers"}</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PERIODES.map((p) => (
            <a key={p} className={`btn petit ${p === periode ? "" : "secondaire"}`} href={`/tableau-de-bord?periode=${p}`}>
              {p === 365 ? "12 mois" : `${p} jours`}
            </a>
          ))}
          <a className="btn secondaire petit" href="/">← Retour au simulateur</a>
        </div>
      </div>

      {alertes.length > 0 && (
        <div className="panneau" style={{ borderColor: "#e8c58a", background: "#fff8ec" }}>
          <h2 style={{ color: "#8a5a12" }}>Paramètres à mettre à jour</h2>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>{alertes.map((a) => <li key={a.rubrique}>{a.message}</li>)}</ul>
          <p style={{ fontSize: 12, color: "#7c7068", margin: "8px 0 0" }}>Dans le simulateur : accueil → Paramètres.</p>
        </div>
      )}

      <div className="kpis">
        <div className="kpi"><small>Nouveaux dossiers</small><b>{crees.length}</b><span>sur {periode === 365 ? "12 mois" : periode + " jours"}</span></div>
        <div className="kpi"><small>Simulations</small><b>{sims.length}</b><span>enregistrées ou modifiées · {simsCreees.length} nouvelles</span></div>
        <div className="kpi"><small>Budget moyen</small><b>{eur(moyenne(budgets))}</b><span>{budgets.length ? `sur ${budgets.length} simulation(s)` : "budget max non calculé"}</span></div>
        <div className="kpi"><small>Emprunt moyen</small><b>{eur(moyenne(emprunts))}</b><span>plans de financement</span></div>
        <div className="kpi"><small>Dossiers financés</small><b>{parStatut("finance")}</b><span>{transfo == null ? "aucun dossier clos" : `${transfo} % des dossiers clos`}</span></div>
        <div className="kpi"><small>En cours / perdus</small><b>{parStatut("en_cours")} / {parStatut("perdu")}</b><span>{clients.length} dossiers au total</span></div>
      </div>

      {admin && (
        <div className="panneau defile">
          <h2>Par vendeur</h2>
          <table className="tableau">
            <thead><tr><th>Vendeur</th><th>Dossiers</th><th>Nouveaux</th><th>Simulations</th><th>Budget moyen</th><th>Financés</th><th>Perdus</th></tr></thead>
            <tbody>
              {lignesVendeurs.map((v) => (
                <tr key={v.id}>
                  <td>{v.name}{v.banned ? <span className="pastille off" style={{ marginLeft: 6 }}>désactivé</span> : null}</td>
                  <td>{v.dossiers}</td><td>{v.nouveaux}</td><td>{v.simulations}</td><td>{eur(v.budget)}</td><td>{v.finances}</td><td>{v.perdus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="panneau defile">
        <h2>Dossiers de la semaine ({recents.length})</h2>
        {recents.length === 0 ? <p style={{ fontSize: 13, color: "#7c7068", margin: 0 }}>Aucun dossier modifié depuis 7 jours.</p> : (
          <table className="tableau">
            <thead><tr><th>Client</th>{admin && <th>Vendeur</th>}<th>Statut</th><th>Simulations</th><th>Dernier budget / emprunt</th><th>Modifié le</th><th></th></tr></thead>
            <tbody>
              {recents.map((c) => {
                const r = c.simulations[0]?.resume as Resume | null
                return (
                  <tr key={c.id}>
                    <td><b>{[c.prenom, c.nom].filter(Boolean).join(" ")}</b></td>
                    {admin && <td>{c.owner?.name ?? "—"}</td>}
                    <td><span className={`pastille statut-${c.statut}`}>{STATUT[c.statut] ?? c.statut}</span></td>
                    <td>{c._count.simulations}</td>
                    <td>{r?.budget ? eur(r.budget) : r?.emprunte ? eur(r.emprunte) : "—"}</td>
                    <td>{jour(c.updatedAt)}</td>
                    <td><a className="btn petit secondaire" href={`/?dossier=${encodeURIComponent(c.id)}`}>Ouvrir</a></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}
