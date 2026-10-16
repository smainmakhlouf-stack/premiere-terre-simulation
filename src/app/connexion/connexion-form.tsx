"use client"

import { useState } from "react"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"

export function ConnexionForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setLoading(true)
    setError("")
    const { error } = await authClient.signIn.email({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
    })
    if (error) {
      setLoading(false)
      if (error.status === 429) setError("Trop de tentatives. Réessayez dans quelques minutes.")
      else if (error.status === 403) setError(error.message || "Ce compte a été désactivé.")
      else setError("E-mail ou mot de passe incorrect.")
      return
    }
    // Rechargement complet : la page du simulateur est servie par le serveur, pas par le routeur.
    window.location.href = "/"
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Adresse e-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" autoFocus />
      </div>
      <div>
        <label htmlFor="password">Mot de passe</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {error && <div role="alert" className="alerte erreur">{error}</div>}
      <button className="btn" type="submit" disabled={loading}>{loading ? "Connexion…" : "Se connecter"}</button>
      <Link href="/mot-de-passe-oublie" className="lien-discret">Mot de passe oublié ?</Link>
    </form>
  )
}
