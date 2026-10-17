-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "civilite" TEXT,
ADD COLUMN     "secteur" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "telephone" TEXT;

-- CreateTable
CREATE TABLE "sms_envois" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "auteurNom" TEXT,
    "telephone" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "erreur" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_envois_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sms_envois_clientId_createdAt_idx" ON "sms_envois"("clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "sms_envois" ADD CONSTRAINT "sms_envois_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
