import { AuthCard } from "@/components/auth-card"
import { VerificationForm } from "./verification-form"

export const dynamic = "force-dynamic"

export default function VerificationPage() {
  return (
    <AuthCard>
      <h2>Code de vérification</h2>
      <p className="intro">Saisissez le code à 6 chiffres affiché dans votre application d&apos;authentification.</p>
      <VerificationForm />
    </AuthCard>
  )
}
