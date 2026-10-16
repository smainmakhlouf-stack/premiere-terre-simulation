import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { AuthCard } from "@/components/auth-card"
import { InstallationForm } from "./form"

export const dynamic = "force-dynamic"

export default async function InstallationPage() {
  if ((await db.user.count()) > 0) redirect("/connexion")
  return (
    <AuthCard>
      <h2>Création du compte administrateur</h2>
      <p className="intro">Première mise en route : créez votre compte. Vous recevrez un e-mail pour choisir votre mot de passe.</p>
      <InstallationForm />
    </AuthCard>
  )
}
