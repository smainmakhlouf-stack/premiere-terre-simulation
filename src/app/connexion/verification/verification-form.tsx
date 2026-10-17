"use client"

import { useState } from "react"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"

export function VerificationForm() {
  const [secours, setSecours] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const code = String(form.get("code")).replace(/\s/g, "")
    const trustDevice = form.get("confiance") === "on"
    setLoading(true)
    setError("")
    const { error } = secours
      ? await authClient.twoFactor.verifyBackupCode({ code, trustDevice })
      : await authClient.twoFactor.verifyTotp({ code, trustDevice })
    if (error) {
      setLoading(false)
      if (error.status === 429) setError("Trop de tentatives. Réessayez dans quelques minutes.")
      else if (error.status === 401 && /session|expired|invalid two factor cookie/i.test(error.message ?? "")) setError("La vérification a expiré : reconnectez-vous.")
      else setError(secours ? "Code de secours incorrect ou déjà utilisé." : "Code incorrect. Vérifiez l'heure de votre téléphone et réessayez.")
      return
    }
    window.location.href = "/"
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="code">{secours ? "Code de secours" : "Code à 6 chiffres"}</label>
        <input id="code" name="code" required autoFocus autoComplete="one-time-code" inputMode={secours ? "text" : "numeric"} pattern={secours ? undefined : "[0-9 ]{6,7}"} />
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
        <input type="checkbox" name="confiance" style={{ width: "auto" }} /> Faire confiance à cet appareil pendant 30 jours
      </label>
      {error && <div role="alert" className="alerte erreur">{error}</div>}
      <button className="btn" type="submit" disabled={loading}>{loading ? "Vérification…" : "Valider"}</button>
      <button type="button" className="lien-discret" style={{ background: "none", border: 0, cursor: "pointer" }} onClick={() => { setSecours(!secours); setError("") }}>
        {secours ? "Utiliser le code de l'application" : "Téléphone indisponible ? Utiliser un code de secours"}
      </button>
      <Link href="/connexion" className="lien-discret">Retour à la connexion</Link>
    </form>
  )
}
