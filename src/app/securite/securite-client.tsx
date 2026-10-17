"use client"

import { useState } from "react"
import QRCode from "qrcode"
import { authClient } from "@/lib/auth-client"

type Etape = { type: "repos" } | { type: "qr"; image: string; secret: string; codes: string[] } | { type: "fini"; codes: string[] }

export function SecuriteClient({ active, admin, email }: { active: boolean; admin: boolean; email: string }) {
  const [actif, setActif] = useState(active)
  const [etape, setEtape] = useState<Etape>({ type: "repos" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  async function activer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const password = String(new FormData(e.currentTarget).get("password"))
    setLoading(true); setError(""); setMessage("")
    const { data, error } = await authClient.twoFactor.enable({ password, method: "totp" })
    setLoading(false)
    if (error || !data || data.method !== "totp") return setError(error?.status === 400 || error?.status === 401 ? "Mot de passe incorrect." : error?.message || "Activation impossible.")
    const image = await QRCode.toDataURL(data.totpURI, { margin: 1, width: 220 })
    const secret = new URL(data.totpURI).searchParams.get("secret") ?? ""
    setEtape({ type: "qr", image, secret, codes: data.backupCodes })
  }

  async function verifier(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (etape.type !== "qr") return
    const code = String(new FormData(e.currentTarget).get("code")).replace(/\s/g, "")
    setLoading(true); setError("")
    const { error } = await authClient.twoFactor.verifyTotp({ code })
    setLoading(false)
    if (error) return setError("Code incorrect. Vérifiez l'heure de votre téléphone et réessayez.")
    setActif(true)
    setEtape({ type: "fini", codes: etape.codes })
  }

  async function desactiver(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const password = String(new FormData(e.currentTarget).get("password"))
    setLoading(true); setError(""); setMessage("")
    const { error } = await authClient.twoFactor.disable({ password })
    setLoading(false)
    if (error) return setError(error.status === 400 || error.status === 401 ? "Mot de passe incorrect." : error.message || "Désactivation impossible.")
    setActif(false)
    setEtape({ type: "repos" })
    setMessage("Double authentification désactivée.")
  }

  return (
    <main className="admin" style={{ maxWidth: 640 }}>
      <div className="admin-top">
        <h1>Sécurité du compte</h1>
        <a href="/" className="btn secondaire">← Retour au simulateur</a>
      </div>

      <section className="panneau">
        <h2>Double authentification</h2>
        <p style={{ fontSize: 14, lineHeight: 1.55, marginTop: 0 }}>
          En plus du mot de passe, un code à 6 chiffres donné par une application sur votre téléphone
          (Google Authenticator, Microsoft Authenticator, etc.) est demandé à la connexion.
          {admin && " Fortement recommandé pour le compte administrateur, qui gère les comptes et les paramètres de l'équipe."}
        </p>
        <p style={{ fontSize: 14 }}>
          État : <span className={actif ? "pastille" : "pastille off"}>{actif ? "activée" : "désactivée"}</span> · {email}
        </p>

        {message && <div className="alerte ok" style={{ marginBottom: 12 }}>{message}</div>}
        {error && <div role="alert" className="alerte erreur" style={{ marginBottom: 12 }}>{error}</div>}

        {!actif && etape.type === "repos" && (
          <form className="stack" onSubmit={activer}>
            <div>
              <label htmlFor="password">Confirmez votre mot de passe pour activer</label>
              <input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            <button className="btn" type="submit" disabled={loading}>{loading ? "Préparation…" : "Activer la double authentification"}</button>
          </form>
        )}

        {etape.type === "qr" && (
          <div className="stack">
            <p style={{ fontSize: 14, margin: 0 }}><b>1.</b> Scannez ce QR code avec votre application d&apos;authentification.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={etape.image} alt="QR code à scanner" width={220} height={220} style={{ alignSelf: "center" }} />
            <p style={{ fontSize: 12, color: "var(--gris)", margin: 0, wordBreak: "break-all" }}>Saisie manuelle de la clé : {etape.secret}</p>
            <form className="stack" onSubmit={verifier}>
              <div>
                <label htmlFor="code"><b>2.</b> Saisissez le code à 6 chiffres affiché</label>
                <input id="code" name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" />
              </div>
              <button className="btn" type="submit" disabled={loading}>{loading ? "Vérification…" : "Valider et activer"}</button>
            </form>
          </div>
        )}

        {etape.type === "fini" && (
          <div className="stack">
            <div className="alerte ok">Double authentification activée.</div>
            <p style={{ fontSize: 14, margin: 0 }}>
              <b>Codes de secours</b> : notez-les et gardez-les en lieu sûr. Chacun permet une connexion si votre téléphone n&apos;est pas disponible.
            </p>
            <pre style={{ background: "#f7f1ec", borderRadius: 8, padding: 12, fontSize: 14, columns: 2 }}>{etape.codes.join("\n")}</pre>
          </div>
        )}

        {actif && etape.type !== "qr" && (
          <form className="stack" onSubmit={desactiver} style={{ marginTop: 14 }}>
            <div>
              <label htmlFor="password-off">Mot de passe pour désactiver</label>
              <input id="password-off" name="password" type="password" required autoComplete="current-password" />
            </div>
            <button className="btn danger" type="submit" disabled={loading}>Désactiver la double authentification</button>
          </form>
        )}
      </section>
    </main>
  )
}
