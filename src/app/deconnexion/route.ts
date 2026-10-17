import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST(request: Request) {
  const res = await auth.api.signOut({ headers: await headers(), asResponse: true })
  const inactif = new URL(request.url).searchParams.get("inactif") === "1"
  const redirection = NextResponse.redirect(new URL(inactif ? "/connexion?inactif=1" : "/connexion", request.url), 303)
  // Reprend les en-têtes Set-Cookie de better-auth, qui effacent le cookie de session.
  for (const cookie of res.headers.getSetCookie()) redirection.headers.append("Set-Cookie", cookie)
  return redirection
}
