"use client"

import { useState } from "react"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { AuthCard } from "@/components/auth-card"

export default function MotDePasseOubliePage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = String(new FormData(e.currentTarget).get("email")).trim()
    setLoading(true)
    setError("")
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/nouveau-mot-de-passe`,
    })
    setLoading(false)
    if (error?.status === 429) {
      setError("Trop de demandes. Réessayez dans quelques minutes.")
      return
    }
    // Même message que le compte existe ou non : on ne révèle pas quelles adresses ont un compte.
    setSent(true)
  }

  return (
    <AuthCard>
      {sent ? (
        <div className="centre">
          <h2>E-mail envoyé</h2>
          <p className="intro">
            Si un compte existe avec cette adresse, un lien pour choisir un nouveau mot de passe vient de lui être envoyé.
            Pensez à regarder dans les spams. Le lien est valable 24 heures.
          </p>
          <Link href="/connexion">Retour à la connexion</Link>
        </div>
      ) : (
        <>
          <h2>Mot de passe oublié</h2>
          <p className="intro">Indiquez votre adresse e-mail : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
          <form className="stack" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email">Adresse e-mail</label>
              <input id="email" name="email" type="email" required autoComplete="email" autoFocus />
            </div>
            {error && <div role="alert" className="alerte erreur">{error}</div>}
            <button className="btn" type="submit" disabled={loading}>{loading ? "Envoi…" : "Recevoir le lien"}</button>
            <Link href="/connexion" className="lien-discret">Retour à la connexion</Link>
          </form>
        </>
      )}
    </AuthCard>
  )
}
