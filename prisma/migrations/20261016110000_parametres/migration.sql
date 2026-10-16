-- CreateTable
CREATE TABLE "parametres" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "majPar" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametres_pkey" PRIMARY KEY ("id")
);

