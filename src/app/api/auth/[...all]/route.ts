import { toNextJsHandler } from "better-auth/next-js"
import { auth } from "@/lib/auth"

const handlers = toNextJsHandler(auth)

export const GET = handlers.GET

export async function POST(request: Request) {
  // Pas d'inscription libre : seul l'administrateur crée les comptes (page /comptes).
  if (new URL(request.url).pathname.includes("/sign-up")) {
    return Response.json({ message: "Inscription non autorisée." }, { status: 403 })
  }
  return handlers.POST(request)
}
