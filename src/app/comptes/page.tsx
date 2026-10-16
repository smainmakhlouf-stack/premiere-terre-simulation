import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/session"
import { ComptesClient } from "./comptes-client"

export const dynamic = "force-dynamic"

export default async function ComptesPage() {
  const session = await getSession()
  if (!session) redirect("/connexion")
  if (session.user.role !== "admin") redirect("/")

  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true, name: true, email: true, role: true, banned: true, createdAt: true,
      sessions: { select: { updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 1 },
    },
  })

  return (
    <ComptesClient
      moiId={session.user.id}
      comptes={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        admin: u.role === "admin",
        actif: !u.banned,
        creeLe: u.createdAt.toISOString(),
        derniereConnexion: u.sessions[0]?.updatedAt.toISOString() ?? null,
      }))}
    />
  )
}
