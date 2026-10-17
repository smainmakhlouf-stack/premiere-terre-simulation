import { pageSimulateur } from "@/lib/simulateur"

// Indique quelle version du code est en ligne (utile pour vérifier qu'un déploiement est bien passé).
export const dynamic = "force-dynamic"

export async function GET() {
  const html = await pageSimulateur().catch(() => "")
  return Response.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    simulateur: { taille: html.length, ptz: html.includes("ptOpenPTZ"), gestionClient: html.includes("Gestion client") },
  })
}
