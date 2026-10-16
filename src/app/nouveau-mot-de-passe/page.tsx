import { Suspense } from "react"
import { AuthCard } from "@/components/auth-card"
import { NouveauMotDePasseForm } from "./form"

export default function NouveauMotDePassePage() {
  return (
    <AuthCard>
      <Suspense>
        <NouveauMotDePasseForm />
      </Suspense>
    </AuthCard>
  )
}
