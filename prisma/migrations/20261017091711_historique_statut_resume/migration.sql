-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "statut" TEXT NOT NULL DEFAULT 'en_cours';

-- AlterTable
ALTER TABLE "parametres" ADD COLUMN     "misesAJour" JSONB;

-- AlterTable
ALTER TABLE "simulations" ADD COLUMN     "resume" JSONB;

-- CreateTable
CREATE TABLE "simulation_versions" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "resume" JSONB,
    "action" TEXT NOT NULL,
    "auteurNom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulation_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "simulation_versions_simulationId_createdAt_idx" ON "simulation_versions"("simulationId", "createdAt");

-- AddForeignKey
ALTER TABLE "simulation_versions" ADD CONSTRAINT "simulation_versions_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "simulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
