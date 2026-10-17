import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { SecuriteClient } from "./securite-client"

export const dynamic = "force-dynamic"

export default async function SecuritePage() {
  const session = await getSession()
  if (!session) redirect("/connexion")
  const active = Boolean((session.user as { twoFactorEnabled?: boolean | null }).twoFactorEnabled)
  return <SecuriteClient active={active} admin={session.user.role === "admin"} email={session.user.email} />
}
