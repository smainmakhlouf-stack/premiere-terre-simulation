import { Resend } from "resend"

const FROM = process.env.RESEND_FROM_EMAIL || "Première Terre <noreply@premiereterre.fr>"

let resendClient: Resend | null = null
function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error("RESEND_API_KEY n'est pas configurée.")
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/**
 * Lien pour choisir son mot de passe : soit à la création du compte (invitation), soit après un
 * « mot de passe oublié ». Le SDK Resend ne lève pas d'exception sur une erreur d'API, elle est
 * renvoyée dans `error` : on la transforme en exception pour qu'un échec d'envoi ne passe pas inaperçu.
 */
export async function sendPasswordLinkEmail(to: string, url: string, userName: string | null | undefined, invitation: boolean) {
  const firstName = escapeHtml(userName?.split(" ")[0] || "")
  const subject = invitation
    ? "Votre accès au simulateur Première Terre"
    : "Réinitialisation de votre mot de passe"
  const intro = invitation
    ? "Un compte vient d'être créé pour vous sur le simulateur de financement Première Terre. Cliquez sur le bouton ci-dessous pour choisir votre mot de passe :"
    : "Vous avez demandé la réinitialisation de votre mot de passe sur le simulateur Première Terre. Cliquez sur le bouton ci-dessous pour en choisir un nouveau :"
  const bouton = invitation ? "Choisir mon mot de passe" : "Réinitialiser mon mot de passe"
  const fin = invitation
    ? "Ce lien est à usage unique et expire dans 24 heures. S'il a expiré, utilisez « Mot de passe oublié » sur la page de connexion de simulation.premiereterre.fr."
    : "Ce lien est à usage unique et expire dans 24 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail : votre mot de passe actuel reste inchangé."

  const { error } = await getResend().emails.send({
    from: FROM,
    to,
    subject,
    html: `
      <div style="font-family: 'Trebuchet MS', Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #342b27;">
        <div style="background-color:#8c4c3d; padding: 28px 32px; border-radius: 8px 8px 0 0; text-align: center;">
          <div style="font-family: Georgia, serif; font-size: 20px; font-weight: 600; color: #fff;">Première Terre</div>
          <div style="font-size: 10.5px; color: rgba(255,255,255,0.7); letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px;">Simulateur de financement</div>
        </div>
        <div style="background-color:#fff; border: 1px solid #e8ddd6; border-top: none; border-radius: 0 0 8px 8px; padding: 32px;">
          <p style="font-size: 14px; line-height: 1.6;">Bonjour${firstName ? " " + firstName : ""},</p>
          <p style="font-size: 14px; line-height: 1.6;">${intro}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px auto;"><tr>
            <td bgcolor="#8c4c3d" style="border-radius: 6px;">
              <a href="${escapeHtml(url)}" style="display: inline-block; padding: 12px 28px; color: #fff; text-decoration: none; font-size: 13px; font-weight: 700;">${bouton}</a>
            </td>
          </tr></table>
          <p style="font-size: 12.5px; color: #7c7068; line-height: 1.6;">${fin}</p>
        </div>
      </div>
    `,
  })

  if (error) {
    console.error("[sendPasswordLinkEmail] Échec de l'envoi via Resend:", error)
    throw new Error(`Échec de l'envoi de l'e-mail : ${error.message}`)
  }
}
