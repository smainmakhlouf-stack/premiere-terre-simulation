/**
 * Adresse de la base. Selon la façon dont la base est reliée au projet sur Vercel, la variable
 * s'appelle DATABASE_URL, POSTGRES_URL ou <PRÉFIXE>_POSTGRES_URL : on prend la première trouvée.
 * Les adresses « prisma+postgres:// » (Accelerate) sont écartées, l'adaptateur pg exige une
 * connexion directe.
 */
export function databaseUrl(): string {
  const candidats = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_POSTGRES_URL,
    process.env.STORAGE_POSTGRES_URL,
  ]
  return candidats.find((u) => u && /^postgres(ql)?:\/\//.test(u)) ?? ""
}
