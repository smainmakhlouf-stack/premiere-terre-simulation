import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/session"
import { AuthCard } from "@/components/auth-card"
import { ConnexionForm } from "./connexion-form"

export const dynamic = "force-dynamic"

export default async function ConnexionPage({ searchParams }: { searchParams: Promise<{ inactif?: string }> }) {
  const { inactif } = await searchParams
  if (await getSession()) redirect("/")
  if ((await db.user.count()) === 0) redirect("/installation")
  return (
    <AuthCard>
      <h2>Connexion</h2>
      <p className="intro">Accès réservé aux vendeurs Première Terre.</p>
      {inactif === "1" && <p className="intro" style={{ color: "#a14a32" }}>Vous avez été déconnecté après 30 minutes d&apos;inactivité. Votre simulation a été gardée.</p>}
      <ConnexionForm />
    </AuthCard>
  )
}
