// Indique quelle version du code est en ligne (utile pour vérifier qu'un déploiement est bien passé).
export const dynamic = "force-dynamic"

export function GET() {
  return Response.json({ commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local" })
}
