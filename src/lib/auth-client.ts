import { createAuthClient } from "better-auth/react"
import { adminClient, twoFactorClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [
    adminClient(),
    // Compte protégé par la double authentification : étape du code après le mot de passe.
    twoFactorClient({ onTwoFactorRedirect: () => { window.location.href = "/connexion/verification" } }),
  ],
})
