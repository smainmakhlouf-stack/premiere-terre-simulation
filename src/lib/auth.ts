import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { admin } from "better-auth/plugins"
import { nextCookies } from "better-auth/next-js"
import { db } from "./db"
import { sendPasswordLinkEmail } from "./email"

/** Paramètre ajouté au lien de l'e-mail envoyé à la création d'un compte (voir actions/comptes.ts). */
export const MARQUEUR_INVITATION = "bienvenue=1"

export const MIN_PASSWORD_LENGTH = 12

/**
 * Better Auth journalise l'échec d'envoi du lien mais ne le remonte pas à l'appelant : on le note
 * ici (par adresse) pour que la page Comptes puisse dire que l'e-mail n'est pas parti.
 */
export const echecsEnvoi = new Map<string, string>()

const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || productionUrl || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    "https://simulation.premiereterre.fr",
    "https://premiere-terre-simulation.vercel.app",
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ],

  database: prismaAdapter(db, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    // Changer de mot de passe ferme les autres sessions ouvertes (ordinateur oublié, etc.).
    revokeSessionsOnPasswordReset: true,
    // Le lien n'est envoyé que si le compte existe ; la page affiche le même message dans tous
    // les cas pour ne pas révéler quelles adresses ont un compte.
    sendResetPassword: async ({ user, url }) => {
      const invitation = url.includes(encodeURIComponent(MARQUEUR_INVITATION)) || url.includes(MARQUEUR_INVITATION)
      try {
        await sendPasswordLinkEmail(user.email, url, user.name, invitation)
      } catch (e) {
        echecsEnvoi.set(user.email, (e as Error).message)
        throw e
      }
    },
    // 24 h : le même lien sert d'invitation à la création du compte, qui n'est pas toujours ouverte dans l'heure.
    resetPasswordTokenExpiresIn: 60 * 60 * 24,
  },

  // Session de 12 h, prolongée tant que le vendeur utilise le site.
  session: { expiresIn: 60 * 60 * 12, updateAge: 60 * 30 },

  rateLimit: {
    enabled: true,
    // Limites par adresse IP : plusieurs vendeurs d'un même bureau partagent la même.
    window: 60,
    max: 60,
    storage: "database",
    customRules: {
      "/sign-in/email": { window: 60 * 15, max: 20 },
      "/request-password-reset": { window: 60 * 15, max: 10 },
      "/reset-password": { window: 60 * 15, max: 10 },
      "/get-session": false,
      "/sign-out": false,
    },
  },

  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
      bannedUserMessage: "Ce compte a été désactivé. Contactez l'administrateur.",
    }),
    nextCookies(),
  ],
})

export type Session = typeof auth.$Infer.Session
