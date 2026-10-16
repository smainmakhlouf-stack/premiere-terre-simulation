"use client"

import { useActionState, useEffect, useRef, useState, useTransition } from "react"
import { changerRole, changerStatut, creerCompte, renvoyerInvitation, supprimerCompte, type Resultat } from "@/actions/comptes"

type Compte = {
  id: string
  name: string
  email: string
  admin: boolean
  actif: boolean
  creeLe: string
  derniereConnexion: string | null
}

const dateCourte = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso)) : "Jamais"

export function ComptesClient({ comptes, moiId }: { comptes: Compte[]; moiId: string }) {
  const [creation, actionCreer, creationEnCours] = useActionState(creerCompte, null)
  const [retour, setRetour] = useState<Resultat | null>(null)
  const [enCours, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (creation?.ok) formRef.current?.reset()
    setRetour(creation)
  }, [creation])

  function lancer(action: () => Promise<Resultat>, confirmation?: string) {
    if (confirmation && !window.confirm(confirmation)) return
    startTransition(async () => setRetour(await action()))
  }

  return (
    <main className="admin">
      <div className="admin-top">
        <h1>Comptes vendeurs</h1>
        <a className="btn secondaire" href="/">← Retour au simulateur</a>
      </div>

      {retour && <div role="status" className={`alerte ${retour.ok ? "ok" : "erreur"}`} style={{ marginBottom: 16 }}>{retour.message}</div>}

      <section className="panneau">
        <h2>Ajouter un compte</h2>
        <form ref={formRef} action={actionCreer} className="grille-ajout">
          <div>
            <label htmlFor="name">Nom et prénom</label>
            <input id="name" name="name" type="text" required />
          </div>
          <div>
            <label htmlFor="email">Adresse e-mail</label>
            <input id="email" name="email" type="email" required />
          </div>
          <div>
            <label htmlFor="role">Rôle</label>
            <select id="role" name="role" defaultValue="user">
              <option value="user">Vendeur</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <button className="btn" type="submit" disabled={creationEnCours}>{creationEnCours ? "Création…" : "Créer et envoyer l'accès"}</button>
        </form>
        <p style={{ fontSize: 12, color: "var(--gris)", margin: "10px 0 0" }}>
          La personne reçoit un e-mail pour choisir elle-même son mot de passe (lien valable 24 h). Vous ne connaissez jamais son mot de passe.
        </p>
      </section>

      <section className="panneau">
        <h2>{comptes.length} compte{comptes.length > 1 ? "s" : ""}</h2>
        <div className="defile">
          <table className="tableau">
            <thead>
              <tr>
                <th>Nom</th>
                <th>E-mail</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Dernière connexion</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {comptes.map((c) => {
                const moi = c.id === moiId
                return (
                  <tr key={c.id}>
                    <td>{c.name}{moi && " (vous)"}</td>
                    <td>{c.email}</td>
                    <td>{c.admin ? "Administrateur" : "Vendeur"}</td>
                    <td><span className={`pastille${c.actif ? "" : " off"}`}>{c.actif ? "Actif" : "Désactivé"}</span></td>
                    <td>{dateCourte(c.derniereConnexion)}</td>
                    <td>
                      <div className="actions-ligne">
                        <button className="btn secondaire petit" disabled={enCours} onClick={() => lancer(() => renvoyerInvitation(c.id))}>
                          Renvoyer le lien
                        </button>
                        {!moi && (
                          <>
                            <button className="btn secondaire petit" disabled={enCours} onClick={() => lancer(() => changerRole(c.id, c.admin ? "user" : "admin"))}>
                              {c.admin ? "Passer vendeur" : "Passer admin"}
                            </button>
                            <button
                              className="btn secondaire petit"
                              disabled={enCours}
                              onClick={() => lancer(() => changerStatut(c.id, !c.actif), c.actif ? `Désactiver le compte de ${c.name} ?` : undefined)}
                            >
                              {c.actif ? "Désactiver" : "Réactiver"}
                            </button>
                            <button
                              className="btn danger petit"
                              disabled={enCours}
                              onClick={() => lancer(() => supprimerCompte(c.id), `Supprimer définitivement le compte de ${c.name} ?`)}
                            >
                              Supprimer
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
