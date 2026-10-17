// Envoi de SMS via SMSFactor (https://www.smsfactor.com), même compte et même expéditeur que le CRM
// (confirmations de rendez-vous). Clé API : variable d'environnement SMSFACTOR_API_TOKEN.

const SMSFACTOR_API_URL = "https://api.smsfactor.com/send"
// Nom d'expéditeur alphanumérique affiché au destinataire : 11 caractères max, sans espace.
const SENDER = "PremiereTer"

/** Numéro de mobile français (06, 07, +33 6/7) au format international sans « + » ; null sinon. */
export function mobileFR(tel: string | null | undefined): string | null {
  const d = (tel ?? "").replace(/\D/g, "")
  const n = d.startsWith("0033") ? d.slice(4) : d.startsWith("33") ? d.slice(2) : d.startsWith("0") ? d.slice(1) : d
  return /^[67]\d{8}$/.test(n) ? `33${n}` : null
}

/** Jours fériés en France métropolitaine (année donnée), au format AAAA-MM-JJ. */
function feries(annee: number): Set<string> {
  // Dimanche de Pâques (algorithme de Meeus/Jones/Butcher)
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100, d = Math.floor(b / 4), e = b % 4
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1
  const paques = Date.UTC(annee, mois - 1, jour)
  const j = (t: number) => new Date(t).toISOString().slice(0, 10)
  const fixes = ["01-01", "05-01", "05-08", "07-14", "08-15", "11-01", "11-11", "12-25"].map((x) => `${annee}-${x}`)
  return new Set([...fixes, j(paques + 86400000), j(paques + 39 * 86400000), j(paques + 50 * 86400000)])
}

/**
 * Plages d'envoi recommandées par la profession pour les SMS aux particuliers : du lundi au samedi,
 * de 8 h à 20 h (heure de Paris), hors jours fériés. Renvoie la raison du refus, ou null si l'envoi est permis.
 */
export function horsPlage(maintenant = new Date()): string | null {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
      .formatToParts(maintenant).map((x) => [x.type, x.value]),
  )
  const heure = Number(p.hour)
  if (p.weekday.startsWith("dim")) return "Pas d'envoi de SMS le dimanche."
  if (feries(Number(p.year)).has(`${p.year}-${p.month}-${p.day}`)) return "Pas d'envoi de SMS un jour férié."
  if (heure < 8 || heure >= 20) return "Les SMS ne partent qu'entre 8 h et 20 h."
  return null
}

/** Envoie un SMS ; renvoie l'erreur lisible, ou null si SMSFactor l'a accepté. */
export async function envoyerSms(gsm: string, texte: string): Promise<string | null> {
  const token = process.env.SMSFACTOR_API_TOKEN
  if (!token) return "L'envoi de SMS n'est pas encore configuré (clé SMSFACTOR_API_TOKEN manquante sur Vercel)."
  try {
    const res = await fetch(SMSFACTOR_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        sms: {
          message: { text: texte, sender: SENDER, pushtype: "alert" },
          recipients: { gsm: [{ value: gsm }] },
        },
      }),
    })
    const corps = await res.text().catch(() => "")
    if (!res.ok) return `Refusé par SMS Factor (HTTP ${res.status}).`
    // SMSFactor répond 200 même en erreur : le vrai statut est dans le JSON (négatif = échec).
    try {
      const j = JSON.parse(corps)
      if (typeof j.status === "number" && j.status < 0) return `Refusé par SMS Factor : ${j.message ?? j.status}.`
    } catch {}
    return null
  } catch (e) {
    console.error("[sms]", e)
    return "SMS Factor injoignable, réessayez dans un instant."
  }
}
