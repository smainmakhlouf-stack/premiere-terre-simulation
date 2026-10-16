import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"

export const dynamic = "force-dynamic"

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

let simulateurCache: string | null = null
async function simulateur() {
  simulateurCache ??= await readFile(join(process.cwd(), "private/simulateur.html"), "utf8")
  return simulateurCache
}

/**
 * Le simulateur n'est pas dans public/ : il n'est servi qu'après vérification de la session,
 * sinon on renvoie vers la page de connexion. Une barre fixe (nom, comptes, déconnexion) est ajoutée en
 * haut, au-dessus de l'écran d'accueil du simulateur (#pt-home, lui aussi en position fixe).
 */
export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.redirect(new URL("/connexion", request.url))

  const admin = session.user.role === "admin"
  const barre = `
<script>addEventListener("pageshow",function(e){if(e.persisted)location.reload()})</script>
<script>window.ptUtilisateur=${JSON.stringify({ nom: session.user.name || session.user.email, admin }).replace(/</g, "\\u003c")}</script>
<style>body{padding-top:38px}#pt-home{top:38px!important}@media print{#pt-barre-compte{display:none!important}body{padding-top:0!important}}</style>
<div id="pt-barre-compte" style="position:fixed;top:0;left:0;right:0;height:38px;z-index:9600;display:flex;justify-content:flex-end;align-items:center;gap:14px;padding:0 5%;background:#754338;color:#fff;font:13px Inter,system-ui,sans-serif;white-space:nowrap;overflow:hidden">
  <button type="button" id="pt-btn-accueil" onclick="window.ptAllerAccueil&&window.ptAllerAccueil()" style="visibility:hidden;order:-1;margin-right:auto;background:#fff;color:#754338;border:0;border-radius:6px;padding:4px 12px;cursor:pointer;font:600 13px Inter,system-ui,sans-serif">← Accueil</button>
  <span>Connecté : <strong>${escapeHtml(session.user.name || session.user.email)}</strong></span>
  ${admin ? '<a href="/comptes" style="color:#fff">Comptes vendeurs</a>' : ""}
  <form method="post" action="/deconnexion" style="margin:0"><button type="submit" style="background:none;border:1px solid rgba(255,255,255,.5);color:#fff;border-radius:6px;padding:3px 10px;cursor:pointer;font:inherit">Déconnexion</button></form>
</div>`
  // Le fichier n'a pas de balise <body> : la barre est placée juste avant l'en-tête du simulateur.
  const page = await simulateur()
  const html = page.includes("<header") ? page.replace("<header", barre + "<header") : barre + page

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  })
}
