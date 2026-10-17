import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { pageSimulateur } from "@/lib/simulateur"

export const dynamic = "force-dynamic"

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

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
<style>body{padding-top:38px}#pt-home{top:38px!important}@media(max-width:760px){.layout{grid-template-columns:minmax(0,1fr)!important}.layout>*{min-width:0}main,section{max-width:100%}main svg,main canvas{max-width:100%;height:auto}#pt-barre-compte{padding:0 10px!important;gap:8px!important;font-size:12px!important}#pt-barre-compte>span,#pt-barre-compte>a{display:none}}@media print{#pt-barre-compte{display:none!important}body{padding-top:0!important}}</style>
<div id="pt-barre-compte" style="position:fixed;top:0;left:0;right:0;height:38px;z-index:9600;display:flex;justify-content:flex-end;align-items:center;gap:14px;padding:0 5%;background:#754338;color:#fff;font:13px Inter,system-ui,sans-serif;white-space:nowrap;overflow:hidden">
  <button type="button" id="pt-btn-accueil" onclick="window.ptAllerAccueil&&window.ptAllerAccueil()" style="visibility:hidden;order:-1;margin-right:auto;background:#fff;color:#754338;border:0;border-radius:6px;padding:4px 12px;cursor:pointer;font:600 13px Inter,system-ui,sans-serif">← Accueil</button>
  <span>Connecté : <strong>${escapeHtml(session.user.name || session.user.email)}</strong></span>
  <a href="/tableau-de-bord" style="color:#fff">Tableau de bord</a>
  <a href="/securite" style="color:#fff">Sécurité</a>
  ${admin ? '<a href="/comptes" style="color:#fff">Comptes vendeurs</a>' : ""}
  <form method="post" action="/deconnexion" id="pt-logout" style="margin:0"><button type="submit" style="background:none;border:1px solid rgba(255,255,255,.5);color:#fff;border-radius:6px;padding:3px 10px;cursor:pointer;font:inherit">Déconnexion</button></form>
</div>
<script>
// Déconnexion automatique après 30 minutes sans activité (postes partagés en agence), avertissement 5 minutes avant.
(function(){var DELAI=30*60*1000,AVERT=25*60*1000,der=Date.now(),bandeau=null;
function activite(){der=Date.now();if(bandeau){bandeau.remove();bandeau=null}}
['mousemove','keydown','click','touchstart','scroll','wheel'].forEach(function(e){addEventListener(e,activite,{passive:true,capture:true})});
setInterval(function(){var t=Date.now()-der;if(t>=DELAI){var f=document.getElementById('pt-logout');if(f){try{dispatchEvent(new Event('pagehide'))}catch(e){}f.action='/deconnexion?inactif=1';f.submit()}}else if(t>=AVERT&&!bandeau){bandeau=document.createElement('div');bandeau.style.cssText='position:fixed;left:50%;top:48px;transform:translateX(-50%);z-index:9900;background:#a14a32;color:#fff;padding:10px 16px;border-radius:10px;font:600 14px Inter,system-ui,sans-serif;box-shadow:0 8px 30px #0004';bandeau.textContent='Sans activité, vous serez déconnecté dans 5 minutes. Bougez la souris pour rester connecté.';document.body.appendChild(bandeau)}},15000)})();
</script>`
  // Le fichier n'a pas de balise <body> : la barre est placée juste avant l'en-tête du simulateur.
  const page = await pageSimulateur()
  const html = page.includes("<header") ? page.replace("<header", barre + "<header") : barre + page

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  })
}
