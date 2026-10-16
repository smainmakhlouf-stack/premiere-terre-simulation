"use client"

import { useActionState } from "react"
import { installerAdmin } from "@/actions/comptes"

export function InstallationForm() {
  const [state, action, pending] = useActionState(installerAdmin, null)
  if (state?.ok) return <div className="alerte ok">{state.message}</div>
  return (
    <form className="stack" action={action}>
      <div>
        <label htmlFor="name">Nom et prénom</label>
        <input id="name" name="name" type="text" required autoComplete="name" />
      </div>
      <div>
        <label htmlFor="email">Adresse e-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      {state && !state.ok && <div role="alert" className="alerte erreur">{state.message}</div>}
      <button className="btn" type="submit" disabled={pending}>{pending ? "Création…" : "Créer mon compte"}</button>
    </form>
  )
}
