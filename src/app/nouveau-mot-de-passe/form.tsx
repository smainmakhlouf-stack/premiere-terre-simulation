"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { authClient } from "@/lib/auth-client"

const MIN_LENGTH = 12

export function NouveauMotDePasseForm() {
  const params = useSearchParams()
  const token = params.get("token")
  const bienvenue = params.get("bienvenue") === "1"
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  if (!token || params.get("error")) {
    return (
      <div className="centre">
        <h2>Lien invalide ou expiré</h2>
        <p className="intro">Ce lien n'est plus valable (il a déjà servi, ou il a plus de 24 heures). Demandez-en un nouveau.</p>
        <Link href="/mot-de-passe-oublie">Demander un nouveau lien</Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="centre">
        <h2>Mot de passe enregistré</h2>
        <p className="intro">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
        <Link href="/connexion">Aller à la connexion</Link>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const newPassword = String(form.get("newPassword"))
    setError("")
    if (newPassword.length < MIN_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${MIN_LENGTH} caractères.`)
      return
    }
    if (newPassword !== String(form.get("confirmPassword"))) {
      setError("Les deux mots de passe ne correspondent pas.")
      return
    }
    setLoading(true)
    const { error } = await authClient.resetPassword({ newPassword, token: token! })
    setLoading(false)
    if (error) {
      setError(error.status === 400 ? "Ce lien n'est plus valable. Demandez-en un nouveau." : "Une erreur est survenue. Réessayez.")
      return
    }
    setDone(true)
  }

  return (
    <>
      <h2>{bienvenue ? "Bienvenue ! Choisissez votre mot de passe" : "Nouveau mot de passe"}</h2>
      <p className="intro">Au moins {MIN_LENGTH} caractères. Une phrase courte est facile à retenir et difficile à deviner.</p>
      <form className="stack" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="newPassword">Mot de passe</label>
          <input id="newPassword" name="newPassword" type="password" required minLength={MIN_LENGTH} autoComplete="new-password" autoFocus />
        </div>
        <div>
          <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
          <input id="confirmPassword" name="confirmPassword" type="password" required minLength={MIN_LENGTH} autoComplete="new-password" />
        </div>
        {error && <div role="alert" className="alerte erreur">{error}</div>}
        <button className="btn" type="submit" disabled={loading}>{loading ? "Enregistrement…" : "Enregistrer"}</button>
      </form>
    </>
  )
}
